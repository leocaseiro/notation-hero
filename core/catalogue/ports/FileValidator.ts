import type { Result } from '../../shared/kernel/Result.ts';
import type { DetectedFormat } from '../FileRules.ts';
import type {
  InvalidFileFormat,
  MidiNotSupported,
  ValidationError,
} from '../errors.ts';

/**
 * FileValidator — the streaming-I/O PORT that wraps the pure `FileRules`
 * magic-byte decision tree with real I/O and the §8 size ceiling. U4's adapter
 * reads the leading bytes off the stream to classify via `detectFormat`, while
 * enforcing `maxBytes` (aborting the stream once exceeded — spec §8). Core
 * stays platform-neutral, so the source is a web `ReadableStream<Uint8Array>`
 * (a global in Node 24 + browsers), NOT a Node `Buffer`/`Readable`.
 *
 * The error arm reuses the pure rule's errors (`InvalidFileFormat`,
 * `MidiNotSupported`) plus `ValidationError` for the I/O-side failure the pure
 * rule can't express — namely exceeding `maxBytes`. Types-only; no I/O in core.
 */
export interface FileValidator {
  validate(
    source: ReadableStream<Uint8Array>,
    maxBytes: number,
  ): Promise<Result<DetectedFormat, InvalidFileFormat | MidiNotSupported | ValidationError>>;
}
