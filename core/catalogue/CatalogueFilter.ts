import { z } from 'zod';
import type { ItemStatus, ItemType } from './CatalogueItem.ts';

/**
 * CatalogueFilter — the read-side query language for the shared catalogue
 * (spec §9/§10.3). It is the structured input the public list/search endpoint
 * turns into a parameterized Neon query; the persistence adapter maps each
 * field to SQL later (range BETWEEN, `@>` tag containment, pg_trgm fuzzy
 * search, sort_order for 'curated', etc.).
 *
 * Every facet is optional EXCEPT `pagination`, which is always required so the
 * query is always bounded. The schema mirrors CatalogueItem's write-side
 * lowercasing (genre / tags / skill / instruments) so equality and containment
 * filters match the stored-lowercase values rather than missing on case alone.
 *
 * Design notes carried from the spec:
 *   - A BOUNDED `level` filter EXCLUDES ungraded (NULL) items by design (§9):
 *     that intent lives in the SQL adapter, not here; the schema only carries
 *     the bounds.
 *   - The public read API hard-codes `status: 'published'`; the field exists so
 *     the admin/CMS path can query other statuses, not so the public path opens
 *     a hole.
 */

export interface CatalogueFilter {
  type?: ItemType;
  status?: ItemStatus; // the public read API hard-codes 'published'
  level?: { min?: number; max?: number }; // a BOUNDED level filter EXCLUDES ungraded NULLs by design (§9)
  bpm?: { min?: number; max?: number };
  timeSig?: string;
  genre?: string; // compared lowercase
  tags?: string[]; // ALL-of (@> containment)
  skill?: string[];
  instruments?: string[];
  lessonType?: string;
  patternId?: string; // JOIN item_pattern
  search?: string; // fuzzy (pg_trgm) + accent-insensitive + full-text
  sort?: 'relevance' | 'level' | 'bpm' | 'newest' | 'title' | 'curated'; // 'curated' = sort_order
  pagination: { limit: number; offset: number }; // REQUIRED; limit clamped to ≤100
}

/** Hard upper bound on page size — a request asking for more is clamped, not rejected. */
const MAX_LIMIT = 100;

/** Lowercase a single taxonomy token. Mirrors CatalogueItem's write-side normalization. */
const lower = (s: string): string => s.toLowerCase();

/** Lowercase every token in a taxonomy array (tags/skill/instruments). */
const lowerAll = (a: string[]): string[] => a.map(lower);

/**
 * An optional numeric range `{ min?, max? }` — both bounds optional. Reused for
 * `level` and `bpm`. The interface uses optional props (not `| undefined`
 * fields), so `.optional()` is the matching shape.
 */
const rangeSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .optional();

/**
 * `pagination` — the only REQUIRED facet, so a query is always bounded.
 *   - `limit`: integer ≥ 1; a value > 100 is CLAMPED to 100 (not rejected) via a
 *     transform, so an over-eager client gets capped rather than a 400. A
 *     negative or zero limit IS rejected (a nonsensical page size is a real
 *     client bug worth surfacing).
 *   - `offset`: non-negative integer.
 */
const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .transform((n) => Math.min(n, MAX_LIMIT)),
  offset: z.number().int().min(0),
});

/**
 * CatalogueFilterSchema — the query boundary parser. Annotated
 * `z.ZodType<CatalogueFilter>` so (a) isolatedDeclarations can emit it and
 * (b) tsc fails the build if any field's OUTPUT shape drifts from the interface
 * above. The `limit` clamp transform changes the input vs output of that field,
 * but `z.ZodType<T>` only constrains the OUTPUT (the interface), and the
 * transform's output is `number` — so the annotation holds (same trick as
 * CatalogueItem's lowercasing transforms).
 *
 * Normalization transforms run on input, so `genre`/`tags`/`skill`/`instruments`
 * are lowercased to match the stored-lowercase catalogue values regardless of
 * how the client cased them. `search`/`timeSig`/`lessonType`/`patternId` are
 * left verbatim (search is fuzzy/accent-insensitive downstream; the others are
 * not lowercased taxonomy facets).
 */
export const CatalogueFilterSchema: z.ZodType<CatalogueFilter> = z.object({
  type: z.enum(['song', 'lesson']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  level: rangeSchema,
  bpm: rangeSchema,
  timeSig: z.string().optional(),
  genre: z
    .string()
    .transform(lower)
    .optional(), // normalize
  tags: z.array(z.string()).transform(lowerAll).optional(), // normalize
  skill: z.array(z.string()).transform(lowerAll).optional(), // normalize
  instruments: z.array(z.string()).transform(lowerAll).optional(), // normalize
  lessonType: z.string().optional(), // not a lowercased taxonomy facet — verbatim
  patternId: z.string().optional(), // JOIN item_pattern — verbatim
  search: z.string().optional(), // fuzzy/accent-insensitive downstream — verbatim
  sort: z.enum(['relevance', 'level', 'bpm', 'newest', 'title', 'curated']).optional(),
  pagination: paginationSchema,
});
