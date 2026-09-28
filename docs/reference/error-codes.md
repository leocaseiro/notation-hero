# Error codes

Every failure a person or an operator can see ends with a number — `(Error E101)` — so a report can
name the exact case instead of describing it.

This page is the documented twin of [`shared/src/error-codes.ts`](../../shared/src/error-codes.ts).
`pnpm run check:error-codes` checks the two against each other, runs in CI, and fails when they
disagree — so neither can drift out of step with the other.

**A number is never reused.** Retiring one means adding it to `RETIRED_ERROR_CODES` in the registry
and moving its row to [Retired](#retired) below. The number stays spent forever, so an old report
quoting it never resolves to a different meaning than it had.

Ranges group codes by the surface that raises them; a new area takes the next free range — which is
how the stored settings came to sit at 6xx rather than beside the player's other codes: 3xx was
already the catalog's by the time they needed a home. This page
is app-wide on purpose. The v0 player spec keeps its own failure table for the player's behavior —
what the person sees, and where — and links here for the full list, so it stays inside its own scope
and can be archived later without breaking the gate.

## 1xx — opening a file

The player reading a file you picked or dropped, on `/play`. Each of these shows as a toast.

| Code | Meaning                                                                                   |
| ---- | ----------------------------------------------------------------------------------------- |
| E101 | Over the size limit; the file is never read.                                              |
| E102 | The browser could not read the file — moved, deleted or unmounted after it was picked.    |
| E103 | No AlphaTab importer accepts the bytes.                                                   |
| E104 | A cached or catalog score could not be loaded; the player falls back to the bundled beat. |

`E104` is reserved rather than live: the v0 player spec records it as unused in v0a, where the
bundled beat _is_ the score that loads. It keeps its number so the cached-score path can use it
without renumbering anything.

## 2xx — the engine and its assets

AlphaTab and the fonts it needs. These render as a message over the notation area rather than as a
toast, because unmounting the notation box while the engine is alive leaves AlphaTab drawing into a
detached node.

| Code | Meaning                                                                    |
| ---- | -------------------------------------------------------------------------- |
| E201 | The self-hosted AlphaTab module failed to import.                          |
| E202 | AlphaTab raised its own error event — in practice, the soundfont download. |
| E203 | The music font download failed (`loadingerror` on `document.fonts`).       |
| E204 | The music font did not arrive within 60 seconds.                           |
| E205 | The engine was not there when a file was opened — E201's cause, met later. |

## 3xx — the catalog and the API

The catalog page asking the API for the list. The three causes need different fixes — the origin is
down, the Lambda is cold, or this browser has no network — so they are three numbers rather than one.

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| E301 | The catalog API answered, but not with a success status.                |
| E302 | The catalog request passed its eight-second deadline without answering. |
| E303 | The catalog request never reached the network.                          |

## 4xx — exporting a file

Writing a score back out from `/play`. Shows as a toast.

| Code | Meaning                                                               |
| ---- | --------------------------------------------------------------------- |
| E401 | An export failed — building the bytes, the blob, or the download URL. |

## 5xx — the server

The API itself. Each appears in the JSON response body as a `code` field and in that path's
`console.error` line, so an operator reading CloudWatch can quote the number without waiting for a
client-side report.

| Code | Meaning                                                             |
| ---- | ------------------------------------------------------------------- |
| E501 | The API failed to start, so no request of any kind could be served. |
| E502 | The API was running and this request failed inside it.              |

## 6xx — the stored settings

The settings the player remembers between visits, read back on load. E601 and E603 show as a toast
on arrival; E602 shows as one at the moment a value is typed.

| Code | Meaning                                                                            |
| ---- | ---------------------------------------------------------------------------------- |
| E601 | Individual stored settings were unusable and those keys alone were repaired.       |
| E602 | The engine refused a typed value, so it was neither applied nor saved.             |
| E603 | The stored settings could not be read at all, so everything fell back to defaults. |

E601 and E603 are separate on purpose: one key corrected is not the same event as every setting
lost, and a report that merges them cannot tell a typo from a wipe.

## 9xx — an unexpected crash

| Code | Meaning                                     |
| ---- | ------------------------------------------- |
| E901 | A render crash caught by an error boundary. |

## Retired

Numbers that were once live and must never be handed a new meaning. None yet — the section exists so
the first retirement has an obvious home, and so the gate has something to check against.

| Code | Was |
| ---- | --- |
