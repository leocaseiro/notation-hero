import type { Result } from '../shared/kernel/Result.ts';
import { ok, err } from '../shared/kernel/Result.ts';
import type { NotationFormat, CoverFormat } from './NotationFormat.ts';
import type { InvalidFileFormat, MidiNotSupported } from './errors.ts';
import { invalidFileFormat, midiNotSupported } from './errors.ts';

/**
 * FileRules — a PURE magic-byte → format decision over bytes already in memory.
 * No S3, no fs, no streams: it inspects the leading slice of a file and returns
 * a {@link Result}, never throwing (short/empty input fails as a value). In U4 a
 * runtime adapter wraps this with streaming I/O and the byte ceiling below; this
 * module stays platform-neutral, so the parameter is a `Uint8Array` (a Node
 * `Buffer` IS a `Uint8Array` at runtime, so the adapter can pass one directly).
 *
 * The decision tree (spec §10.5 / build plan) is ordered — FIRST MATCH WINS:
 *   1. PK\x03\x04        → notation 'gp'  (GP7/8 zip container)
 *   2. BCFS | BCFZ       → notation 'gpx' (GP6 BlueCent: uncompressed | compressed)
 *   3. "FICHIER GUITAR PRO vN" → notation 'gp3'|'gp4'|'gp5' (Pascal version header)
 *   4. <?xml (opt UTF-8 BOM)  → notation 'xml' (MusicXML)
 *   5. MThd              → err(MidiNotSupported)  — recognised but not renderable
 *   6. \xFF\xD8\xFF      → cover 'jpg'
 *   7. \x89PNG           → cover 'png'
 *   8. RIFF....WEBP      → cover 'webp'
 *   9. anything else / too short → err(InvalidFileFormat)
 */

/**
 * Byte ceiling for an uploaded notation source — 20 MB. ENFORCED by the U4
 * streaming adapter (it aborts the stream past this many bytes); the constant
 * lives here so the rule and its limit are co-located. `detectFormat` itself
 * only ever reads a tiny leading slice, so it does not check this.
 */
export const SOURCE_MAX_BYTES: number = 20_000_000;

/** A successful classification: either a notation source or a cover image. */
export type DetectedFormat =
  | { readonly kind: 'notation'; readonly format: NotationFormat }
  | { readonly kind: 'cover'; readonly format: CoverFormat };

// --- signature bytes (named so the decision tree below reads as a table) -----

const PK_ZIP: readonly number[] = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
const BCFS: readonly number[] = [0x42, 0x43, 0x46, 0x53]; // "BCFS"
const BCFZ: readonly number[] = [0x42, 0x43, 0x46, 0x5a]; // "BCFZ"
const XML_DECL: readonly number[] = [0x3c, 0x3f, 0x78, 0x6d, 0x6c]; // "<?xml"
const UTF8_BOM: readonly number[] = [0xef, 0xbb, 0xbf];
const MIDI: readonly number[] = [0x4d, 0x54, 0x68, 0x64]; // "MThd"
const JPEG_SOI: readonly number[] = [0xff, 0xd8, 0xff]; // JPEG start-of-image
const PNG_SIG: readonly number[] = [0x89, 0x50, 0x4e, 0x47]; // "\x89PNG"
const RIFF: readonly number[] = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP: readonly number[] = [0x57, 0x45, 0x42, 0x50]; // "WEBP" (fourcc at offset 8)

/** ASCII bytes of the GP3/4/5 Pascal-string version run, sans the digit. */
const FICHIER_RUN: readonly number[] = [
  0x46, 0x49, 0x43, 0x48, 0x49, 0x45, 0x52, 0x20, // "FICHIER "
  0x47, 0x55, 0x49, 0x54, 0x41, 0x52, 0x20, // "GUITAR "
  0x50, 0x52, 0x4f, 0x20, 0x76, // "PRO v"
];

/**
 * Bytes to scan when hunting the (length-prefixed) GP3/4/5 version run. 40 is
 * generous headroom: the run sits at offset 1 (1-byte Pascal prefix) and spans
 * ~22 bytes ("FICHIER GUITAR PRO v"), so 40 covers it comfortably.
 */
