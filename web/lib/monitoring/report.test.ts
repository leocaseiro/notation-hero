import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Report from './report';
import type * as Sentry from '@sentry/nextjs';

// report.ts keeps the instruments tag's state for the whole tab, so each case starts from a fresh
// copy of it. vi.resetModules() does not renew the stand-in SDK from web/vitest.setup.ts — Vitest
// keeps a mocked module across it — so the calls its two mocks recorded are cleared by hand.
let report: typeof Report;
let sentry: typeof Sentry;
beforeEach(async () => {
  vi.resetModules();
  report = await import('./report');
  sentry = await import('@sentry/nextjs');
  vi.mocked(sentry.captureException).mockClear();
  vi.mocked(sentry.addBreadcrumb).mockClear();
});

const captured = () => vi.mocked(sentry.captureException).mock.calls;

/** A code's meaning, read from docs/reference/error-codes.md itself, so the two cannot drift. */
const meaningOf = (code: string): string => {
  const page = readFileSync(path.join(process.cwd(), '../docs/reference/error-codes.md'), 'utf8');
  const row = page.split('\n').find((line) => line.startsWith(`| ${code} |`));
  if (row === undefined) throw new Error(`${code} has no row in docs/reference/error-codes.md`);
  return row.split('|')[2].trim();
};

describe('reportError', () => {
  it('sends an error, handled, with no tags, by default', () => {
    const error = new Error('x');
    report.reportError(error);
    expect(captured()).toEqual([[error, { captureContext: { level: 'error', tags: {} } }]]);
  });

  it('tags the code and sets the level', () => {
    const error = new Error('x');
    report.reportError(error, { code: 'E602', level: 'warning' });
    expect(captured()).toEqual([
      [error, { captureContext: { level: 'warning', tags: { code: 'E602' } } }],
    ]);
  });

  it('marks a report unhandled only when asked', () => {
    const error = new Error('x');
    report.reportError(error, { code: 'E901', handled: false });
    expect(captured()).toEqual([
      [
        error,
        {
          mechanism: { handled: false },
          captureContext: { level: 'error', tags: { code: 'E901' } },
        },
      ],
    ]);
  });

  it("sends the file's type and its rounded size, never its name", () => {
    report.reportError(new Error('x'), { code: 'E103', file: { type: 'gp5', bytes: 31 } });
    const [[, hint]] = captured();
    expect(hint).toEqual({
      captureContext: {
        level: 'error',
        tags: { code: 'E103', file_type: 'gp5' },
        contexts: { file: { type: 'gp5', bytes: 32 } },
      },
    });
  });

  it('rounds the size up to a power of two, so an exact size cannot point at one file', () => {
    for (const bytes of [0, 1, 5, 32, 48_213]) {
      report.reportError(new Error('x'), { file: { type: 'gp5', bytes } });
    }
    expect(captured().map(([, hint]) => hint)).toEqual(
      [0, 1, 8, 32, 65_536].map((bytes) => ({
        captureContext: {
          level: 'error',
          tags: { file_type: 'gp5' },
          contexts: { file: { type: 'gp5', bytes } },
        },
      })),
    );
  });

  for (const code of ['E101', 'E102', 'E103'] as const) {
    it(`${code} sends its fixed sentence in place of the message, keeping the type and frames`, () => {
      const original = new TypeError(String.raw`Unexpected token on line 3: \title "Night Drive"`, {
        cause: new Error('Night Drive'),
      });
      report.reportError(original, { code, level: 'warning' });
      const [[sent]] = captured();
      expect(sent).toBeInstanceOf(Error);
      expect(sent).not.toBe(original);
      const error = sent as Error;
      expect(error.message).toBe(`${code}: ${meaningOf(code)}`);
      expect(error.name).toBe('TypeError');
      expect(error.cause).toBeUndefined();
      expect(error.stack).not.toContain('Night Drive');
      expect(error.stack).toContain('report.test.ts');
    });
  }

  it('sends only the fixed sentence when E103 arrives as text', () => {
    report.reportError(String.raw`Unexpected token: \title "Night Drive"`, { code: 'E103' });
    const [[sent]] = captured();
    expect((sent as Error).message).toBe(`E103: ${meaningOf('E103')}`);
  });

  it("keeps every other code's message", () => {
    const error = new Error('Soundfont is not a valid Soundfont2 file');
    report.reportError(error, { code: 'E202', handled: false });
    expect(captured()[0]?.[0]).toBe(error);
  });

  it('E105 keeps its message: it describes our bug, not the file', () => {
    const bug = new Error("Cannot read properties of undefined (reading 'tracks')");
    report.reportError(bug, { code: 'E105', file: { type: 'gp', bytes: 5 } });
    expect(captured()[0]?.[0]).toBe(bug);
  });

  it('sends E202 its meaning when AlphaTab gives it no message at all', () => {
    // eslint-disable-next-line unicorn/error-message -- the input under test: AlphaTab reports a SoundFont network failure with exactly this empty message
    report.reportError(new Error(''), { code: 'E202', handled: false });
    const [[sent, hint]] = captured();
    expect((sent as Error).message).toBe(`E202: ${meaningOf('E202')}`);
    expect(hint).toEqual({
      mechanism: { handled: false },
      captureContext: { level: 'error', tags: { code: 'E202' } },
    });
  });
});

