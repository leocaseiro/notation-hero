import type { Brand } from '../shared/kernel/Brand.ts';

/**
 * Branded id types for the catalogue domain. All ids are `text` in the locked
 * Neon schema: curated items and patterns use human-authored slugs, exercises
 * use uuids. We brand them so a `CatalogueItemId` is never silently passed
 * where an `ExerciseId` is expected, even though both are strings at runtime.
 *
 * YAGNI: no format validation here yet — the schema casts a parsed `string`
 * into the brand at the boundary. Slug/uuid shape rules land with the entity
 * that needs them (Exercise in U2.3), not preemptively.
 */
export type CatalogueItemId = Brand<string, 'CatalogueItemId'>;
export type ExerciseId = Brand<string, 'ExerciseId'>;
export type PatternId = Brand<string, 'PatternId'>;

/** Cast a raw string into a `CatalogueItemId`. Identity at runtime. */
export const toCatalogueItemId = (s: string): CatalogueItemId => s as CatalogueItemId;

/** Cast a raw string into an `ExerciseId`. Identity at runtime. */
export const toExerciseId = (s: string): ExerciseId => s as ExerciseId;

/** Cast a raw string into a `PatternId`. Identity at runtime. */
export const toPatternId = (s: string): PatternId => s as PatternId;
