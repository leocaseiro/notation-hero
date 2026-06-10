import type { Result } from '../../shared/kernel/Result.ts';
import type { Pattern } from '../Pattern.ts';
import type { PatternId } from '../ids.ts';
import type {
  ItemAlreadyExists,
  ItemNotFound,
  RepositoryError,
} from '../errors.ts';

/**
 * PatternRepository — the persistence PORT for reusable patterns (beats, fills,
 * rudiments). U4's `adapters/postgres` implements it against Neon; core declares
 * only the contract.
 *
 * v1 ships the pattern tables + the READ path (the authoring UI is deferred to
 * H-11), and patterns are SEEDED by the v1 migration — so the write methods
 * (`savePattern`/`updatePattern`) exist for that seed/admin path but stay
 * minimal. No speculative methods (no delete, no link — linking lives on
 * `CatalogueRepository` via `linkPattern`). Types-only; no logic in core.
 */
export interface PatternRepository {
  findPatternById(
    id: PatternId,
  ): Promise<Result<Pattern, ItemNotFound | RepositoryError>>;
  // `kind` is the OPEN-vocab pattern facet ('beat'|'fill'|'rudiment'|…); omit to list all.
  listPatterns(kind?: string): Promise<Result<Pattern[], RepositoryError>>;
  savePattern(
    pattern: Pattern,
  ): Promise<Result<void, ItemAlreadyExists | RepositoryError>>;
  updatePattern(
    pattern: Pattern,
  ): Promise<Result<void, ItemNotFound | RepositoryError>>;
}
