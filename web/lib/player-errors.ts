/**
 * The error number for every failure the player shows. The number goes at the end of the message, so
 * a report can name the exact case. Spec §4's failure table lists the same numbers: change both
 * together, and never reuse a retired number.
 *
 * 1xx — opening a file · 2xx — the engine and its assets · 9xx — an unexpected crash.
 */
export const PLAYER_ERROR = {
  /** Over the size limit; the file is never read. */
  fileTooLarge: 'E101',
  /** The browser could not read the file — moved, deleted or unmounted after it was picked. */
  fileUnreadable: 'E102',
  /** No AlphaTab importer accepts the bytes. */
  notAScore: 'E103',
  /** A cached or catalog score could not be loaded; the player falls back to the bundled beat. */
  cachedScoreUnavailable: 'E104',
  /** The self-hosted AlphaTab module failed to import. */
  engineImport: 'E201',
  /** AlphaTab raised its own error event — in practice, the soundfont download. */
  engineRuntime: 'E202',
  /** The music font download failed (`loadingerror` on `document.fonts`). */
  musicFontFailed: 'E203',
  /** The music font did not arrive within 60 seconds. */
  musicFontTimeout: 'E204',
  /** A render crash caught by an error boundary. */
  unexpectedCrash: 'E901',
} as const;
