import type { Result } from '../../shared/kernel/Result.ts';
import type { CatalogueItem, ItemStatus, ItemType } from '../CatalogueItem.ts';
import type { Exercise } from '../Exercise.ts';
import type { Pattern } from '../Pattern.ts';
import type { CatalogueItemId, PatternId } from '../ids.ts';
import type { CatalogueFilter } from '../CatalogueFilter.ts';
import type {
  ItemAlreadyExists,
  ItemNotFound,
  RepositoryError,
  StaleUpdate,
} from '../errors.ts';

/**
 * CatalogueRepository — the catalogue's persistence PORT (a driven port in the
 * hexagon). U4's `adapters/postgres` implements it against Neon; core declares
 * only the contract. Every method returns a `Result<T, E>` where `E` is the
 * SUBSET of catalogue errors that operation can produce — never throwing — so
 * callers handle failure as a value.
 *
 * Concurrency: `updateItem` takes the caller's `updatedAt` as an If-Match token
 * (`ifUnmodifiedSince`); a token mismatch returns `StaleUpdate`. Lifecycle:
 * `archive` flips status to 'archived' (a tombstone) and NEVER hard-deletes
 * (spec §12). This file is types-only — no runtime logic lives in core.
 */

/**
 * The §9 / K-3 list projection — a lean read row for the public list/search
 * grid, NOT the full `CatalogueItem`. The cover key is still RAW here
 * (`coverImageKey`); K-3 resolves it to a signed `cover_image_url` downstream,
 * so this port deliberately stops at the stored key.
 */
export interface CatalogueListRow {
  id: CatalogueItemId;
  type: ItemType;
  title: string;
  artist: string | null;
  genre: string | null;
  level: number | null;
  bpm: number | null;
  timeSig: string | null;
  instruments: string[];
  hasAudio: boolean;
  hasVideo: boolean;
  sortOrder: number | null;
  coverImageKey: string | null;
  status: ItemStatus;
  updatedAt: string;
}

export interface CatalogueRepository {
  saveItem(item: CatalogueItem): Promise<Result<void, ItemAlreadyExists | RepositoryError>>;
  updateItem(
    item: CatalogueItem,
    ifUnmodifiedSince: string,
  ): Promise<Result<CatalogueItem, ItemNotFound | StaleUpdate | RepositoryError>>;
  findById(
    id: CatalogueItemId,
  ): Promise<Result<CatalogueItem, ItemNotFound | RepositoryError>>;
  list(
    filter: CatalogueFilter,
  ): Promise<Result<{ items: CatalogueListRow[]; total: number }, RepositoryError>>;
  // status='archived' tombstone — NEVER hard-delete (spec §12)
  archive(id: CatalogueItemId): Promise<Result<void, ItemNotFound | RepositoryError>>;
  listExercises(lessonId: CatalogueItemId): Promise<Result<Exercise[], RepositoryError>>;
  // atomic batch (reorder/upsert)
  replaceExercises(
    lessonId: CatalogueItemId,
    steps: Exercise[],
  ): Promise<Result<void, ItemNotFound | RepositoryError>>;
  // publish gate §5
  countExercises(lessonId: CatalogueItemId): Promise<Result<number, RepositoryError>>;
  // archive-confirm warning ("N lessons slice this song")
  countSlicingLessons(songId: CatalogueItemId): Promise<Result<number, RepositoryError>>;
  linkPattern(itemId: CatalogueItemId, patternId: PatternId): Promise<Result<void, RepositoryError>>;
  unlinkPattern(
    itemId: CatalogueItemId,
    patternId: PatternId,
  ): Promise<Result<void, RepositoryError>>;
  listPatternsForItem(itemId: CatalogueItemId): Promise<Result<Pattern[], RepositoryError>>;
}
