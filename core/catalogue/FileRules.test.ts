import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat, SOURCE_MAX_BYTES } from './FileRules.ts';

/**
 * Fixtures — minimal leading-byte slices that carry each format's magic
 * signature. `detectFormat` only inspects the head, so a short prefix is a
 * faithful stand-in for a real file (the U4 streaming adapter feeds it the
 * leading bytes already in memory). We build heads from raw byte arrays so the
 * exact signatures are visible in the test, not hidden behind a helper.
 *
 * `ascii` packs a Pascal-string GP3/4/5 header: a 1-byte length prefix, then
 * the "FICHIER GUITAR PRO vN.NN" version run. `withBom` prepends the UTF-8 BOM.
 */
const bytes = (...b: number[]): Uint8Array => new Uint8Array(b);

const ascii = (s: string): Uint8Array => {
  const body = new TextEncoder().encode(s);
  const out = new Uint8Array(body.length + 1);
  out[0] = body.length; // Pascal length prefix
  out.set(body, 1);
  return out;
};

const withBom = (rest: Uint8Array): Uint8Array => {
  const out = new Uint8Array(rest.length + 3);
  out.set([0xef, 0xbb, 0xbf], 0); // UTF-8 BOM
  out.set(rest, 3);
  return out;
};

/** Assert a notation result and return its format for further checks. */
const expectNotation = (head: Uint8Array): string => {
  const r = detectFormat(head);
  assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`);
  assert.equal(r.value.kind, 'notation');
  return r.value.format;
};

/** Assert a cover result and return its format. */
const expectCover = (head: Uint8Array): string => {
  const r = detectFormat(head);
  assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`);
  assert.equal(r.value.kind, 'cover');
  return r.value.format;
};

/** Assert a failure result and return the error kind. */
const expectErrKind = (head: Uint8Array): string => {
  const r = detectFormat(head);
  assert.equal(r.ok, false, `expected err, got ${JSON.stringify(r)}`);
  return r.error.kind;
};

describe('FileRules.detectFormat — magic-byte decision tree', () => {
  describe('notation formats', () => {
    test('PK zip container → gp (GP7/8)', () => {
      // PK\x03\x04 then arbitrary zip bytes
      assert.equal(expectNotation(bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00)), 'gp');
    });

    test('BCFS container → gpx (GP6 uncompressed)', () => {
      assert.equal(expectNotation(bytes(0x42, 0x43, 0x46, 0x53, 0x00, 0x00)), 'gpx');
    });

    test('BCFZ container → gpx (GP6 compressed)', () => {
      assert.equal(expectNotation(bytes(0x42, 0x43, 0x46, 0x5a, 0x00, 0x00)), 'gpx');
    });

    test('FICHIER GUITAR PRO v3.00 → gp3', () => {
      assert.equal(expectNotation(ascii('FICHIER GUITAR PRO v3.00')), 'gp3');
    });

    test('FICHIER GUITAR PRO v4.06 → gp4', () => {
      assert.equal(expectNotation(ascii('FICHIER GUITAR PRO v4.06')), 'gp4');
    });

    test('FICHIER GUITAR PRO v5.10 → gp5', () => {
      assert.equal(expectNotation(ascii('FICHIER GUITAR PRO v5.10')), 'gp5');
    });

    test('FICHIER GUITAR PRO v6.00 (recognised header, unsupported version) → InvalidFileFormat', () => {
      assert.equal(expectErrKind(ascii('FICHIER GUITAR PRO v6.00')), 'InvalidFileFormat');
    });

    test('<?xml → xml (MusicXML)', () => {
      assert.equal(expectNotation(bytes(0x3c, 0x3f, 0x78, 0x6d, 0x6c, 0x20)), 'xml');
    });

    test('UTF-8 BOM then <?xml → xml', () => {
      assert.equal(expectNotation(withBom(bytes(0x3c, 0x3f, 0x78, 0x6d, 0x6c))), 'xml');
    });
  });

  describe('cover formats', () => {
    test('JPEG SOI marker → jpg', () => {
      assert.equal(expectCover(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10)), 'jpg');
    });

    test('PNG signature → png', () => {
      assert.equal(expectCover(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a)), 'png');
    });

    test('RIFF…WEBP → webp', () => {
      // RIFF, 4 size bytes, WEBP
      assert.equal(
        expectCover(bytes(0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50)),
        'webp',
      );
    });
  });

  describe('MIDI — a distinct, actionable error', () => {
    test('MThd → MidiNotSupported (NOT InvalidFileFormat)', () => {
      assert.equal(expectErrKind(bytes(0x4d, 0x54, 0x68, 0x64, 0x00, 0x00)), 'MidiNotSupported');
    });

    test('MidiNotSupported carries a convert-first detail', () => {
      const r = detectFormat(bytes(0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06));
      assert.equal(r.ok, false);
      assert.equal(r.error.kind, 'MidiNotSupported');
      assert.ok(typeof r.error.detail === 'string' && r.error.detail.length > 0);
    });
  });

  describe('invalid / garbage / truncated input', () => {
    test('garbage bytes → InvalidFileFormat', () => {
      assert.equal(expectErrKind(bytes(0x00, 0x01, 0x02, 0x03, 0x04, 0x05)), 'InvalidFileFormat');
    });

    test('empty array → InvalidFileFormat (no throw)', () => {
      assert.equal(expectErrKind(bytes()), 'InvalidFileFormat');
    });

    test('3-byte array → InvalidFileFormat (no throw)', () => {
      assert.equal(expectErrKind(bytes(0x50, 0x4b, 0x03)), 'InvalidFileFormat');
    });

    test('RIFF header with no WEBP at offset 8 → InvalidFileFormat (no throw)', () => {
      // RIFF + size but truncated before the WEBP fourcc
      assert.equal(
        expectErrKind(bytes(0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00)),
        'InvalidFileFormat',
      );
    });

    test('RIFF with a non-WEBP fourcc (e.g. WAVE) → InvalidFileFormat', () => {
      // RIFF....WAVE — a real RIFF that is not a WebP
      assert.equal(
        expectErrKind(bytes(0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45)),
        'InvalidFileFormat',
      );
    });

    test('a lone UTF-8 BOM with no <?xml → InvalidFileFormat', () => {
      assert.equal(expectErrKind(bytes(0xef, 0xbb, 0xbf, 0x68, 0x69)), 'InvalidFileFormat');
    });
  });

  describe('returned DetectedFormat shape', () => {
    test('notation arm carries kind:"notation" + a NotationFormat', () => {
      const r = detectFormat(bytes(0x50, 0x4b, 0x03, 0x04));
      assert.equal(r.ok, true);
      assert.deepEqual(r.value, { kind: 'notation', format: 'gp' });
    });

    test('cover arm carries kind:"cover" + a CoverFormat', () => {
      const r = detectFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
      assert.equal(r.ok, true);
      assert.deepEqual(r.value, { kind: 'cover', format: 'png' });
    });
  });

  describe('SOURCE_MAX_BYTES constant', () => {
    test('is the locked 20 MB ceiling', () => {
      assert.equal(SOURCE_MAX_BYTES, 20_000_000);
    });
  });
});
