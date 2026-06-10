import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogueFilterSchema } from '../CatalogueFilter.ts';
import { parsed } from './schemaTestUtils.ts';

/**
 * Builder — start from a minimal valid filter (only the REQUIRED `pagination`),
 * override per case. We feed plain objects, not pre-validated values, to mirror
 * the query boundary (URL/query-string → parsed filter).
 */
const validFilter = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  pagination: { limit: 20, offset: 0 },
  ...overrides,
});

describe('CatalogueFilter schema — §9/§10.3 query language', () => {
  describe('happy paths', () => {
    test('a full valid filter parses; pagination round-trips', () => {
      const f = parsed(
        CatalogueFilterSchema,
        validFilter({
          type: 'lesson',
          status: 'published',
          level: { min: 1, max: 5 },
          bpm: { min: 60, max: 120 },
          timeSig: '4/4',
          genre: 'rock',
          tags: ['ghost-notes'],
          skill: ['bending'],
          instruments: ['guitar'],
          lessonType: 'technique',
          patternId: 'rock-8th',
          search: 'paradiddle',
          sort: 'relevance',
          pagination: { limit: 50, offset: 100 },
        }),
      );
      assert.equal(f.type, 'lesson');
      assert.equal(f.status, 'published');
      assert.deepEqual(f.level, { min: 1, max: 5 });
      assert.deepEqual(f.bpm, { min: 60, max: 120 });
      assert.equal(f.timeSig, '4/4');
      assert.equal(f.sort, 'relevance');
      assert.deepEqual(f.pagination, { limit: 50, offset: 100 });
    });

    test('every sort value parses', () => {
      for (const sort of ['relevance', 'level', 'bpm', 'newest', 'title', 'curated']) {
        const f = parsed(CatalogueFilterSchema, validFilter({ sort }));
        assert.equal(f.sort, sort);
      }
    });

    test('omitting an optional field is fine; only pagination required', () => {
      const f = parsed(CatalogueFilterSchema, validFilter());
      assert.equal(f.type, undefined);
      assert.equal(f.genre, undefined);
      assert.deepEqual(f.pagination, { limit: 20, offset: 0 });
    });

    test('partial level/bpm ranges (only min, only max) parse', () => {
      const f = parsed(
        CatalogueFilterSchema,
        validFilter({ level: { min: 3 }, bpm: { max: 100 } }),
      );
      assert.deepEqual(f.level, { min: 3 });
      assert.deepEqual(f.bpm, { max: 100 });
    });

    test('an inverted range (min > max) parses by design — bounds-only; ordering is the SQL adapter\'s job', () => {
      // INTENTIONAL: the filter only carries bounds. Do NOT add a min<=max refinement
      // here — range ordering belongs to the U4 Postgres adapter, not the query DTO.
      const f = parsed(CatalogueFilterSchema, validFilter({ level: { min: 9, max: 2 } }));
      assert.deepEqual(f.level, { min: 9, max: 2 });
    });
  });

  describe('pagination — limit clamp vs reject, offset non-negative', () => {
    test('limit > 100 is CLAMPED to 100 (not rejected)', () => {
      const f = parsed(CatalogueFilterSchema, validFilter({ pagination: { limit: 500, offset: 0 } }));
      assert.equal(f.pagination.limit, 100);
    });

    test('limit exactly 100 stays 100', () => {
      const f = parsed(CatalogueFilterSchema, validFilter({ pagination: { limit: 100, offset: 0 } }));
      assert.equal(f.pagination.limit, 100);
    });

    test('limit 1 is OK (lower bound)', () => {
      const f = parsed(CatalogueFilterSchema, validFilter({ pagination: { limit: 1, offset: 0 } }));
      assert.equal(f.pagination.limit, 1);
    });

    test('negative limit → parse error', () => {
      assert.equal(
        CatalogueFilterSchema.safeParse(validFilter({ pagination: { limit: -1, offset: 0 } }))
          .success,
        false,
      );
    });

    test('limit 0 → parse error (lower bound is 1)', () => {
      assert.equal(
        CatalogueFilterSchema.safeParse(validFilter({ pagination: { limit: 0, offset: 0 } }))
          .success,
        false,
      );
    });

    test('negative offset → parse error', () => {
      assert.equal(
        CatalogueFilterSchema.safeParse(validFilter({ pagination: { limit: 20, offset: -1 } }))
          .success,
        false,
      );
    });

    test('omitting pagination → parse error (it is REQUIRED)', () => {
      assert.equal(CatalogueFilterSchema.safeParse({ type: 'song' }).success, false);
    });
  });

  describe('normalization — lowercase to match stored-lowercase values', () => {
    test("genre 'Rock' → 'rock'; tags/skill/instruments lowercased", () => {
      const f = parsed(
        CatalogueFilterSchema,
        validFilter({
          genre: 'Rock',
          tags: ['Ghost-Notes', 'CLASSIC'],
          skill: ['Bending', 'Hybrid-Picking'],
          instruments: ['Guitar', 'BASS'],
        }),
      );
      assert.equal(f.genre, 'rock');
      assert.deepEqual(f.tags, ['ghost-notes', 'classic']);
      assert.deepEqual(f.skill, ['bending', 'hybrid-picking']);
      assert.deepEqual(f.instruments, ['guitar', 'bass']);
    });

    test('search/timeSig/lessonType/patternId are left as-is (no lowercasing)', () => {
      const f = parsed(
        CatalogueFilterSchema,
        validFilter({
          search: 'Mixed Case Query',
          timeSig: '6/8',
          lessonType: 'Technique',
          patternId: 'Rock-8th',
        }),
      );
      assert.equal(f.search, 'Mixed Case Query');
      assert.equal(f.timeSig, '6/8');
      assert.equal(f.lessonType, 'Technique');
      assert.equal(f.patternId, 'Rock-8th');
    });
  });
});
