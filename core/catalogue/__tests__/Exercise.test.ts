import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ExerciseSchema } from '../Exercise.ts';
import { failureCodes, parsed } from './schemaTestUtils.ts';

/**
 * Builders — start from a fully-valid raw step, override per case. The schema
 * input is the camelCase domain shape (the adapter handles snake_case mapping
 * later). We feed plain objects, not pre-branded values, to mirror the boundary.
 *
 * The default valid step is a tex-only lesson step (the common case): exactly
 * one notation source (`notationTex`), no slice bars, no bpm ladder.
 */
const validStep = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: '11111111-1111-4111-8111-111111111111',
  lessonId: 'lesson-bends-101',
  stepNo: 0,
  title: 'Hi-hat only',
  sectionLabel: null,
  startBpm: null,
  goalBpm: null,
  notationTex: '\\track "Drums" | C4 ',
  notationKey: null,
  sourceItemId: null,
  startBar: null,
  endBar: null,
  data: null,
  ...overrides,
});

describe('Exercise schema — §4 ② CHECK refinements', () => {
  describe('ex_one_source — exactly one of notationTex / notationKey / sourceItemId', () => {
    test('tex-only parses OK', () => {
      const ex = parsed(ExerciseSchema, validStep());
      assert.equal(ex.notationTex, '\\track "Drums" | C4 ');
      assert.equal(ex.notationKey, null);
      assert.equal(ex.sourceItemId, null);
    });

    test('key-only parses OK', () => {
      const ex = parsed(
        ExerciseSchema,
        validStep({ notationTex: null, notationKey: 'exercises/abc.gp', sourceItemId: null }),
      );
      assert.equal(ex.notationTex, null);
      assert.equal(ex.notationKey, 'exercises/abc.gp');
    });

    test('slice (sourceItemId + valid bars) parses OK', () => {
      const ex = parsed(
        ExerciseSchema,
        validStep({
          notationTex: null,
          notationKey: null,
          sourceItemId: 'song-stairway',
          startBar: 1,
          endBar: 8,
        }),
      );
      assert.equal(ex.sourceItemId, 'song-stairway');
      assert.equal(ex.startBar, 1);
      assert.equal(ex.endBar, 8);
    });

    test('zero sources is rejected and names ex_one_source', () => {
      const codes = failureCodes(
        ExerciseSchema,
        validStep({ notationTex: null, notationKey: null, sourceItemId: null }),
      );
      assert.ok(codes.includes('ex_one_source'), `codes were ${JSON.stringify(codes)}`);
    });

    test('two sources is rejected and names ex_one_source', () => {
      const codes = failureCodes(
        ExerciseSchema,
        validStep({ notationTex: '\\track | C4 ', notationKey: 'exercises/abc.gp' }),
      );
      assert.ok(codes.includes('ex_one_source'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('ex_slice_bars — sourceItemId ⟹ startBar > 0 AND endBar >= startBar', () => {
    const slice = (overrides: Record<string, unknown> = {}): Record<string, unknown> =>
      validStep({
        notationTex: null,
        notationKey: null,
        sourceItemId: 'song-stairway',
        startBar: 1,
        endBar: 8,
        ...overrides,
      });

    test('slice with valid bars parses OK', () => {
      const ex = parsed(ExerciseSchema, slice());
      assert.equal(ex.startBar, 1);
      assert.equal(ex.endBar, 8);
    });

    test('slice with startBar 0 is rejected and names ex_slice_bars', () => {
      const codes = failureCodes(ExerciseSchema, slice({ startBar: 0 }));
      assert.ok(codes.includes('ex_slice_bars'), `codes were ${JSON.stringify(codes)}`);
    });

    test('slice with endBar < startBar is rejected and names ex_slice_bars', () => {
      const codes = failureCodes(ExerciseSchema, slice({ startBar: 8, endBar: 4 }));
      assert.ok(codes.includes('ex_slice_bars'), `codes were ${JSON.stringify(codes)}`);
    });

    test('slice with endBar null is rejected and names ex_slice_bars', () => {
      const codes = failureCodes(ExerciseSchema, slice({ endBar: null }));
      assert.ok(codes.includes('ex_slice_bars'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('ex_bpm_ladder — positive bpms and goal >= start', () => {
    test('goalBpm < startBpm is rejected and names ex_bpm_ladder', () => {
      const codes = failureCodes(ExerciseSchema, validStep({ startBpm: 120, goalBpm: 80 }));
      assert.ok(codes.includes('ex_bpm_ladder'), `codes were ${JSON.stringify(codes)}`);
    });

    test('goalBpm === startBpm is OK', () => {
      const ex = parsed(ExerciseSchema, validStep({ startBpm: 100, goalBpm: 100 }));
      assert.equal(ex.startBpm, 100);
      assert.equal(ex.goalBpm, 100);
    });

    test('both null is OK', () => {
      const ex = parsed(ExerciseSchema, validStep({ startBpm: null, goalBpm: null }));
      assert.equal(ex.startBpm, null);
      assert.equal(ex.goalBpm, null);
    });

    test('startBpm set with goalBpm null is OK (ladder check short-circuits)', () => {
      const ex = parsed(ExerciseSchema, validStep({ startBpm: 60, goalBpm: null }));
      assert.equal(ex.startBpm, 60);
      assert.equal(ex.goalBpm, null);
    });

    test('a negative bpm is rejected and names ex_bpm_ladder', () => {
      const codes = failureCodes(ExerciseSchema, validStep({ startBpm: -1, goalBpm: 120 }));
      assert.ok(codes.includes('ex_bpm_ladder'), `codes were ${JSON.stringify(codes)}`);
    });
  });

  describe('round-trip — a valid lesson step parses unchanged', () => {
    test('full ladder + section label survives parse', () => {
      const raw = validStep({
        stepNo: 2,
        title: '+ Kick',
        sectionLabel: 'Chorus 1',
        startBpm: 60,
        goalBpm: 120,
        data: { hint: 'keep the hat steady' },
      });
      const ex = parsed(ExerciseSchema, raw);
      assert.equal(ex.stepNo, 2);
      assert.equal(ex.title, '+ Kick');
      assert.equal(ex.sectionLabel, 'Chorus 1');
      assert.equal(ex.startBpm, 60);
      assert.equal(ex.goalBpm, 120);
      assert.equal(ex.notationTex, '\\track "Drums" | C4 ');
      assert.deepEqual(ex.data, { hint: 'keep the hat steady' });
    });
  });

  describe('stepNo — non-negative integer', () => {
    test('negative stepNo is rejected', () => {
      assert.equal(ExerciseSchema.safeParse(validStep({ stepNo: -1 })).success, false);
    });
    test('non-integer stepNo is rejected', () => {
      assert.equal(ExerciseSchema.safeParse(validStep({ stepNo: 1.5 })).success, false);
    });
    test('stepNo 0 is OK', () => {
      assert.equal(parsed(ExerciseSchema, validStep({ stepNo: 0 })).stepNo, 0);
    });
  });

  describe('notationTex length cap — .max(65_536)', () => {
    test('notationTex over 65536 chars is rejected', () => {
      const tooLong = 'x'.repeat(65_537);
      assert.equal(ExerciseSchema.safeParse(validStep({ notationTex: tooLong })).success, false);
    });
    test('notationTex at exactly 65536 chars is OK', () => {
      const atCap = 'x'.repeat(65_536);
      assert.equal(parsed(ExerciseSchema, validStep({ notationTex: atCap })).notationTex?.length, 65_536);
    });
  });
});
