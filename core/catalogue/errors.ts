/**
 * Catalogue domain errors — the failure arm of every `Result<T, E>` the
 * catalogue produces. Each error is a discriminated union member keyed on a
 * `kind` string literal so callers can `switch (e.kind)` and the admin UI can
 * map each kind to a tailored message (e.g. "convert MIDI first" vs "invalid
 * file"). Every member is a flat readonly shape: the `kind` discriminant plus
 * relevant readonly fields; an optional `detail` carries a short machine/human
 * hint string.
 *
 * This file is APPENDED to as the domain grows — keep the shape consistent:
 *   U2.5: InvalidFileFormat, MidiNotSupported
 *   U2.6: PublishGateFailed
 *   U2.7 (this task) adds: ItemNotFound, ItemAlreadyExists, StaleUpdate,
 *              SourceNotAvailable, ValidationError, RepositoryError
 * The set is now COMPLETE, so the `CatalogueError` union of every member lands
 * at the foot of this file — it is the failure arm the ports type their
 * `Result<T, E>` against (each port narrows to the subset it can actually
 * produce).
 */

/**
 * The bytes did not match any known notation- or cover-image signature (or the
 * input was too short to classify). The admin UI should ask for a supported
 * file. `detail` may carry a short hint about what was seen.
 */
export interface InvalidFileFormat {
  readonly kind: 'InvalidFileFormat';
  readonly detail?: string;
}

/**
 * The bytes are a Standard MIDI File (`MThd`). MIDI is a DISTINCT error from
 * garbage: it is a real, recognised format but not renderable in v1 (spec §2 /
 * RC-5), so the curator must convert it to Guitar Pro first. Surfacing this
 * separately lets the admin UI say "convert first" instead of "invalid file".
 */
export interface MidiNotSupported {
  readonly kind: 'MidiNotSupported';
  readonly detail?: string;
}

/**
 * One or more §5 publish gates blocked a publish attempt. `failures` carries
 * EVERY failed gate code (e.g. `lesson-needs-at-least-one-exercise`,
 * `curated-item-needs-license`) so the curator sees all blockers at once rather
 * than fixing one only to hit the next. The codes are stable strings the admin
 * UI maps to per-gate guidance. Always non-empty when this error is produced.
 */
export interface PublishGateFailed {
  readonly kind: 'PublishGateFailed';
  readonly failures: readonly string[];
}

/** Construct an `InvalidFileFormat` error, optionally with a hint. */
export const invalidFileFormat = (detail?: string): InvalidFileFormat => ({
  kind: 'InvalidFileFormat',
  detail,
});

/** Construct a `MidiNotSupported` error, optionally with a hint. */
export const midiNotSupported = (detail?: string): MidiNotSupported => ({
  kind: 'MidiNotSupported',
  detail,
});

/** Construct a `PublishGateFailed` error carrying every failed gate code. */
export const publishGateFailed = (failures: readonly string[]): PublishGateFailed => ({
  kind: 'PublishGateFailed',
  failures,
});

// --- U2.7 members: repository / concurrency / boundary failures --------------

/**
 * No catalogue item exists for the given id. Produced by reads/updates/archives
 * that key off an id (`findById`, `updateItem`, `archive`, …). `id` is the raw
 * string (not the branded type) so this stays a plain serialisable value the
 * admin UI can echo back ("no item `song-foo`").
 */
export interface ItemNotFound {
  readonly kind: 'ItemNotFound';
  readonly id: string;
}

/**
 * An insert collided with an existing id — the slug/uuid is already taken.
 * Produced by `saveItem`/`savePattern` (a create, not an upsert). `id` is the
 * raw string of the conflicting key.
 */
export interface ItemAlreadyExists {
  readonly kind: 'ItemAlreadyExists';
  readonly id: string;
}

/**
 * An optimistic-concurrency (If-Match) mismatch: the caller's expected
 * `updatedAt` token no longer matches the row's current `updatedAt`, so someone
 * else wrote in between. `updatedAt` is the concurrency token per the spec.
 * Both timestamps are optional — the adapter fills what it knows so the UI can
 * say "you edited the 10:00 version, it's now 10:05".
 */
export interface StaleUpdate {
  readonly kind: 'StaleUpdate';
  readonly id: string;
  readonly expectedUpdatedAt?: string;
  readonly actualUpdatedAt?: string;
}

/**
 * A referenced source isn't available — e.g. a song-breakdown slice's source
 * song isn't published, or a stored file key is missing/unreadable. `detail`
 * carries a short hint about which source and why.
 */
export interface SourceNotAvailable {
  readonly kind: 'SourceNotAvailable';
  readonly detail?: string;
}

/**
 * A generic boundary-validation failure — wraps e.g. ZodError issue messages
 * into one flat domain error. `issues` is the (non-empty in practice) list of
 * human/machine-readable problem strings the admin UI can surface as a list.
 */
export interface ValidationError {
  readonly kind: 'ValidationError';
  readonly issues: readonly string[];
}

/**
 * An infrastructure/persistence failure — the store itself errored (connection
 * lost, constraint we don't model, S3 5xx, …). This is the catch-all for "the
 * domain rules were fine, the machinery broke"; `detail` carries a short hint.
 */
export interface RepositoryError {
  readonly kind: 'RepositoryError';
  readonly detail?: string;
}

/** Construct an `ItemNotFound` error for the given (raw) id. */
export const itemNotFound = (id: string): ItemNotFound => ({
  kind: 'ItemNotFound',
  id,
});

/** Construct an `ItemAlreadyExists` error for the given (raw) id. */
export const itemAlreadyExists = (id: string): ItemAlreadyExists => ({
  kind: 'ItemAlreadyExists',
  id,
});

/** Construct a `StaleUpdate` error, optionally carrying the two `updatedAt` tokens. */
export const staleUpdate = (
  id: string,
  expectedUpdatedAt?: string,
  actualUpdatedAt?: string,
): StaleUpdate => ({
  kind: 'StaleUpdate',
  id,
  expectedUpdatedAt,
  actualUpdatedAt,
});

/** Construct a `SourceNotAvailable` error, optionally with a hint. */
export const sourceNotAvailable = (detail?: string): SourceNotAvailable => ({
  kind: 'SourceNotAvailable',
  detail,
});

/** Construct a `ValidationError` wrapping a list of issue strings. */
export const validationError = (issues: readonly string[]): ValidationError => ({
  kind: 'ValidationError',
  issues,
});

/** Construct a `RepositoryError`, optionally with a hint. */
export const repositoryError = (detail?: string): RepositoryError => ({
  kind: 'RepositoryError',
  detail,
});

/**
 * CatalogueError — the union of EVERY catalogue domain error. The set is now
 * complete, so this lands here (deferred until now to avoid churning a
 * half-finished union per task). Ports type their `Result<T, E>` against the
 * SUBSET each can actually produce (e.g. `findById` → `ItemNotFound |
 * RepositoryError`), not this whole union; this exists for callers that want to
 * handle "any catalogue error" exhaustively via `switch (e.kind)`.
 */
export type CatalogueError =
  | InvalidFileFormat
  | MidiNotSupported
  | PublishGateFailed
  | ItemNotFound
  | ItemAlreadyExists
  | StaleUpdate
  | SourceNotAvailable
  | ValidationError
  | RepositoryError;
