import { z } from 'zod';
import type { PatternId } from './ids.ts';
import { toPatternId } from './ids.ts';

/**
 * Pattern — a reusable musical building block in the catalogue: a beat, a fill,
 * or a rudiment (later ostinatos, scales, chords). This is the camelCase domain
 * shape; the persistence adapter maps to/from the snake_case Neon row later. The
 * Zod schema mirrors the locked §4 ③ DB CHECK constraints so the same rules
 * guard both the curator write path and the ingest path.
 *
 * `kind` is deliberately OPEN vocabulary, not a closed enum — today it carries
 * 'beat' | 'fill' | 'rudiment', but it must accept future values ('ostinato',
 * 'scale', 'chord') without a code change, so it is a plain string. No
 * normalization transform is specified for Pattern (unlike CatalogueItem's
 * taxonomy facets), so `family`/`aliases`/etc. are stored verbatim.
 */
export interface Pattern {
  id: PatternId; // slug: 'rock-8th', 'single-paradiddle'
  kind: string; // OPEN vocab: 'beat'|'fill'|'rudiment' (later 'ostinato'|'scale'|'chord')
  name: string; // "8th-Note Rock", "Single Paradiddle"
  family: string | null; // kind-relative grouping (NOT genre): Rock/Funk · Roll/Diddle/Flam/Drag
  subdivision: string | null; // '8th'|'16th'|'triplet'|'quarter'
  level: number | null; // 1–10 (pat_level)
  aliases: string[];
  description: string | null;
  notationTex: string | null; // canonical pattern as alphaTex
  data: Record<string, unknown> | null;
  createdAt: string; // ISO timestamptz
  updatedAt: string; // ISO
}

/**
 * PatternSchema — the boundary parser. Annotated `z.ZodType<Pattern>` so
 * (a) isolatedDeclarations can emit it and (b) tsc fails the build if any
 * field's output shape drifts from the interface above.
 *
 * Only one §4 ③ field rule applies (pat_level); there are no cross-field
 * invariants for Pattern, so there is no `.superRefine`. `kind` is a plain
 * string (open vocab — NOT a z.enum). `notationTex` has no length cap (patterns
 * are tiny; YAGNI — the spec doesn't ask for one).
 */
export const PatternSchema: z.ZodType<Pattern> = z.object({
  // text id; brand at the boundary via the helper. No slug-format check yet (YAGNI).
  id: z.string().transform((s): PatternId => toPatternId(s)),
  kind: z.string(), // OPEN vocab — must accept future values, so NOT an enum
  name: z.string(),
  family: z.string().nullable(),
  subdivision: z.string().nullable(),
  level: z.number().int().min(1).max(10).nullable(), // pat_level (null OR int 1..10)
  aliases: z.array(z.string()), // no normalization — stored verbatim
  description: z.string().nullable(),
  notationTex: z.string().nullable(), // no length cap (YAGNI)
  data: z.record(z.string(), z.unknown()).nullable(), // freeform passthrough
  createdAt: z.string(),
  updatedAt: z.string(),
});