const FICHIER_SCAN_WINDOW: number = 40;

/** True if `sig` matches `head` byte-for-byte starting at `offset`. */
const matchesAt = (head: Uint8Array, sig: readonly number[], offset: number): boolean => {
  if (head.length < offset + sig.length) {
    return false;
  }
  for (let i = 0; i < sig.length; i++) {
    if (head[offset + i] !== sig[i]) {
      return false;
    }
  }
  return true;
};

/**
 * Find the GP version digit ('3'|'4'|'5') by scanning the first
 * {@link FICHIER_SCAN_WINDOW} bytes for the "FICHIER GUITAR PRO v" run and
 * reading the byte that follows it. The run is preceded by a 1-byte Pascal
 * length prefix, so it does not sit at offset 0 — a substring scan handles that
 * without parsing the length. Returns the matching `NotationFormat`, or null.
 */
const detectGuitarProVersion = (head: Uint8Array): NotationFormat | null => {
  const lastStart = Math.min(head.length, FICHIER_SCAN_WINDOW) - FICHIER_RUN.length - 1;
  for (let start = 0; start <= lastStart; start++) {
    if (matchesAt(head, FICHIER_RUN, start)) {
      const digit = head[start + FICHIER_RUN.length]; // the byte after "...PRO v"
      if (digit === 0x33) return 'gp3'; // '3'
      if (digit === 0x34) return 'gp4'; // '4'
      if (digit === 0x35) return 'gp5'; // '5'
      return null; // recognised header but an unsupported version digit
    }
  }
  return null;
};

/**
 * Inspect the leading bytes of a file and classify it as a notation source or a
 * cover image. Returns `err(MidiNotSupported)` for MIDI (a real but
 * non-renderable format) and `err(InvalidFileFormat)` for anything unrecognised
 * or too short. Pure and total — never throws.
 */
export const detectFormat = (
  head: Uint8Array,
): Result<DetectedFormat, InvalidFileFormat | MidiNotSupported> => {
  // 1. GP7/8 zip container.
  if (matchesAt(head, PK_ZIP, 0)) {
    return ok({ kind: 'notation', format: 'gp' });
  }

  // 2. GP6 BlueCent container — accept BOTH the uncompressed (BCFS) and
  //    compressed (BCFZ) magics (spec §10.5 says BCFS, build plan says BCFZ;
  //    both are real GP6 signatures).
  if (matchesAt(head, BCFS, 0) || matchesAt(head, BCFZ, 0)) {
    return ok({ kind: 'notation', format: 'gpx' });
  }

  // 3. GP3/4/5 Pascal-string version header (does not sit at offset 0).
  const gpVersion = detectGuitarProVersion(head);
  if (gpVersion !== null) {
    return ok({ kind: 'notation', format: gpVersion });
  }

  // 4. MusicXML — "<?xml", optionally preceded by a UTF-8 BOM.
  if (matchesAt(head, XML_DECL, 0) || matchesAt(head, [...UTF8_BOM, ...XML_DECL], 0)) {
    return ok({ kind: 'notation', format: 'xml' });
  }

  // 5. MIDI — recognised, but not renderable; a DISTINCT, actionable error.
  if (matchesAt(head, MIDI, 0)) {
    return err(midiNotSupported('midi-not-renderable-convert-first'));
  }

  // 6. JPEG cover.
  if (matchesAt(head, JPEG_SOI, 0)) {
    return ok({ kind: 'cover', format: 'jpg' });
  }

  // 7. PNG cover.
  if (matchesAt(head, PNG_SIG, 0)) {
    return ok({ kind: 'cover', format: 'png' });
  }

  // 8. WebP cover — RIFF at offset 0 AND the WEBP fourcc at offset 8 (the four
  //    bytes between are the little-endian RIFF chunk size).
  if (matchesAt(head, RIFF, 0) && matchesAt(head, WEBP, 8)) {
    return ok({ kind: 'cover', format: 'webp' });
  }

  // 9. Unrecognised or too short.
  return err(invalidFileFormat('unrecognised-magic-bytes'));
};
