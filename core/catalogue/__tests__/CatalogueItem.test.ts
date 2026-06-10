import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogueItemSchema } from '../CatalogueItem.ts';
import type { CatalogueItem } from '../CatalogueItem.ts';

/**
 * Builders — start from a fully-valid raw shape, override per case. The schema
 * input is the camelCase domain shape (the adapter handles snake_case mapping
 * later). We feed plain objects, not pre-branded values, to mirror the boundary.
 */
const validSong = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'song-stairway',
  type: 'song',
  title: 'Stairway to Heaven',
  level: 7,
  artist: 'Led Zeppelin',
  bpm: 82,
  timeSig: '4/4',
  genre: 'rock',
  musicalKey: 'Am',
  instruments: ['guitar'],
  skill: ['fingerpicking'],
  tags: ['classic'],
  lessonType: null,
  sortOrder: null,
  source: 'curated',
  license: 'royalty-free',
  coverImageKey: null,
  notationKey: 'songs/stairway.gp',
  notationFormat: 'gp',
  notationChecksum: 'abc123',
  notationBytes: 4096,
  hasAudio: false,
  hasVideo: false,
  audio: null,
  video: null,
  status: 'draft',
  data: null,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  ...overrides,
});

const validLesson = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'lesson-bends-101',
  type: 'lesson',
  title: 'String Bending 101',
  level: null,
  artist: null,
  bpm: null,
  timeSig: null,
  genre: null,
  musicalKey: null,
  instruments: ['guitar'],
  skill: ['bending'],
  tags: ['technique'],
  lessonType: 'technique',
  sortOrder: 1,
  source: 'curated',
  license: null,
  coverImageKey: null,
  notationKey: null,
  notationFormat: null,
  notationChecksum: null,
  notationBytes: null,
  hasAudio: false,
  hasVideo: false,
  audio: null,
  video: null,
  status: 'draft',
  data: null,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  ...overrides,
});

/** Collect the message codes from a failed parse — refinements set message = CHECK name. */
const failureCodes = (input: Record<string, unknown>): string[] => {
  const r = CatalogueItemSchema.safeParse(input);
  assert.equal(r.success, false, 'expected parse to fail');
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

const parsed = (input: Record<string, unknown>): CatalogueItem => {
  const r = CatalogueItemSchema.safeParse(input);
  assert.equal(r.success, true, r.success ? '' : JSON.stringify(r.error.issues));
  if (!r.success) throw new Error('unreachable');
  return r.data;
};

describe('CatalogueItem schema — §4 CHECK refinements', () => {
  describe('happy paths', () => {
    test('valid song (bpm + notationKey + notationFormat) parses OK', () => {
      const item = parsed(validSong());
      assert.equal(item.type, 'song');
      assert.equal(item.bpm, 82);
      assert.equal(item.notationKey, 'songs/stairway.gp');
      assert.equal(item.notationFormat, 'gp');
    });

    test('valid lesson (no bpm/notationKey needed) parses OK', () => {
      const item = parsed(validLesson());
      assert.equal(item.type, 'lesson');
      assert.equal(item.bpm, null);
      assert.equal(item.notationKey, null);
      assert.equal(item.notationFormat, null);
    });
  });

  describe('field-vocab CHECKs — out-of-vocab enum values are rejected', () => {
    // These guard ci_type / ci_status / ci_source and the license vocab at the
    // field level (zod enum). They reject with zod's generic message rather than
    // a named code, so we assert rejection, not the message.
    test('ci_type — unknown type is rejected', () => {
      assert.equal(CatalogueItemSchema.safeParse(validSong({ type: 'album' })).success, false);
    });
    test('ci_status — unknown status is rejected', () => {
      assert.equal(CatalogueItemSchema.safeParse(validSong({ status: 'deleted' })).success, false);
    });
    test('ci_source — unknown source is rejected', () => {
      assert.equal(CatalogueItemSchema.safeParse(validSong({ source: 'pirated' })).success, false);
    });
    test('license — unknown license is rejected', () => {
      assert.equal(CatalogueItemSchema.safeParse(validSong({ license: 'gpl' })).success, false);
    });
  });

  describe('ci_song_bpm — song requires bpm', () => {
    test('song missing bpm is rejected and names ci_song_bpm', () => {
      const codes = failureCodes(validSong({ bpm: null }));
      assert.ok(codes.includes('ci_song_bpm'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('ci_song_file — song requires notationKey', () => {
    test('song missing notationKey is rejected and names ci_song_file', () => {
      const codes = failureCodes(validSong({ notationKey: null }));
      assert.ok(codes.includes('ci_song_file'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('ci_song_fmt — notationFormat vocab (no mid)', () => {
    test("notationFormat 'mid' is rejected and names ci_song_fmt", () => {
      const codes = failureCodes(validSong({ notationFormat: 'mid' }));
      assert.ok(codes.includes('ci_song_fmt'), `codes were ${JSON.stringify(codes)}`);
    });

    test('every allowed format parses OK', () => {
      for (const fmt of ['gp', 'gpx', 'gp5', 'gp4', 'gp3', 'xml']) {
        const item = parsed(validSong({ notationFormat: fmt }));
        assert.equal(item.notationFormat, fmt);
      }
    });
  });

  describe('ci_lesson_type_only — song cannot carry lessonType', () => {
    test('song with non-null lessonType is rejected and names ci_lesson_type_only', () => {
      const codes = failureCodes(validSong({ lessonType: 'technique' }));
      assert.ok(codes.includes('ci_lesson_type_only'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('ci_level — null or integer 1..10', () => {
    test('level 0 is rejected', () => {
      assert.equal(CatalogueItemSchema.safeParse(validSong({ level: 0 })).success, false);
    });
    test('level 11 is rejected', () => {
      assert.equal(CatalogueItemSchema.safeParse(validSong({ level: 11 })).success, false);
    });
    test('level null is OK', () => {
      assert.equal(parsed(validSong({ level: null })).level, null);
    });
    test('level 5 is OK', () => {
      assert.equal(parsed(validSong({ level: 5 })).level, 5);
    });
  });

  describe('data — freeform JSONB passthrough', () => {
    test('arbitrary nested object survives parse unchanged', () => {
      const blob = { nested: { arr: [1, 2, { deep: 'value' }], flag: true }, n: 3 };
      const item = parsed(validSong({ data: blob }));
      assert.deepEqual(item.data, blob);
    });
  });

  describe('normalization — lowercase transforms', () => {
    test('mixed-case genre + tags + skill + instruments persist LOWERCASE', () => {
      const item = parsed(
        validSong({
          genre: 'Rock',
          tags: ['Ghost-Notes', 'CLASSIC'],
          skill: ['Fingerpicking', 'Hybrid-Picking'],
          instruments: ['Guitar', 'BASS'],
        }),
      );
      assert.equal(item.genre, 'rock');
      assert.deepEqual(item.tags, ['ghost-notes', 'classic']);
      assert.deepEqual(item.skill, ['fingerpicking', 'hybrid-picking']);
      assert.deepEqual(item.instruments, ['guitar', 'bass']);
    });

    test('null genre stays null (transform is null-safe)', () => {
      assert.equal(parsed(validLesson({ genre: null })).genre, null);
    });
  });
});
