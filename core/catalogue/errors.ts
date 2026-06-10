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
 *   U2.6 (this task) adds: PublishGateFailed
 *   U2.7 adds: ItemNotFound, ItemAlreadyExists, StaleUpdate,
 *              SourceNotAvailable, ValidationError, RepositoryError
 * A union of all members (`CatalogueError`) is intentionally NOT declared yet;
 * each task adds its members and the union lands once the set is complete, so
 * we don't churn a half-finished union on every task.
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
