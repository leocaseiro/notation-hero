import { z } from 'zod';
import type { CatalogueItemId } from './ids.ts';
import { toCatalogueItemId } from './ids.ts';
import type { NotationFormat } from './NotationFormat.ts';
import { NOTATION_FORMATS } from './NotationFormat.ts';

/**
 * CatalogueItem — a curated song or lesson in the catalogue. This is the
 * camelCase domain shape; the persistence adapter maps to/from the snake_case
 * Neon row later. The Zod schema mirrors the locked §4 DB CHECK constraints so
 * the same rules guard both the curator write path and the ingest path, and it
 * normalizes free-text taxonomy fields to lowercase so equality filters match.
 */

export type ItemType = 'song' | 'lesson';
export type ItemStatus = 'draft' | 'published' | 'archived';
export type ItemSource = 'curated' | 'user-upload';
export type License = 'royalty-free' | 'cc' | 'owned' | 'public-domain';

export interface MediaLink {
  provider: string;
  url?: string;
  key?: string;
  label?: string;
}

export interface CatalogueItem {
  id: CatalogueItemId;
  type: ItemType;
  title: string;
  level: number | null; // 1–10; null = ungraded
  artist: string | null;
  bpm: number | null; // required for songs
  timeSig: string | null;
  genre: string | null; // stored LOWERCASE (transform)
  musicalKey: string | null;
  instruments: string[]; // stored LOWERCASE (transform)
  skill: string[]; // stored LOWERCASE (transform)
  tags: string[]; // stored LOWERCASE (transform)
  lessonType: string | null; // lessons only; open vocab
  sortOrder: number | null;
  source: ItemSource;
  license: License | null;
  coverImageKey: string | null; // ships but stays NULL in v1
  notationKey: string | null; // songs only
  notationFormat: NotationFormat | null;
  notationChecksum: string | null; // sha256
  notationBytes: number | null;
  hasAudio: boolean;
  hasVideo: boolean;
  audio: MediaLink[] | null;
  video: MediaLink[] | null;
  status: ItemStatus;
  data: Record<string, unknown> | null; // freeform JSONB passthrough
  createdAt: string; // ISO timestamptz
  updatedAt: string; // ISO — doubles as If-Match concurrency token
}

/** Lowercase a single taxonomy token. */
const lower = (s: string): string => s.toLowerCase();

/** Lowercase every token in a taxonomy array (instruments/skill/tags). */
const lowerAll = (a: string[]): string[] => a.map(lower);

/**
 * Notation-format field for this entity: the shared vocabulary (single-sourced
 * from `NOTATION_FORMATS`, so the no-mid list never drifts) with a named
 * `ci_song_fmt` error so a bad/`'mid'` value names the §4 CHECK rather than
 * emitting zod's generic "invalid option" message. The CHECK name lives here,
 * in the entity — `NotationFormat.ts` stays a generic, reusable enum.
 */
const notationFormatField = z.enum(NOTATION_FORMATS, { error: 'ci_song_fmt' }).nullable();

/**
 * MediaLink schema. `url`/`key`/`label` are optional; the interface uses
 * optional props (not `| undefined` fields), so `.optional()` matches.
 */
const mediaLinkSchema = z.object({
  provider: z.string(),
  url: z.string().optional(),
  key: z.string().optional(),
  label: z.string().optional(),
});

/**
 * CatalogueItemSchema — the boundary parser. Annotated `z.ZodType<CatalogueItem>`
 * so (a) isolatedDeclarations can emit it and (b) tsc fails the build if any
 * field's output shape drifts from the interface above.
 *
 * Field-level rules (vocabularies, level range) live in the per-field schemas;
 * cross-field §4 CHECKs live in the `.superRefine` below. Each refinement
 * failure carries `message = <CHECK name>` so the boundary error names the
 * exact constraint that was violated.
 *
 * Transforms run on input, so `genre`/`tags`/`skill`/`instruments` are stored
 * lowercase regardless of how the curator or ingest path cased them.
 */
export const CatalogueItemSchema: z.ZodType<CatalogueItem> = z
  .object({
    // text id; brand at the boundary via the helper. No format check yet (YAGNI).
    id: z.string().transform((s): CatalogueItemId => toCatalogueItemId(s)),
    type: z.enum(['song', 'lesson']), // ci_type
    title: z.string(),
    level: z.number().int().min(1).max(10).nullable(), // ci_level (null OR int 1..10)
    artist: z.string().nullable(),
    bpm: z.number().nullable(),
    timeSig: z.string().nullable(),
    genre: z
      .string()
      .nullable()
      .transform((s) => (s == null ? null : lower(s))), // normalize
    musicalKey: z.string().nullable(),
    instruments: z.array(z.string()).transform(lowerAll), // normalize
    skill: z.array(z.string()).transform(lowerAll), // normalize
    tags: z.array(z.string()).transform(lowerAll), // normalize
    lessonType: z.string().nullable(),
    sortOrder: z.number().nullable(),
    source: z.enum(['curated', 'user-upload']), // ci_source
    license: z.enum(['royalty-free', 'cc', 'owned', 'public-domain']).nullable(), // license vocab
    coverImageKey: z.string().nullable(),
    notationKey: z.string().nullable(),
    notationFormat: notationFormatField, // ci_song_fmt (null OR no-mid vocab)
    notationChecksum: z.string().nullable(),
    notationBytes: z.number().nullable(),
    hasAudio: z.boolean(),
    hasVideo: z.boolean(),
    audio: z.array(mediaLinkSchema).nullable(),
    video: z.array(mediaLinkSchema).nullable(),
    status: z.enum(['draft', 'published', 'archived']), // ci_status
    data: z.record(z.string(), z.unknown()).nullable(), // freeform passthrough
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((val, ctx) => {
    // ci_song_bpm: a song must declare a bpm.
    if (val.type === 'song' && val.bpm == null) {
      ctx.addIssue({ code: 'custom', message: 'ci_song_bpm', path: ['bpm'] });
    }
    // ci_song_file: a song must reference its notation file.
    if (val.type === 'song' && val.notationKey == null) {
      ctx.addIssue({ code: 'custom', message: 'ci_song_file', path: ['notationKey'] });
    }
    // ci_lesson_type_only: lessonType belongs to lessons; a song must not set it.
    if (val.type === 'song' && val.lessonType != null) {
      ctx.addIssue({
        code: 'custom',
        message: 'ci_lesson_type_only',
        path: ['lessonType'],
      });
    }
    // NOTE — out of scope here (handled in publishGates.ts, U2.6):
    //   ci_shared_curated (published ⟹ curated)
    //   ci_pub_license    (published curated ⟹ license != null)
    // Those are publish-conditional gates, not entity invariants.
  });
