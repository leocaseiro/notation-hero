import { z } from 'zod';

/**
 * Notation file formats accepted by the catalogue. This is the locked §4
 * `ci_song_fmt` vocabulary — Guitar Pro family plus MusicXML. Deliberately
 * EXCLUDES 'mid' and 'alphatex': those are not stored notation source formats
 * in v1. Any drift here must come with a matching DB CHECK migration.
 */
export type NotationFormat = 'gp' | 'gpx' | 'gp5' | 'gp4' | 'gp3' | 'xml';

/** Cover-image formats. Ships in v1 but coverImageKey stays null for now. */
export type CoverFormat = 'jpg' | 'png' | 'webp';

/**
 * The notation-format vocabulary as a readonly tuple — the single source of
 * truth for both the type and the schema. Consumers that need to re-wrap the
 * vocab (e.g. attach an entity-specific CHECK-name error) build their own
 * `z.enum(NOTATION_FORMATS, ...)` from this, so the no-mid list never drifts.
 */
export const NOTATION_FORMATS: readonly NotationFormat[] = ['gp', 'gpx', 'gp5', 'gp4', 'gp3', 'xml'];

/**
 * Zod enum value for the notation-format vocabulary. Derived from
 * `NOTATION_FORMATS` so the vocab is written exactly twice (the type union +
 * the tuple) and never drifts. Annotated `z.ZodType<NotationFormat>` so
 * isolatedDeclarations can emit the declaration.
 */
export const NotationFormatSchema: z.ZodType<NotationFormat> = z.enum(NOTATION_FORMATS);

/** Cover-image vocabulary as a readonly tuple — single source for type+schema. */
export const COVER_FORMATS: readonly CoverFormat[] = ['jpg', 'png', 'webp'];

/** Zod enum value for the cover-image format vocabulary. Derived from the tuple. */
export const CoverFormatSchema: z.ZodType<CoverFormat> = z.enum(COVER_FORMATS);
