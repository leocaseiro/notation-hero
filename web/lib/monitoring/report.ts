import { ERROR } from '@notation-hero/shared/error-codes';
import { addBreadcrumb, captureException } from '@sentry/nextjs';

import type { ErrorCode } from '@notation-hero/shared/error-codes';
import type { Event as SentryEvent } from '@sentry/nextjs'; // Sentry's Event, not the DOM's

/**
 * The one door to Sentry for the rest of web/; web/instrumentation-client.ts only starts it. Every
 * catch in web/ calls reportError or noteError, and a lint rule in web/eslint.config.mjs fails one
 * that calls neither.
 */

/** What a report may say about the visitor's file: what kind it is, never what it is called. */
type FileFacts = { readonly type: string; readonly bytes: number };

// E101–E103 send one of these in place of the exception's own message, which can quote text from
// inside the file. The code, then its meaning from docs/reference/error-codes.md (a test holds the
// two together), so an issue's title and its alert email say what failed.
const FIXED_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ERROR.fileTooLarge]: 'E101: Over the size limit; the file is never read.',
  [ERROR.fileUnreadable]:
    'E102: The browser could not read the file — moved, deleted or unmounted after it was picked.',
  [ERROR.notAScore]: 'E103: No AlphaTab importer accepts the bytes.',
};

// E202 keeps AlphaTab's own message, which is the useful part, except that a SoundFont network
// failure arrives with none, and an empty message titles the issue only "Error". In that one case
// the report sends E202's meaning, from the same reference page.
const SENTENCES_WHEN_EMPTY: Partial<Record<ErrorCode, string>> = {
  [ERROR.engineRuntime]:
    'E202: AlphaTab raised its own error event — in practice, the soundfont download.',
};

/** An error's `name`, read by shape: jsdom's DOMException, for one, is not an `Error`. */
function nameOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('name' in error)) return undefined;
  return typeof error.name === 'string' ? error.name : undefined;
}

/** An error's `message`, read by shape, as `nameOf` reads its name. */
function messageOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('message' in error)) return undefined;
  return typeof error.message === 'string' ? error.message : undefined;
}

/** The sentence a report sends in place of the error's own message, or undefined to keep it. */
function fixedSentence(code: ErrorCode | undefined, error: unknown): string | undefined {
  if (code === undefined) return undefined;
  return FIXED_MESSAGES[code] ?? (messageOf(error) === '' ? SENTENCES_WHEN_EMPTY[code] : undefined);
}

/**
 * The size a report sends: rounded up to a power of two, so the type and an exact size cannot
 * single out one widely shared file. It still tells an empty file, a tiny one and an ordinary one
 * apart; a file over the limit has its own code, E101.
 */
function roundedSize(bytes: number): number {
  if (bytes <= 0) return 0;
  let size = 1;
  while (size < bytes) size *= 2;
  return size;
}

/**
 * A fresh error carrying `sentence`, with the original's type and stack frames but none of its
 * text — and no `cause`, so no chained error can carry the file's text either.
 */
function withFixedMessage(error: unknown, sentence: string): Error {
  const sent = new Error(sentence);
  if (typeof error !== 'object' || error === null) return sent;
  const { name, message, stack } = error as { name?: unknown; message?: unknown; stack?: unknown };
  if (typeof name === 'string') sent.name = name;
  if (typeof stack === 'string') {
    // V8 writes "Name: message" above the frames; other engines write the frames alone.
    sent.stack =
      typeof message === 'string' && message !== '' ? stack.replace(message, sentence) : stack;
  }
  return sent;
}

/** An error or a warning: one event against the monthly quota. */
export function reportError(
  error: unknown,
  options: {
    readonly code?: ErrorCode;
    readonly level?: 'error' | 'warning';
    readonly file?: FileFacts;
    readonly handled?: false;
  } = {},
): void {
  const { code, level = 'error', file, handled } = options;
  const sentence = fixedSentence(code, error);
  const sent = sentence === undefined ? error : withFixedMessage(error, sentence);
  const tags: Record<string, string> = {};
  if (code !== undefined) tags.code = code;
  if (file !== undefined) tags.file_type = file.type;
  const captureContext = {
    level,
    tags,
    ...(file === undefined
      ? {}
      : { contexts: { file: { type: file.type, bytes: roundedSize(file.bytes) } } }),
  };
  // Only the error pages (E901) and the player failures E201–E204 and E206 pass `handled: false`.
  // It marks the visit unhandled, which is what the interim health number counts.
  if (handled === false) captureException(sent, { mechanism: { handled: false }, captureContext });
  else captureException(sent, { captureContext });
}

/** A breadcrumb: never sent alone; it travels inside the next real report. Costs no quota. */
export function noteError(error: unknown, what: string): void {
  addBreadcrumb({
    category: 'notation-hero',
    level: 'warning',
    message: what,
    // The error's type only. Its message is the browser's, but a breadcrumb never passes the names
    // filter, so it carries no text at all.
    data: { error: nameOf(error) ?? typeof error },
  });
}

const STORAGE_REFUSALS: ReadonlySet<string> = new Set([
  'SecurityError', // site data blocked: a private window, or a browser setting
  'QuotaExceededError',
  'NS_ERROR_DOM_QUOTA_REACHED', // Firefox's older name for a full quota
]);

/** Storage the browser refused: the visitor's environment, not our bug. */
export function isStorageRefusal(error: unknown): boolean {
  const name = nameOf(error);
  return name !== undefined && STORAGE_REFUSALS.has(name);
}

/**
 * The `instruments` value for these tracks: `drums` first, then each program in three digits. A
 * program outside General MIDI's 0-127 (a corrupt or crafted file can hold any number) is left out.
 */
export function instrumentsValue(
  tracks: readonly { program: number; isPercussion: boolean }[],
): string {
  const programs = [
    ...new Set(
      tracks
        .filter((track) => !track.isPercussion)
        .map((track) => track.program)
        .filter((program) => Number.isInteger(program) && program >= 0 && program <= 127),
    ),
  ].toSorted((a, b) => a - b);
  const drums = tracks.some((track) => track.isPercussion) ? ['drums'] : [];
  // Three digits, so a search for one program never matches another: 025 is not inside 125.
  return [...drums, ...programs.map((program) => String(program).padStart(3, '0'))].join(',');
}

// The value for the score on screen. Undefined until the player first mounts and sets `sample`.
let instruments: string | undefined;
// Opens still running. While any runs, no report carries the tag. An open that never settles — an
// engine import that hangs — keeps this above zero, so the tag stays off for the rest of the
// visit: never wrong, only absent.
let opensRunning = 0;

/** The `instruments` value for the score on screen: `sample` or `instrumentsValue()`. */
export function tagInstruments(value: string): void {
  instruments = value;
}

/** A file was picked or dropped: no report carries the tag until that open ends. */
export function suspendInstruments(): void {
  opensRunning += 1;
}

/** In a `finally`, when that open ends: reports carry the value for the score on screen again. */
export function restoreInstruments(): void {
  opensRunning = Math.max(0, opensRunning - 1);
}

/**
 * Sentry's `preprocessEvent` hook: tags a report captured on `/play` while no open runs. It runs
 * inside `captureException`, so it reads the page and the open count at the moment of the error.
 * `beforeSend` would read them only as the report leaves, which `@sentry/nextjs` delays under
 * `next dev`.
 */
export function addInstrumentsTag(event: SentryEvent): void {
  if (event.type !== undefined) return; // errors and warnings only
  if (!instruments || opensRunning > 0) return;
  if (globalThis.location.pathname !== '/play') return;
  event.tags = { ...event.tags, instruments };
}
