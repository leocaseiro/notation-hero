import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PatternSchema } from './Pattern.ts';
import { parsed } from './schemaTestUtils.ts';

/**
 * Builder — start from a fully-valid raw beat pattern, override per case. The
 * schema input is the camelCase domain shape (the adapter handles snake_case
 * mapping later). We feed plain objects, not pre-branded values, to mirror the
 * boundary. This builder is intentionally LOCAL — only the schema-generic
 * helpers (failureCodes / parsed) are shared via schemaTestUtils.ts.
 */
const validPattern = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'rock-8th',
  kind: 'beat',
  name: '8th-Note Rock',
  family: 'Rock',
  subdivision: '8th',
  level: 1,
  aliases: ['straight-8s'],
  description: 'The foundational rock beat.',
  notationTex: '\\track "Drums" | C4 ',
  data: null,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  ...overrides,
});

describe('Pattern schema — §4 ③ CHECK refinements', () => {
  describe('round-trip — a valid beat pattern parses unchanged', () => {
    test('all fields survive and id is branded', () => {
      const p = parsed(PatternSchema, validPattern());
      assert.equal(p.id, 'rock-8th');
      assert.equal(p.kind, 'beat');
      assert.equal(p.name, '8th-Note Rock');
      assert.equal(p.family, 'Rock');
      assert.equal(p.subdivision, '8th');
      assert.equal(p.level, 1);
      assert.deepEqual(p.aliases, ['straight-8s']);
      assert.equal(p.description, 'The foundational rock beat.');
      assert.equal(p.notationTex, '\\track "Drums" | C4 ');
      assert.equal(p.data, null);
      assert.equal(p.createdAt, '2026-06-11T00:00:00.000Z');
      assert.equal(p.updatedAt, '2026-06-11T00:00:00.000Z');
    });

    test('nullable fields accept null', () => {
      const p = parsed(
        PatternSchema,
        validPattern({
          family: null,
          subdivision: null,
          level: null,
          description: null,
          notationTex: null,
          data: null,
        }),
      );
      assert.equal(p.family, null);
      assert.equal(p.subdivision, null);
      assert.equal(p.level, null);
      assert.equal(p.description, null);
      assert.equal(p.notationTex, null);
      assert.equal(p.data, null);
    });
  });

  describe('pat_level — null or integer 1..10', () => {
    test('level 0 is rejected', () => {
      assert.equal(PatternSchema.safeParse(validPattern({ level: 0 })).success, false);
    });
    test('level 11 is rejected', () => {
      assert.equal(PatternSchema.safeParse(validPattern({ level: 11 })).success, false);
    });
    test('level 5 is OK', () => {
      assert.equal(parsed(PatternSchema, validPattern({ level: 5 })).level, 5);
    });
    test('level null is OK', () => {
      assert.equal(parsed(PatternSchema, validPattern({ level: null })).level, null);
    });
  });

  describe('kind — OPEN vocab (NOT a closed enum)', () => {
    test("kind 'beat' parses OK", () => {
      assert.equal(parsed(PatternSchema, validPattern({ kind: 'beat' })).kind, 'beat');
    });
    test("kind 'fill' parses OK", () => {
      assert.equal(parsed(PatternSchema, validPattern({ kind: 'fill' })).kind, 'fill');
    });
    test("kind 'rudiment' parses OK", () => {
      assert.equal(
        parsed(PatternSchema, validPattern({ kind: 'rudiment', family: 'Roll' })).kind,
        'rudiment',
      );
    });
    test("future kind 'scale' parses OK — proves open vocab", () => {
      assert.equal(parsed(PatternSchema, validPattern({ kind: 'scale' })).kind, 'scale');
    });
  });

  describe('no normalization — aliases/family are NOT lowercased', () => {
    test('mixed-case family + aliases persist verbatim', () => {
      const p = parsed(
        PatternSchema,
        validPattern({ family: 'Roll', aliases: ['Single-Stroke-Roll', 'SSR'] }),
      );
      assert.equal(p.family, 'Roll');
      assert.deepEqual(p.aliases, ['Single-Stroke-Roll', 'SSR']);
    });
  });

  describe('data — freeform JSONB passthrough', () => {
    test('arbitrary nested object survives parse unchanged', () => {
      const blob = { sticking: ['R', 'L', 'R', 'R'], nested: { deep: [1, 2, { flag: true }] } };
      const p = parsed(PatternSchema, validPattern({ data: blob }));
      assert.deepEqual(p.data, blob);
    });
  });
});