describe('noteError', () => {
  it("leaves a breadcrumb naming the error's type, never its message, and sends nothing", () => {
    report.noteError(
      new DOMException('The operation is insecure.', 'SecurityError'),
      'Player settings could not be read from storage',
    );
    expect(vi.mocked(sentry.addBreadcrumb).mock.calls).toEqual([
      [
        {
          category: 'notation-hero',
          level: 'warning',
          message: 'Player settings could not be read from storage',
          data: { error: 'SecurityError' },
        },
      ],
    ]);
    expect(captured()).toEqual([]);
  });
});

describe('isStorageRefusal', () => {
  it('counts blocked storage and a full quota as refused', () => {
    expect(report.isStorageRefusal(new DOMException('blocked', 'SecurityError'))).toBe(true);
    expect(report.isStorageRefusal(new DOMException('full', 'QuotaExceededError'))).toBe(true);
    expect(report.isStorageRefusal(new DOMException('full', 'NS_ERROR_DOM_QUOTA_REACHED'))).toBe(
      true,
    );
  });

  it('does not count a bug of ours, or anything without a name', () => {
    expect(report.isStorageRefusal(new TypeError('x is not a function'))).toBe(false);
    expect(report.isStorageRefusal(new Error('SecurityError'))).toBe(false);
    expect(report.isStorageRefusal('SecurityError')).toBe(false);
    expect(report.isStorageRefusal(null)).toBe(false);
    expect(report.isStorageRefusal({})).toBe(false);
  });
});

/** A track that is not percussion, on General MIDI `program`. */
const track = (program: number) => ({ program, isPercussion: false });

describe('instrumentsValue', () => {
  const kit = { program: 0, isPercussion: true };

  it('names drums first, then each program in three digits, ascending', () => {
    expect(report.instrumentsValue([kit, track(30)])).toBe('drums,030');
    expect(report.instrumentsValue([track(30), track(5), kit])).toBe('drums,005,030');
    expect(report.instrumentsValue([track(5)])).toBe('005');
  });

  it('lists each kind once', () => {
    expect(report.instrumentsValue([track(30), track(30), kit, kit])).toBe('drums,030');
  });
});

/** The instruments tag a report captured on `pathname` would carry right now. */
const tagOn = (pathname: string): unknown => {
  // Vitest's jsdom page is `/`.
  history.replaceState(null, '', pathname);
  const event: Sentry.Event = {};
  report.addInstrumentsTag(event);
  return event.tags?.instruments;
};

describe('the instruments tag, as Sentry reads it at capture time', () => {
  it('carries no tag before the player has set one', () => {
    expect(tagOn('/play')).toBeUndefined();
  });

  it('carries the value on /play, and never on /', () => {
    report.tagInstruments('drums,030');
    expect(tagOn('/play')).toBe('drums,030');
    expect(tagOn('/')).toBeUndefined();
  });

  it('is off while an open runs, and back when it ends', () => {
    report.tagInstruments('drums,030');
    report.suspendInstruments();
    expect(tagOn('/play')).toBeUndefined();
    report.restoreInstruments();
    expect(tagOn('/play')).toBe('drums,030');
  });

  it('keeps a value set during an open until the open ends', () => {
    report.tagInstruments('sample');
    report.suspendInstruments();
    report.tagInstruments('025');
    expect(tagOn('/play')).toBeUndefined();
    report.restoreInstruments();
    expect(tagOn('/play')).toBe('025');
  });

  it('comes back only when the last of two opens ends', () => {
    report.tagInstruments('sample');
    report.suspendInstruments();
    report.suspendInstruments();
    report.restoreInstruments();
    expect(tagOn('/play')).toBeUndefined();
    report.restoreInstruments();
    expect(tagOn('/play')).toBe('sample');
  });

  it('never counts below zero', () => {
    report.tagInstruments('sample');
    report.restoreInstruments();
    report.restoreInstruments();
    report.suspendInstruments();
    expect(tagOn('/play')).toBeUndefined();
  });

  it('adds no empty value', () => {
    report.tagInstruments('');
    expect(tagOn('/play')).toBeUndefined();
  });

  it("keeps an event's own tags, and leaves events other than errors alone", () => {
    report.tagInstruments('drums,030');
    history.replaceState(null, '', '/play');
    const tagged: Sentry.Event = { tags: { code: 'E103' } };
    report.addInstrumentsTag(tagged);
    expect(tagged.tags).toEqual({ code: 'E103', instruments: 'drums,030' });
    const other: Sentry.Event = { type: 'transaction' };
    report.addInstrumentsTag(other);
    expect(other.tags).toBeUndefined();
  });
});
