/**
 * The error number for every failure the player shows. The number goes at the end of the message, so
 * a report can name the exact case. Spec §4's failure table lists the same numbers: change both
 * together, and never reuse a retired number.
 *
 * 1xx — opening a file · 2xx — the engine and its assets · 3xx — the stored settings ·
 * 4xx — exporting a file · 9xx — an unexpected crash.
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
  /**
   * The engine was not there when a file was opened — the same import failure as E201, but met
   * while OPENING rather than on load. Separate from E201 on purpose: the cause is shared, the
   * trigger is not, and a report that cannot tell them apart cannot tell "the player never
   * started" from "a file was opened too early".
   */
  engineUnavailableOnOpen: 'E205',
  /**
   * Individual stored settings held values the player could not use, and those keys alone were
   * repaired — a clamped number lands on its nearest bound, not its default, and every other
   * setting is untouched.
   */
  settingsRepaired: 'E301',
  /**
   * The stored settings document could not be read AT ALL — unparseable, or the wrong shape — so
   * everything fell back to the defaults. Separate from E301 for the same reason E205 is separate
   * from E201: one key corrected is not the same event as every setting lost, and a report that
   * merges them cannot tell a typo from a wipe.
   */
  settingsUnreadable: 'E303',
  /** The engine refused a value that was typed, so it was neither applied nor saved. */
  settingRejected: 'E302',
  /** An export failed — building the bytes, the blob, or the download URL. */
  exportFailed: 'E401',
  /** A render crash caught by an error boundary. */
  unexpectedCrash: 'E901',
} as const;
