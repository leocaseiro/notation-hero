import { z } from 'zod';
import type { CatalogueItemId, ExerciseId } from './ids.ts';
import { toCatalogueItemId, toExerciseId } from './ids.ts';

/**
 * Exercise — one ordered step of a lesson's practice ladder (e.g. "Hi-hat only",
 * then "+ Kick"). This is the camelCase domain shape; the persistence adapter
 * maps to/from the snake_case Neon row later. The Zod schema mirrors the locked
 * §4 ② DB CHECK constraints so the same rules guard both the curator write path
 * and the ingest path.
 *
 * Each step's notation comes from EXACTLY ONE source: authored alphaTex inline
 * (the common case), a standalone GP/MusicXML S3 file key (rare), or a slice of
 * a source song (song-breakdown). The DB UNIQUE(lesson_id, step_no) is a
 * cross-row concern and is NOT enforced here — only single-row invariants are.
 */
export interface Exercise {
  id: ExerciseId;
  lessonId: CatalogueItemId;
  stepNo: number; // step ordering within a lesson
  title: string; // "Hi-hat only", "+ Kick"
  sectionLabel: string | null; // song-breakdown display label ("Chorus 1")
  startBpm: number | null;
  goalBpm: number | null; // the start→goal practice ladder
  // notation source: EXACTLY ONE of the three is non-null
  notationTex: string | null; // authored alphaTex inline — common case
  notationKey: string | null; // rare: standalone GP/MusicXML S3 file key
  sourceItemId: CatalogueItemId | null; // song-breakdown slice → source song
  startBar: number | null;
  endBar: number | null;
  data: Record<string, unknown> | null;
}

/** Server-side guard on CMS-authored alphaTex length (64 KiB chars). */
const NOTATION_TEX_MAX = 65_536;

/**
 * ExerciseSchema — the boundary parser. Annotated `z.ZodType<Exercise>` so
 * (a) isolatedDeclarations can emit it and (b) tsc fails the build if any
 * field's output shape drifts from the interface above.
 *
 * Field-level rules (stepNo non-negative integer, notationTex length cap) live
 * in the per-field schemas; cross-field §4 ② CHECKs live in the `.superRefine`
 * below. Each refinement failure carries `message = <CHECK name>` so the
 * boundary error names the exact constraint that was violated.
 */
export const ExerciseSchema: z.ZodType<Exercise> = z
  .object({
    // text/uuid ids; brand at the boundary via the helpers. No format check yet (YAGNI).
    id: z.string().transform((s): ExerciseId => toExerciseId(s)),
    lessonId: z.string().transform((s): CatalogueItemId => toCatalogueItemId(s)),
    stepNo: z.number().int().min(0), // non-negative integer (DB UNIQUE is cross-row)
    title: z.string(),
    sectionLabel: z.string().nullable(),
    startBpm: z.number().int().nullable(), // DDL: int
    goalBpm: z.number().int().nullable(), // DDL: int
    notationTex: z.string().max(NOTATION_TEX_MAX).nullable(),
    notationKey: z.string().nullable(),
    sourceItemId: z
      .string()
      .nullable()
      .transform((s): CatalogueItemId | null => (s == null ? null : toCatalogueItemId(s))),
    startBar: z.number().int().nullable(), // DDL: int
    endBar: z.number().int().nullable(), // DDL: int
    data: z.record(z.string(), z.unknown()).nullable(), // freeform passthrough
  })
  .superRefine((val, ctx) => {
    // ex_one_source: EXACTLY ONE of notationTex / notationKey / sourceItemId is non-null.
    const sources = [val.notationTex, val.notationKey, val.sourceItemId];
    const sourceCount = sources.filter((s) => s != null).length;
    if (sourceCount !== 1) {
      ctx.addIssue({ code: 'custom', message: 'ex_one_source', path: ['notationTex'] });
    }

    // ex_slice_bars: a song-breakdown slice needs startBar > 0 AND endBar >= startBar.
    if (val.sourceItemId != null) {
      const badBars =
        val.startBar == null ||
        val.startBar <= 0 ||
        val.endBar == null ||
        val.endBar < val.startBar;
      if (badBars) {
        ctx.addIssue({ code: 'custom', message: 'ex_slice_bars', path: ['startBar'] });
      }
    }

    // ex_bpm_ladder: positive bpms, and goal >= start when both are present.
    const startPositive = val.startBpm == null || val.startBpm > 0;
    const goalPositive = val.goalBpm == null || val.goalBpm > 0;
    const ladderOrdered =
      val.startBpm == null || val.goalBpm == null || val.goalBpm >= val.startBpm;
    if (!startPositive || !goalPositive || !ladderOrdered) {
      ctx.addIssue({ code: 'custom', message: 'ex_bpm_ladder', path: ['goalBpm'] });
    }
  });
