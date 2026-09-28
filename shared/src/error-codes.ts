// The error number for every failure a person or an operator can see. The number goes at the end of
// the message, so a report can name the exact case.
//
// Ranges, one area each — a number is never reused, in any range:
//   1xx  opening a file (player)        4xx  exporting a file (player)
//   2xx  engine and its assets          5xx  server and infrastructure
//   3xx  catalog and API (client)       6xx  the stored settings (player)
//   9xx  an unexpected crash
//
// `docs/reference/error-codes.md` lists the same numbers. Change the code and that page together,
// and never reuse a retired number — `tooling/check-error-codes.mjs` fails the build on either.
// Retiring a number means moving it to RETIRED_ERROR_CODES below and marking its row retired on
// that page; the number stays spent forever.

export const ERROR = {
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

  /** The catalog API answered, but not with a success status. */
  catalogResponseNotOk: 'E301',
  /** The catalog request passed its eight-second deadline without answering. */
  catalogTimedOut: 'E302',
  /** The catalog request never reached the network. */
  catalogUnreachable: 'E303',

  /** An export failed — building the bytes, the blob, or the download URL. */
  exportFailed: 'E401',

  /** The API failed to start, so no request of any kind could be served. */
  serverBootFailed: 'E501',
  /** The API was running and this request failed inside it. */
  serverRequestFailed: 'E502',

  /**
   * Individual stored settings held values the player could not use, and those keys alone were
   * repaired — a clamped number lands on its nearest bound, not its default, and every other
   * setting is untouched.
   */
  settingsRepaired: 'E601',
  /** The engine refused a value that was typed, so it was neither applied nor saved. */
  settingRejected: 'E602',
  /**
   * The stored settings document could not be read AT ALL — unparseable, or the wrong shape — so
   * everything fell back to the defaults. Separate from E601 for the same reason E205 is separate
   * from E201: one key corrected is not the same event as every setting lost, and a report that
   * merges them cannot tell a typo from a wipe.
   */
  settingsUnreadable: 'E603',

  /** A render crash caught by an error boundary. */
  unexpectedCrash: 'E901',
} as const;

/**
 * Numbers that were once live and must never be handed to a new meaning. Empty today: nothing has
 * been retired yet. The gate reads this list plus the live codes above, and compares the pair
 * against the merge base — so removing a code from both the registry and the reference page in one
 * commit fails rather than quietly freeing the number.
 */
export const RETIRED_ERROR_CODES: readonly string[] = [];

export type ErrorCode = (typeof ERROR)[keyof typeof ERROR];
