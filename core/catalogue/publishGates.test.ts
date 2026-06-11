import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogueItem } from './CatalogueItem.ts';
import { CatalogueItemSchema } from './CatalogueItem.ts';
import { canPublish } from './publishGates.ts';
import type { PublishGateFacts } from './publishGates.ts';
import { parsed } from './schemaTestUtils.ts';

/**
 * Local builder — a parseable curated lesson (the common publish candidate),
 * overridable per case. We parse through CatalogueItemSchema so the VALUE handed
 * to `canPublish` is a real branded/normalized CatalogueItem, not a hand-rolled
 * lookalike. Kept local to this file (per the U2.4 valid-builder convention).
 */
const validLesson = (overrides: Record<string, unknown> = {}): CatalogueItem =>
  parsed(CatalogueItemSchema, {
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
    license: 'royalty-free',
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

const validSong = (overrides: Record<string, unknown> = {}): CatalogueItem =>
  parsed(CatalogueItemSchema, {
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

/** A facts object that passes every gate; override per case. */
const passingFacts = (overrides: Partial<PublishGateFacts> = {}): PublishGateFacts => ({
  exerciseCount: 1,
  unpublishedSliceSourceCount: 0,
  ...overrides,
});

/** Pull the failure gate codes from a canPublish result; assert it FAILED. */
const failures = (item: CatalogueItem, facts: PublishGateFacts): readonly string[] => {
  const r = canPublish(item, facts);
  assert.equal(r.ok, false, 'expected publish gate to fail');
  return r.ok ? [] : r.error.failures;
};

describe('publishGates — §5 publish-gate checks', () => {
  describe('happy paths', () => {
    test('curated lesson + license + exerciseCount 1 + 0 unpublished slices → ok', () => {
      const r = canPublish(validLesson(), passingFacts());
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, undefined);
    });

    test('curated song + license (songs need no exercises) → ok', () => {
      const r = canPublish(validSong(), passingFacts({ exerciseCount: 0 }));
      assert.equal(r.ok, true);
    });
  });

  describe('gate (a) — lesson needs at least one exercise', () => {
    test('lesson with exerciseCount 0 → ✗ lesson-needs-at-least-one-exercise', () => {
      const codes = failures(validLesson(), passingFacts({ exerciseCount: 0 }));
      assert.ok(
        codes.includes('lesson-needs-at-least-one-exercise'),
        `codes were ${JSON.stringify(codes)}`,
      );
    });
  });

  describe('gate (b) — curated item needs a license', () => {
    test('curated item with license null → ✗ curated-item-needs-license', () => {
      const codes = failures(validLesson({ license: null }), passingFacts());
      assert.ok(codes.includes('curated-item-needs-license'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('gate (c) — only curated items can publish in v1', () => {
    test('user-upload song → ✗ only-curated-can-publish', () => {
      // user-uploads carry no license; isolate gate (c) by also giving it a license.
      const codes = failures(validSong({ source: 'user-upload' }), passingFacts());
      assert.ok(codes.includes('only-curated-can-publish'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('gate (d) — lesson slice source must be published', () => {
    test('lesson with unpublishedSliceSourceCount 1 → ✗ song-breakdown-source-not-published', () => {
      const codes = failures(validLesson(), passingFacts({ unpublishedSliceSourceCount: 1 }));
      assert.ok(
        codes.includes('song-breakdown-source-not-published'),
        `codes were ${JSON.stringify(codes)}`,
      );
    });
  });

  describe('accumulation — every blocker reported at once', () => {
    test('a curated lesson, no license, no exercises, unpublished slice → MULTIPLE codes', () => {
      // A CURATED lesson exercises gates (a)+(b)+(d) at once. Gate (b)
      // (curated-needs-license) is curated-scoped by design, so it only stacks
      // with a curated source — a user-upload would instead fail gate (c) ALONE
      // on the license axis. This case proves the accumulator collects all 3.
      const codes = failures(
        validLesson({ license: null }),
        passingFacts({ exerciseCount: 0, unpublishedSliceSourceCount: 2 }),
      );
      assert.ok(codes.includes('lesson-needs-at-least-one-exercise'));
      assert.ok(codes.includes('curated-item-needs-license'));
      assert.ok(codes.includes('song-breakdown-source-not-published'));
      assert.ok(!codes.includes('only-curated-can-publish'), 'curated → gate (c) must NOT fire');
      assert.equal(codes.length, 3, `expected 3 stacked codes, got ${JSON.stringify(codes)}`);
    });
  });
});
