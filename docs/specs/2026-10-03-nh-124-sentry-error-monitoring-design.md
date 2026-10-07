---
lap: 2
last_applied: P1
---

# Sentry error monitoring for `web/` — NH-124

Date: 2026-10-03
Status: Design approved by leocaseiro on 2026-10-03, section by section (four sections, ten
decisions). Not implemented. The plan comes next.
Ticket: [NH-124](https://leocaseiro.atlassian.net/browse/NH-124) — "[H-8] Sentry client error
tracking", in the epic NH-180 "Observability & SRE".

## Goal

Every error a visitor meets in `web/` reaches Sentry — whether our code catches it or not — and
neither the score, nor its file name, nor the music in it leaves the device. Reports carry only the
file's type and size, and the kinds of instrument it uses.

## Non-goals

- **No burn rates, no SLOs.** A rate needs every attempt counted, not only the failures, and that is
  usage tracking. It belongs to [NH-52](https://leocaseiro.atlassian.net/browse/NH-52) ("[H-7]
  CloudWatch + X-Ray SLOs"). Until NH-52 lands, Sentry Release Health — the share of visits per
  release that ended without an unhandled error — is the interim front-end health number. Sentry 11
  marks a broken browser visit "unhandled", never "crashed", so a crash-free share would always read
  100%. The reasoning is recorded as a comment on NH-52, dated 2026-10-03.
- **No performance tracing, no Session Replay, no feedback widget.** Errors only. Replay would record
  the score drawn on screen.
- **No server or edge SDK.** `web/` has no runtime server code: no route handlers, no server
  actions, and no `cookies()`, `headers()` or `searchParams` anywhere under `web/app`. Both pages are
  static.
- **No tunnel.** A visitor whose ad blocker stops `sentry.io` is not bypassed (decision D3).
- **No preview deployments.** Production only (decision D5).
- **Not `client/`.** The design system and the paused catalog page are out of scope; the one catch
  block there (`client/src/components/About.tsx:65`) stays as it is.
- **No size gate.** The bundle cost is measured and recorded, not enforced. A size gate is the
  separate pending decision L12-size.
- **No choice popup yet.** A popup that lets a visitor choose what is sent — reject all, accept
  all, or errors only — is [NH-349](https://leocaseiro.atlassian.net/browse/NH-349). Until it
  ships, every production visit reports as this spec describes.

## Why this exists

Today a failure in a visitor's browser is visible in exactly one place: that browser's console. The
player shows an error code for every failure it knows about (`shared/src/error-codes.ts`, E101 to
E901) so that a visitor can quote one — but nothing tells us a failure happened unless the visitor
writes to us.

Nothing in `web/` reports anything. There are 16 catch blocks, 4 failure paths that never throw (a
font event, a timer, an engine event, a repaired-settings restore), and 2 error pages that receive a
React crash and send it nowhere.

The decision to use Sentry is old: L11-sentry, June 2026, "Sentry for client JS errors from commit #1
(source maps + release tagging); painful to retrofit, free tier". It was then deliberately left out of
v0 and listed on [NH-298](https://leocaseiro.atlassian.net/browse/NH-298).

## Decisions

All approved by leocaseiro on 2026-10-03. The changelog entry of the same date records the reasons.

| ID  | Decision                                                                                                       | Rejected                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| S1  | Report every error; remove file names and contents before sending; reword the privacy copy                     | an opt-in switch in Settings; sending file names and removing the promise   |
| S2  | Sentry carries errors and warnings only — no counting of attempts                                              | usage counters in Sentry (needs its own privacy decision; belongs to NH-52) |
| S2b | Storage the browser blocks (a private window) leaves a breadcrumb only                                         | stay silent; send a warning on every blocked visit                          |
| S3  | Errors only                                                                                                    | performance tracing; Session Replay                                         |
| S4  | Release Health on, as the interim health number until NH-52                                                    | off                                                                         |
| D1  | `@sentry/nextjs`, browser part only                                                                            | `@sentry/react` plus our own upload script; Sentry's Loader Script          |
| D2  | Known engine noise is dropped, using one list that the e2e gate also reads                                     | send it at `info` level; send it as normal errors                           |
| D3  | No tunnel                                                                                                      | `tunnelRoute` through our own domain                                        |
| D4  | Source maps: Sentry's default (uploaded to Sentry, deleted from the deploy); Sentry shows the code around them | also serve them publicly; keep "Hide source content" on                     |
| D5  | Production only                                                                                                | production and preview deployments                                          |

## 1. Packages and files

One new dependency: `@sentry/nextjs` (major version 11), in `web/package.json` only. The version is
whatever pnpm resolves under the 7-day `minimumReleaseAge` gate; the plan records it.

**New files:**

| File                                       | Job                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/instrumentation-client.ts`            | Starts Sentry before the page becomes interactive. With no DSN the SDK sends nothing — which is the state in `pnpm dev`, in unit tests, and on preview deployments. |
| `web/app/global-error.tsx`                 | Catches a crash in the root layout itself. Today there is none, so a root-layout crash shows Next's bare default page.                                              |
| `web/lib/monitoring/report.ts`             | `reportError()`, `noteError()`, `isStorageRefusal()` and the tag functions (2.3). Apart from `instrumentation-client.ts`, the only file that imports Sentry.        |
| `web/lib/monitoring/scrub.ts`              | The privacy filter (section 3): names out of error messages, page addresses cut at `?` or `#`.                                                                      |
| `web/lib/monitoring/known-engine-noise.ts` | The known AlphaTab throws, shared by the Sentry filter and `web/e2e/page-errors.ts` (section 2.6).                                                                  |
| `web/e2e/error-reporting.e2e.ts`           | The end-to-end reporting and privacy cases (section 6).                                                                                                             |
| `web/e2e/sentry-envelopes.ts`              | The shared fixture: routes the fake DSN host, answers it, and records each envelope (section 6).                                                                    |
| `tooling/silent-catch-fence.test.sh`       | The lint canary: a silent `catch { }` and a silent `.catch(() => null)` must both fail ESLint (section 6).                                                          |
| `web/scripts/assert-no-auth-token.mjs`     | Fails the build when `SENTRY_AUTH_TOKEN`'s value is in a file browsers download: under `.next/static` or `.next/server`, or in `public/` (section 4).               |
| `tooling/assert-no-auth-token.test.mjs`    | Its test, with a fake token: a leak fails, and the output never holds the value (section 6).                                                                        |

Each `lib/monitoring` file has its unit test beside it, and so do the three error pages,
`web/app/play/OpenFileControl.tsx`, `web/app/play/PlayerShell.tsx` and
`web/app/play/NotationSurface.tsx` (section 6).

**Changed files:** `web/next.config.ts` (the `withSentryConfig` wrapper), `web/package.json` (the
dependency, and the token check at the end of its `build` script), both `error.tsx` files, the 16
catch sites and 4 failure paths listed in section 2.4, `web/app/page.tsx` (copy),
`web/eslint.config.mjs` (the rule), `web/e2e/page-errors.ts` (reads the shared list), the `/`
screenshot baseline, `web/README.md` (the environment variables), `web/playwright.e2e.config.ts`
(a fake DSN), `cspell.json`, and the decision registry and changelog. Also:

- `web/app/play/OpenFileControl.tsx` and `web/app/play/PlayerShell.tsx`, beyond their catch sites:
  picking or dropping a file remembers its name (3.2) and takes the `instruments` tag off until the
  open ends (2.3); `requestNotation` remembers the score's names as soon as the file parses (3.2)
  and sets the tag just before the opened score replaces the open one, but only while the player
  that started the open is still mounted; the player sets the tag to `sample` each time it mounts;
  `readNotation` and `LoadedNotation` carry the file's extension (2.3). The function that turns a
  file name into that type lives in `OpenFileControl.tsx`, beside the `ACCEPT` list it checks, and
  is exported like `readNotation`, so the drop path in `PlayerShell.tsx` uses the same list.
- `web/e2e/player.e2e.ts` — one assertion each on the font and SoundFont failures it already
  forces (section 6).
- `shared/src/error-codes.ts` and `docs/reference/error-codes.md` — the new E105 (section 2.4).

## 2. How each error reaches Sentry

```text
an error happens
 ├─ uncaught: a throw, a rejected promise, a worker error ──► Sentry's global handlers ─┐
 ├─ a React render crash ─► error.tsx / global-error.tsx ─► reportError() ───────────────┤
 ├─ AlphaTab's 'error' event, a music-font failure ─► reportError() ─────────────────────┤
 └─ inside try/catch ─► reportError() (error or warning) / noteError() (breadcrumb) ─────┤
                                                                                         ▼
                scrub.ts (names in error messages → [file]; known engine noise dropped) ─► sentry.io
```

### 2.1 Errors nobody catches

| Channel                                        | Caught by                                                                                                                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a `throw` in an event handler or timer         | Sentry's global `error` handler — automatic                                                                                                                                                                                                                                           |
| a rejected promise nobody awaited              | Sentry's global `unhandledrejection` handler — automatic                                                                                                                                                                                                                              |
| a throw inside AlphaTab's Web Worker           | It reaches the page's `error` handler. Evidence: a spike on 2026-10-03 (Chromium 149, worker served from the same origin) — a throw inside a module or classic worker reached `window.onerror` and Playwright's `pageerror`. NH-335 is not evidence: it is thrown on the main thread. |
| a throw inside AlphaTab's AudioWorklet         | **Not caught.** A worklet error does not reach the page. Only what AlphaTab forwards through its own `error` event arrives. See "Known limits".                                                                                                                                       |
| a React render crash or a `throw` in an effect | The error pages, which swallow it today — section 2.2.                                                                                                                                                                                                                                |

### 2.2 The error pages

`web/app/error.tsx` and `web/app/play/error.tsx` receive the crash and currently ignore it. Each gains
one line, and the new `global-error.tsx` carries the same line:

```diff
-export default function AppError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
+export default function AppError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
+  useEffect(() => reportError(error, { code: ERROR.unexpectedCrash, handled: false }), [error]);
```

`global-error.tsx` replaces the root layout when it renders, so it supplies its own
`<html lang="en">` and `<body>` and imports `globals.css` itself. It is a client component
(`'use client'`) that repeats `web/app/error.tsx` as changed by the diff above: the "Something went
wrong" heading, the same `<main>` classes, the "Error E901" line, a Try again button wired to
`reset`, and the section 3.4 sentence. It names the tab with a React `<title>Notation Hero</title>`,
because this file does not support metadata exports.

### 2.3 The reporting functions

```ts
// web/lib/monitoring/report.ts
type FileFacts = { readonly type: string; readonly bytes: number }; // the extension, never the name

/** An error or a warning: one event against the monthly quota. */
export function reportError(
  error: unknown,
  options?: { code?: ErrorCode; level?: 'error' | 'warning'; file?: FileFacts; handled?: false },
): void;

/** A breadcrumb: never sent alone; it travels inside the next real report. Costs no quota. */
export function noteError(error: unknown, what: string): void;

/** The `instruments` value for these tracks: `drums` first, then each program in three digits. */
export function instrumentsValue(
  tracks: readonly { program: number; isPercussion: boolean }[],
): string;

/** The `instruments` value for the score on screen: `sample` or `instrumentsValue()`. */
export function tagInstruments(value: string): void;

/** A file was picked or dropped: no report carries the tag until that open ends. */
export function suspendInstruments(): void;

/** In a `finally`, when that open ends: reports carry the value for the score on screen again. */
export function restoreInstruments(): void;

/** Sentry's `preprocessEvent` hook (3.3): tags a report captured on `/play` while no open runs. */
export function addInstrumentsTag(event: SentryEvent): void; // Sentry's `Event`, not the DOM's
```

- `level` defaults to `error`.
- `handled: false` marks the report _unhandled_, and the visit with it, which is what the interim
  health number counts (Non-goals). Only the three error pages (E901) and the player failures
  E201–E204 pass it. It reaches Sentry as
  `captureException(error, { mechanism: { handled: false }, captureContext: { tags: { code }, level } })`.
  The shorter `{ tags, mechanism }` form fails the type-check and, forced through, stays handled.
- `code` becomes the Sentry tag `code`, so a visitor who quotes "Error E203" maps straight to a
  Sentry search.
- **E101, E102 and E103 drop the exception message** — from the exception's value and from the
  event's `message` — and keep its type, its stack, and the file's type and size. The engine's parse
  message can quote text from inside the file (section 3.1).
- **`FileFacts.type` is the file's extension**, lower-case, read from the name when the file is
  read and carried on `LoadedNotation`: browsers give `.gp`, `.gp5`, `.gpx` and `.atex` files an
  empty MIME type, and the code that reports E103 holds only the name and the bytes. Only an
  extension the open-file picker accepts is sent (`ACCEPT` in `web/app/play/OpenFileControl.tsx`:
  `gp`, `gp3`, `gp4`, `gp5`, `gpx`, `musicxml`, `mxl`, `xml`, `capx`, `atex`, `alphatex`); any
  other, or none, becomes `other`. It says what kind of file it is, never what it is called.
- **E105 keeps its message.** It is our own code failing after the file was read, so the message
  describes our bug, not the file. The names filter (section 3.2) still runs over it, and it already
  holds the new score's names: they are remembered as soon as the file parses.
- **`instruments`** is a Sentry tag naming the open score's kinds of instrument, so an issue's
  Tags panel shows which sets of instruments its reports came from. Sentry counts each whole value
  as one entry, so `drums,030` and `drums,029,030,033` are two entries; to find every report with
  one instrument, search for its number between wildcards: `instruments:*030*`. Each kind appears
  once: `drums` for a percussion track (a staff marked percussion, read as
  `web/lib/alphatab/mixer-tracks.ts` already does), otherwise the track's General MIDI program as
  the engine stores it (`playbackInfo.program`, 0–127, counted from 0, so `30` is Distortion
  Guitar), written with three digits so that a search for one number never matches another (`25`
  becomes `025`, which `125` does not contain). `drums` comes first, then the numbers in ascending
  order, joined by `,` — `Punk.gp` gives `drums,030`. No name table: the engine's own list is
  internal, and the number is enough.
- **When the tag changes.** `report.ts` keeps one value, the one for the score on screen, and the
  functions above change it. When the player mounts it is `sample`: the bundled one-track beat that
  AlphaTab loads on every visit to `/play` has its own value, so errors while only that beat is on
  screen are found with `instruments:sample`, apart from a visitor's own drum chart.
  `requestNotation` sets the opened score's value just before that score replaces the open one.
  Picking or dropping a file calls `suspendInstruments()` before the file is read, and a `finally`
  calls `restoreInstruments()` when that open ends. While an open runs, no report carries the tag,
  so a failure while opening a file (E101, E102, E103, or E105 before or after the swap) never
  carries the last song's instruments. Afterwards the tag holds the remembered value again: the
  previous score's after a cancelled or failed open, the new score's after a successful one.
  `report.ts` counts the opens still running, so the tag comes back only when the last one ends.
  AlphaTab's score-loaded event never sets the tag: it also fires for the bundled beat, sometimes
  after the visitor's file.
- **The page decides, when an error is captured.** No code calls `Sentry.setTag` for this tag. A
  one-line integration in the SDK settings (3.3) gives Sentry's `preprocessEvent` hook to
  `addInstrumentsTag()`, which adds the value only to a report captured while the page is `/play`
  and no open runs. So a report from `/` carries none, even after a visit to `/play`, and the E901
  that `/play`'s error page sends carries the score the crashed player held. Removing the tag when
  the player unmounts would lose that: React runs the crashed player's unmount cleanups before the
  error page's own effect sends the report. The hook runs inside `captureException`, so it reads
  the page and the open count at the moment of the error; `beforeSend` would read them only as the
  report leaves, which `@sentry/nextjs` delays under `next dev`. Leaving `/play` and returning to
  it, or Try again on its error page, mounts the player again, and it sets `sample`. An open that
  outlives its player never sets a value: the swap's `tagInstruments()` runs only while the player
  that started the open is mounted (a ref). Its `restoreInstruments()` still runs, so the count of
  running opens stays correct.

### 2.4 Every handled failure in `web/`

**Inside try/catch — all 16:**

| Where                                                                                          | What fails                                                      | Code       | Sends                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `web/lib/alphatab/AlphaTabEngineContext.tsx:35`                                                | the player engine did not load                                  | E201       | error, unhandled                                                                                                                    |
| `web/app/play/PlayerShell.tsx:805`                                                             | the same failure, met when a file is opened                     | E205       | breadcrumb — E201 has already reported the cause                                                                                    |
| `web/app/play/PlayerShell.tsx:309`                                                             | stored settings cannot be applied at start                      | —          | error                                                                                                                               |
| `web/app/play/PlayerShell.tsx:743` and `:761`                                                  | MIDI and Guitar Pro export                                      | E401       | error                                                                                                                               |
| `web/lib/alphatab/live-settings.ts:165`                                                        | the engine refused a value our checks allowed                   | E602       | warning                                                                                                                             |
| `web/app/play/PlayerShell.tsx:872`                                                             | the file is not a score                                         | E103       | warning, with file type and size                                                                                                    |
| `web/app/play/OpenFileControl.tsx:75`, `web/app/play/PlayerShell.tsx:969`                      | the file is too large, or cannot be read                        | E101/E102  | warning, with file type and size                                                                                                    |
| the same two catches, after the file was read                                                  | our own code failed while loading the score into the player     | E105 (new) | error, message kept, with file type and size                                                                                        |
| `web/lib/alphatab/settings-storage.ts:195`                                                     | the saved settings are not valid JSON                           | (E603)     | a lint opt-out with a reason: its caller reports E603                                                                               |
| `web/app/play/PlayerShell.tsx:190`, `web/lib/alphatab/transport-storage.ts:129`                | storage blocked while reading, or our reader failed             | —          | breadcrumb if the browser refused (`SecurityError`); anything else: error                                                           |
| `web/app/play/PlayerShell.tsx:220`, `:594`, `:722`, `web/app/play/useRestoredTransport.ts:114` | storage blocked or full while writing, or our serializer failed | —          | breadcrumb if refused or full (`SecurityError`, `QuotaExceededError`, Firefox's `NS_ERROR_DOM_QUOTA_REACHED`); anything else: error |

**Read, then open.** The two open-file catches set a flag between their two steps —
`const loaded = await readNotation(file); read = true; await onNotation(loaded);`
(`requestNotation` in the drop path) — so a failure before it is the visitor's file (E101 or E102,
a warning) and a failure after it is our own code (E105, an error). For E105 the visitor sees
"song.gp could not be opened. Something went wrong on our side, not with your file. Try again, or
reload the page. (Error E105)". A screen reader reads that toast, because Sonner's toaster is a
polite live region. A drop also writes the code into the player's own announcement, as it already
does for E101 and E102; the picker does not, because `OpenFileControl` receives only `onNotation`.
E105 is a new row in `shared/src/error-codes.ts` and `docs/reference/error-codes.md`: "The file
was read, but loading it into the player failed — a bug in our code, not the file."

**An E105 also ends the opening state.** Every exit of `requestNotation` lowers it: its `finally`
calls `setOpening(false)` beside the `openInFlight` release, so the "Loading the player" bar stops
after an E105 from the picker or a drop. The early return for a second open stays outside the
`try`, so it never lowers the bar of the open still running. This gap predates the spec: a throw
after `setOpening(true)` (`web/app/play/PlayerShell.tsx:862`) skips both calls that lower it
(`:873` and `:913`), so today the bar keeps pulsing beside an E102 until another open lowers it or
the page is reloaded.

**Failures that never throw** — an event, a timer, or a state change:

| Where                                              | What fails                                          | Code      | Sends            |
| -------------------------------------------------- | --------------------------------------------------- | --------- | ---------------- |
| `web/app/play/NotationSurface.tsx:117`             | the music font failed to download                   | E203      | error, unhandled |
| `web/app/play/NotationSurface.tsx:126`             | the music font did not arrive within 60 seconds     | E204      | error, unhandled |
| `web/app/play/NotationSurface.tsx:141`             | AlphaTab's `error` event, for example the SoundFont | E202      | error, unhandled |
| `web/app/play/PlayerShell.tsx`, both restore paths | saved settings or transport repaired, or unreadable | E601/E603 | warning          |

**E204 counts visible time only.** AlphaTab 1.8.4 starts its first render from an animation
frame, and a browser runs none in a hidden tab, so a player opened in a background tab draws
nothing there while a plain timer keeps counting. The 60 seconds therefore run only while
`document.visibilityState` is `visible`: a player opened in a background tab starts the clock when
the tab is first shown, a `visibilitychange` to `hidden` stops it, and it continues with the time
left when the page is visible again. Without this, a background tab left for a minute sends an
unhandled E204 that lowers the health number although nothing failed.

**Three events stop the clock permanently.** The first finished render, an E203, or the E204
itself stops it, and after that a tab switch never starts it again. An E203 stops it because
AlphaTab never draws once the font download has failed: without this, every E203 would be
followed by a second unhandled report when the 60 visible seconds end, an E204 that says the font
is late when it has already failed. The same clock also sets the banner's E204 text, so after an
E203 the banner keeps its E203 text, and the clock does not show it again after the visitor
dismisses it.

**Blocked is not corrupt.** Storage the browser _blocks_ is the visitor's environment: a breadcrumb
(S2b). Saved data that is _corrupt_ means our own code wrote something bad, or an update changed which
values are valid. That is a bug signal, so it sends a warning. A throw from our own reader or
serializer inside those same catches is neither: it is a bug, and it sends an error. Each catch
tells the two apart in place — `if (isStorageRefusal(error)) noteError(…); else reportError(error);`
— because the lint rule (section 2.5) flags a shared helper that hides the call.

### 2.5 The lint rule

Two selectors make a catch that reports nothing a lint error. Both were run against a scratch file
on 2026-10-03 with the installed ESLint 9.39.4: they flagged exactly `catch { }` and
`.catch(() => null)`, and passed every form that calls `reportError` or `noteError`.

```js
{ selector: 'CatchClause:not(:has(CallExpression[callee.name=/^(reportError|noteError)$/]))', … },
{ selector: "CallExpression[callee.property.name='catch'] > :function:not(:has(CallExpression[callee.name=/^(reportError|noteError)$/]))", … },
```

- **They join the existing `no-restricted-syntax` list** at `web/eslint.config.mjs:68`, for all
  `**/*.{ts,tsx}` files. A second block that sets the same rule would silently replace the AlphaTab
  dynamic-import fence already there.
- **A deliberate silence** is `// eslint-disable-next-line no-restricted-syntax -- <reason>`. The
  repository already requires a reason on every disable comment
  (`eslint-comments/require-description`).
- **The browser has its own global `reportError`**, so a call with a forgotten import still
  type-checks. `no-restricted-globals` bans the global —
  `{ name: 'reportError', message: 'Import reportError from web/lib/monitoring/report.ts.' }` — so
  that call is a lint error, while the imported function stays allowed. Nothing sets
  `no-restricted-globals` today, so this adds a rule and replaces none.

### 2.6 Known engine noise

AlphaTab 1.8.4 throws two errors that break nothing a person can see:

- **NH-335:** `Cannot read properties of undefined (reading 'voices')`, thrown on the main thread by
  the engine's listener on its worker, on ordinary Guitar Pro files — seven times in one open of
  `guitar-no-percussion.gp`.
- **NH-338:** `cannot call stop without calling start first`, in 7 of 10 quick Pause clicks.

Sent as they are, a handful of visitors would use hundreds of the 5,000 monthly reports on two bugs
we already know about.

`web/e2e/page-errors.ts` already excuses exactly these two, and only when **every** stack frame sits
in the engine bundle `/alphatab/esm/alphaTab.core.mjs`; the same words thrown from our own code still
fail. That list moves to `web/lib/monitoring/known-engine-noise.ts`. The e2e gate reads it from a
stack string and the Sentry filter reads it from Sentry's structured frames, so removing one entry
when NH-335 or NH-338 is fixed updates both. Two end-to-end cases need the bugs to happen and
change in the same step (section 6): when NH-335 is fixed, case 4 stops waiting for its page error
and keeps its `instruments` check; when NH-338 is fixed, case 6 is deleted.

Sentry's default `BrowserApiErrors` integration is removed (section 3.3). It wraps every
`addEventListener` callback — including the engine's listeners on its worker, where both errors are
thrown — and adds a frame from our own bundle, so "every frame in the engine bundle" would stop
matching. Without it, these throws still reach Sentry's global `error` handler with their
engine-only stack. What it adds elsewhere, a little detail on errors in timers, animation frames
and XHR callbacks, is lost; those errors still arrive through the same global handler.

## 3. Privacy

### 3.1 What could leave the device, and what stops it

| What                                           | How it would leak                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | What stops it                                                                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| track names, title, artist, album              | **Verified in Sentry's source** (`packages/browser-utils/src/htmlTreeAsString.ts:156`): click breadcrumbs record each element's `aria-label`, `type`, `name`, `title` and `alt`. The Solo, Mute and Render buttons are labelled `` `Solo ${name}` `` (`client/src/components/ui/TrackRow/TrackRow.tsx:247`). An error's message could quote one too: none does today, but reading a value by a track name off a missing object gives `Cannot read properties of undefined (reading 'Lead Guitar')`. | click breadcrumbs are off (`dom: false`, 3.3), so no label is recorded; the names filter (3.2) replaces a name in an error's message with `[file]`                   |
| the file name                                  | any error message that quotes it — none does today                                                                                                                                                                                                                                                                                                                                                                                                                                                  | the same filter                                                                                                                                                      |
| the score's contents — notes, lyrics, alphaTex | AlphaTab's console logs, and its parse messages, can quote a broken alphaTex line                                                                                                                                                                                                                                                                                                                                                                                                                   | console breadcrumbs are off: the default `Console` integration is removed (3.3), since Sentry 11 has no `console` switch; E101–E103 drop the exception message (2.3) |
| kinds of instrument                            | the `instruments` tag (2.3) — sent on purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                       | only `drums`, `sample` and the General MIDI numbers 000–127 can be sent, never text from the file, so no name can reach the tag                                      |
| the file's type and size                       | `FileFacts` (2.3) on E101–E103 and E105 — sent on purpose                                                                                                                                                                                                                                                                                                                                                                                                                                           | only an extension the open-file picker accepts, or `other`, and a size in bytes; never the file name                                                                 |
| IP address, cookies, the Referer header        | collected by Sentry's defaults                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `dataCollection` turns off each one — the Referer is sent as `[Filtered]` — **and** the project setting "Prevent Storing of IP Addresses" is on (section 5)          |
| the browser's user-agent string                | the `User-Agent` header on each report, and the Release Health ping on every visit (S4) — sent on purpose                                                                                                                                                                                                                                                                                                                                                                                           | it names the browser, its version and the operating system, which Sentry shows on each issue; it holds no IP address and nothing from the file                       |
| the visitor's locale and time zone             | Sentry's default culture context (`CultureContext`) on each report — sent on purpose                                                                                                                                                                                                                                                                                                                                                                                                                | the browser's language and time zone, such as `en-AU` and `Australia/Sydney`, and its calendar; it holds no IP address and nothing from the file                     |
| query strings and `#` fragments                | the event's page address, and the from/to of navigation breadcrumbs — Sentry 11's `dataCollection` covers neither                                                                                                                                                                                                                                                                                                                                                                                   | `scrub.ts` cuts each address at its first `?` or `#`: the event's `request.url`, navigation breadcrumbs' `from` and `to`, fetch and xhr breadcrumbs' `url`           |

The copy says "anonymous", so the IP address must be stopped on **both** sides: Sentry's docs warn
that with `userInfo` off, an IP address can still arrive through headers, cookies or query strings.

### 3.2 The names filter

```ts
// web/lib/monitoring/scrub.ts
export function rememberOpenFile(fileName: string): void; // called when a file is picked or dropped
export function rememberScore(score: ScoreFacts): void; // title, subtitle, artist, album, words,
// music, copyright, tab author, instructions, notices, and every track's name and short name
```

- **Error messages only.** Click breadcrumbs are off (section 3.3), so no button label — and no
  track name in one — is ever recorded. What is left is an error's own message: none quotes a name
  today, but a future bug could, and E105, E901 and E201–E204 keep their message. A thrown `Error`
  puts its message in the exception's value. A string, or a Web Worker error that reaches the page
  without an `Error` object, puts it in the event's `message` as well, and the breadcrumb Sentry
  adds for each sent report repeats `message` in every later report. So when an event is sent
  (`beforeSend`), the filter runs over each exception's value and the event's `message`, and over
  nothing else. The breadcrumb is made after `beforeSend`, so it repeats the cleaned text.
- **The list never forgets** within a tab. An error about file A can be sent after file B opens.
- **Remembered as soon as a file parses.** `requestNotation` calls `rememberScore` right after
  `loadScoreFromBytes` returns, before the new score replaces the open one. Two reports can be sent
  before AlphaTab's score-loaded event: an E105 thrown after the parse, and a crash while the header
  draws the new title (E901). Both keep their message, so the names must be on the list by then.
- **Stored trimmed.** Each string is trimmed before it is stored — the form the mixer shows — and
  the 3-character minimum applies after trimming.
- **Strings shorter than 3 characters are skipped**, so a track named `1` does not rewrite unrelated
  text.
- **Longest first, as plain text.** Remembered strings are replaced longest first, so a name that
  contains a shorter remembered string is removed whole. Each is matched as written, not as a
  pattern, so a `"` or a `(` in a name needs no escaping.
- **Stack frames are not touched.** File paths in frames are our code, not the visitor's.

`scrub.ts` also cuts page addresses at their first `?` or `#` (section 3.1): the event's address
when it is sent, and navigation, fetch and xhr breadcrumbs when they are recorded
(`beforeBreadcrumb`).

### 3.3 SDK settings

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // absent → the SDK sends nothing
  release: APP_VERSION,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { allow: ['User-Agent'] }, // the browser and OS; the Referer goes as [Filtered]
    urlQueryParams: false,
  },
  integrations: (defaults) => [
    ...defaults.filter(
      (integration) =>
        !['Console', 'BrowserApiErrors', 'Breadcrumbs', 'BrowserTracing'].includes(
          integration.name,
        ),
    ),
    breadcrumbsIntegration({ dom: false }), // no click breadcrumbs: their labels hold track names
    { name: 'InstrumentsTag', preprocessEvent: addInstrumentsTag }, // the instruments tag (2.3)
  ],
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: (event) => (isKnownEngineNoise(event) ? null : scrubEvent(event)),
});
```

The filter also removes `BrowserTracing` (S3: errors only). `@sentry/nextjs` adds it to the
defaults, and even with no `tracesSampleRate` it adds `sentry-trace` and `baggage` headers to every
same-origin request, such as the SoundFont download. Its code still ships: Sentry's options that
remove it at build time work with webpack only, and `next build` uses Turbopack.

`dom: false` turns off click and key-press breadcrumbs (section 3.2); navigation, fetch and xhr
breadcrumbs stay. The shape of `dataCollection` matches the types of Sentry 11.0.0; the plan checks
it again against the version pnpm installs (see "To verify").

### 3.4 The copy

```text
Before (web/app/page.tsx:9):  …and play along. Nothing you open leaves this device.
After:                        …and play along. Your scores never leave this device.
                              [the Play button]
After, a new paragraph below the Play button, `text-sm text-muted-foreground`:
                              This site counts visits and crashes anonymously, and sends an error
                              report when something goes wrong. Neither includes your file, its
                              name, or the music in it — only the file's type and size, and the
                              kinds of instrument it uses.

Before (web/app/error.tsx:12 and web/app/play/error.tsx:12):
                              Nothing you opened was sent anywhere. Try again, or reload the page.
After (both, and the new global-error.tsx):
                              Errors are reported automatically — without your file, its name, or
                              the music in it. Try again, or reload the page.
```

The tagline keeps its two lines. As one paragraph, the copy would grow from 119 to 348 characters,
about five lines on a desktop and more on a phone.

The error pages deliberately do **not** say "a report was sent". An ad blocker may have stopped it,
and the page cannot know.

"Counts visits" is Release Health (S4): a small ping on every visit, not only on a crash. It carries
the release, the environment, the browser's user-agent string and whether the visit ended in an
unhandled error — no file data. That is why the home page names it.

"The kinds of instrument" is the `instruments` tag (2.3): `drums` and General MIDI numbers, never
a name. Until the visitor opens a file it reads `sample`, which names the bundled beat, not theirs.

"The file's type and size" is `FileFacts` (2.3): an extension the open-file picker accepts, or
`other`, and a size in bytes. Only E101–E103 and E105 send them.

## 4. Releases, environments and source maps

- **Release** = the existing `APP_VERSION` (`web/lib/app-version.ts`), for example
  `v0.26.09.21-1143.5f027f6`. The source-map upload reads the same `NEXT_PUBLIC_APP_VERSION`, which
  the `build` script already sets for `next build`, so a report always matches its own maps.
- **Environment** is not set in `Sentry.init`; the SDK default applies:
  `NEXT_PUBLIC_VERCEL_TARGET_ENV`, else `NEXT_PUBLIC_VERCEL_ENV`, else `NODE_ENV`. With D5 only
  `production` reports.
- **Source maps** (D4): `withSentryConfig` uploads them after `next build` (Turbopack builds are
  supported from `@sentry/nextjs` 10.13) and deletes them from the deploy by default
  (`sourcemaps.deleteSourcemapsAfterUpload: true`). "Hide source content" stays **off**: the
  repository is public, so hiding the code in Sentry protects nothing and removes the code around
  each error line.
- **No upload without a token.** `SENTRY_AUTH_TOKEN` exists only in Vercel's Production environment.
  Preview builds, CI builds and local builds skip the upload and the release step
  (`useRunAfterProductionCompileHook` is off without a token), so they print no "No auth token"
  warning. A release with no name would not stop it: Sentry's build plugin then names the release
  after the git commit, and it checks the token before it reads `release.create`.
- **No navigation-tracing prompt.** `suppressOnRouterTransitionStartWarning: true` stops the
  "ACTION REQUIRED … `onRouterTransitionStart`" line that the wrapper prints on every build. That
  hook is for navigation tracing, which S3 rules out.
- **The token never reaches a browser file.** `web/scripts/assert-no-auth-token.mjs` runs at the end
  of `web`'s `build` script, after the design-system CSS check, and fails the build when the token's
  value appears in any file that browsers download: the scripts and styles under `.next/static`, the
  pages under `.next/server` (each page's `.html` and `.rsc` files, and the 404 and 500 pages), and
  the files in `public/`. It prints the files, never the value. Without the token (CI, previews,
  local builds) it has nothing to check, so only the production build on Vercel runs it for real.
  The token is safe today without it — it is read only in `next.config.ts`, and the wrapper adds
  only its own `_sentry*` values to the bundle — but nothing else would fail if a later change put
  it there. Next.js copies only `NEXT_PUBLIC_…` variables into browser JavaScript, but a server
  component can render any variable into a page, and both pages are static: `next build` writes
  them as files under `.next/server`, not under `.next/static`.
- **The build plugin's own telemetry is off** (`telemetry: false`).

```ts
// web/next.config.ts
export default withSentryConfig(nextConfig, {
  org: '<org-slug>', // filled in from section 5, step 1 — not secret
  project: '<project-slug>',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: { name: process.env.NEXT_PUBLIC_APP_VERSION },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  useRunAfterProductionCompileHook: Boolean(process.env.SENTRY_AUTH_TOKEN),
  suppressOnRouterTransitionStartWarning: true,
  telemetry: false,
});
```

## 5. Setup — done by leocaseiro, by hand

An agent may not create accounts or handle the token.

1. Create a Sentry account on the free Developer plan, with the data storage location **EU
   (Frankfurt)**. Sentry asks once, at sign-up, and the choice cannot be changed later. There is no
   Australian region; the EU keeps error events under GDPR, the stricter fallback should anything
   personal ever slip through. Then create a project with the platform **Next.js**, and note the
   organization and project slugs for `next.config.ts`.
2. At project creation, choose **"I'll create my own alerts later"**: the default alert fires on
   high-priority issues only, and Sentry ranks a warning as medium. Then create one issue alert that
   fires when **any** of these happens: **"A new issue is created"**, **"A resolved issue
   regresses"**, **"An issue escalates"**. No level filter; the action is **"Notify on preferred
   channel → Member: leocaseiro"**, which arrives by email on the Developer plan. Each new kind of
   error or warning, and each fixed one that comes back, then sends one email.
3. Project settings → Security & Privacy → turn on **"Prevent Storing of IP Addresses"**. Then
   Project settings → General Settings → Client Security → **Allowed Domains**: replace the default
   `*` with the production domain. Sentry then rejects a report that a browser sends with this DSN
   from any other site. A request with no `Origin` or `Referer` header still gets through, so this
   limits misuse of the public DSN; it does not stop it.
4. Create an **organization auth token**, used only for the source-map upload.
5. Vercel → the project → Settings → Environment Variables, **Production only** (D5):
   - `NEXT_PUBLIC_SENTRY_DSN` — public by design; it ships inside the page.
   - `SENTRY_AUTH_TOKEN` — marked **Sensitive**. Never in chat, never in the repository.
6. After the first production deploy, open a file that is not a score. An E103 warning appearing in
   Sentry, with the file's type and size and without its name, proves the whole path — and its
   email (step 2) proves the alert. Its stack must show our own frame, the `PlayerShell.tsx` line
   that calls `loadScoreFromBytes`, with readable names and the code around it, which proves the
   source maps; the frames above it are AlphaTab's and stay minified (see "Known limits"). Its
   release must equal the version in the wordmark's tooltip.

This replaces two registry rows written for GitHub Actions: L11-envsecret required a `production-build`
GitHub environment for the upload job, and F7-sentry required `SENTRY_AUTH_TOKEN` as a GitHub Actions
secret. The upload now runs inside Vercel's build, so neither GitHub mechanism applies.

## 6. Testing

- **Unit (Vitest), beside each `lib/monitoring` file:**
  - the names filter, over an exception's message: the file name, the title and every track name
    become `[file]`; strings shorter than 3 characters are left alone; stack frames are untouched;
    a track named `"Lead Guitar "` (with a trailing space) is stored trimmed, so a message with
    `(reading 'Lead Guitar')` comes out with `(reading '[file]')`; with `Drums (Lef` (the engine's
    automatic short name) and `Drums (Left Kit)` both remembered, a message quoting
    `Drums (Left Kit)` comes out with `[file]`, not `[file]t Kit)`;
  - the names filter, over an event Sentry built from text (a string passed to `reportError`, or a
    Web Worker error that reached the page without an `Error` object): a remembered track name in
    the event's `message` and in its exception's value comes out as `[file]` in both;
  - the address scrub: `/play?fbclid=abc#x` comes out as `/play`, in the event's address and in a
    navigation breadcrumb;
  - `reportError`: the default level, the `code` tag, and E101–E103 dropping the message, also from
    the event's `message`;
  - `instrumentsValue`: a percussion track and a Distortion Guitar track (program 30) give
    `drums,030`; program 5 gives `005`; two tracks on the same program give one number;
  - the tag's lifecycle, read through `addInstrumentsTag`: `suspendInstruments` takes the tag off
    and `restoreInstruments` puts the remembered value back; `tagInstruments` while an open runs
    changes only the remembered value; with two opens running, the tag comes back only when the
    second one ends; a report from `/play` carries the remembered value, and a report from `/`
    never carries the tag;
  - `isStorageRefusal`: `SecurityError`, `QuotaExceededError` and `NS_ERROR_DOM_QUOTA_REACHED` count
    as refused storage; a `TypeError` from our own reader does not;
  - known engine noise: a throw whose frames all sit in the engine bundle is dropped; the same
    message with one frame from our code is kept.
- **The three error pages** (`web/app/error.tsx`, `web/app/play/error.tsx`,
  `web/app/global-error.tsx`), with a test beside them: each, rendered with a stub error, shows the
  section 3.4 sentence and "Error E901", its Try again calls `reset`, and `reportError` is called
  once with the stub error and code E901. (Rendering `global-error.tsx` prints one development
  warning, `<html>` inside a `<div>`; it does not fail the test.)
- **The open-file catches**, a test beside `web/app/play/OpenFileControl.tsx`: a read that fails
  shows E102 and reports a warning without the message; an `onNotation` that fails shows E105 and
  reports an error that keeps its message; neither report carries the `instruments` tag, and once
  the open ends the tag is back to the value for the score on screen; and the file type:
  `Song.GP5` gives `gp5`, while `notes.txt` and a name with no extension give `other`.
- **The names arrive before the swap**, a case in `web/app/play/PlayerShell.test.tsx`: open
  `Punk.gp` and make the step after the parse throw with a message that quotes `Distortion Guitar`;
  once filtered, the E105 report's message reads `[file]` where it quoted the name.
- **The tag follows the score on screen**, cases in `web/app/play/PlayerShell.test.tsx`: the tag
  is `sample` once the player mounts; opening `Punk.gp` sets `drums,030`; after an unmount, a report
  from `/play` still carries `drums,030` (the E901 case) and a report from `/` carries none, and a
  second mount gives `sample`; an open left running across that unmount sets nothing when it ends;
  with `Punk.gp` open, a file that is not a score sends an E103 without the tag and leaves
  `drums,030`, and so does Cancel on the prompt to replace it; an E105 thrown just after the swap
  leaves the new score's value; and when the bundled sample's score-loaded event arrives after the
  visitor's file, the tag keeps the file's value.
- **The opening state**, a case in `web/app/play/PlayerShell.test.tsx`: with the player ready, an
  open that throws after the parse shows E105 and leaves no "Loading the player" bar.
- **The font clock**, a test beside `web/app/play/NotationSurface.tsx`, with fake timers, a stubbed
  `document.visibilityState` and a stub `document.fonts` (jsdom has none): two hidden minutes raise
  no E204; 40 visible seconds, a hidden minute, then 20 more visible seconds raise one; once a
  render has finished, hiding and showing the tab raises none a minute later; after an E203, 60
  visible seconds raise no E204 and the banner still shows E203; and once an E204 has been raised,
  hiding and showing the tab raises no second one. The end-to-end lane cannot cover the hidden-tab
  cases: headless Chromium keeps every page visible.
- **Lint canary:** `tooling/silent-catch-fence.test.sh`, a sibling of
  `tooling/alphatab-import-fence.test.sh` — its `expect_rejected` helper over the same
  `no-restricted-syntax` list, already run in the `quality` job — expects both a silent `catch { }`
  and a silent `.catch(() => null)` to fail, so neither selector can stop working quietly.
- **The token check:** `tooling/assert-no-auth-token.test.mjs`, a sibling of
  `tooling/assert-design-system-css.test.mjs` under `pnpm run test:tooling`. With a fake token, a
  fake `.next/static` file that holds it fails the check, and so do a fake
  `.next/server/app/play.html` and a fake file in `public/`; the output names the file but never
  the value. Clean files pass, and so does a build with no token.
- **End to end (Playwright, in the existing `web` job):**
  - Every build of the lane — CI, local, and the Docker baseline update — gets a fake DSN,
    `https://public@sentry.invalid/1`, from `webServer.env` in `web/playwright.e2e.config.ts`,
    beside `NEXT_PUBLIC_ALPHATAB_LOG_LEVEL`. One shared fixture routes every request to that host,
    answers it, and records the envelope, so nothing reaches the network and the real SDK is under
    test with no test code in the app.
  - **Cases that already force a failure** get one extra assertion each: the font abort
    (`web/e2e/player.e2e.ts:218`) must produce E203, and the SoundFont abort
    (`web/e2e/player.e2e.ts:267`) E202. No case in `player.e2e.ts` aborts the engine module, so
    E201 gets a case of its own (case 8 below).
  - **New cases in `web/e2e/error-reporting.e2e.ts`:**
    1. On `/play`, once the bundled sample is drawn and before any file is opened, a throw the test
       schedules with `setTimeout` inside `page.evaluate` sends an `error` that carries the tag
       `instruments: sample`. (A direct throw only rejects the `evaluate` call; it never reaches
       the page.)
    2. Opening a file that is not a score sends an E103 `warning` with its type and size, and no name.
    3. Open a sample whose name, title and track names are known, click Solo, log a marker string
       with `console.error`, then throw an error whose message quotes the Solo track's name: the
       envelope holds no click breadcrumb, its message reads `[file]` where the name was, and the
       raw envelope contains none of those strings, and not the marker.
    4. Open `guitar-no-percussion.gp` (an NH-335 file) while the bundled sample is held back, as
       the late-sample test in `web/e2e/player.e2e.ts` already does. Once a page error with the
       NH-335 message has been seen and the sample has arrived, the test throws a sentinel error:
       the sentinel is the only error event sent, and it carries the tag `instruments: 025` (the
       file's one track, an acoustic guitar), not `sample`.
    5. With storage blocked by an init script that throws `DOMException('…', 'SecurityError')`, as
       browsers do, no event is sent until a real error, and that report carries the storage
       breadcrumb.
    6. Play then Pause quickly, repeated until a page error with the NH-338 message has been
       seen (at most 20 tries): no event envelope carries that message.
    7. Open `/?fbclid=probe123#frag` and cause an error there, then click Play and cause another:
       neither envelope contains `probe123` or `frag`.
    8. Abort the engine module with the existing `abortEngine` helper
       (`web/e2e/player-states.ts`, navigation only): one E201 `error` is sent, marked unhandled.
       The envelope fixture is set up before the helper's `page.goto`, because the import fails
       during that first load.
  - **Every case that expects nothing to be sent ends with a sentinel** — an error the test throws
    and waits for — and reads event envelopes only, never the session envelope that Release Health
    (S4) sends on every visit. Without the sentinel, a recorder that captured nothing would pass.
    The sentinel is never added to the shared engine-noise list: the Sentry filter reads that list
    too, and would drop it. `error-reporting.e2e.ts` does not install `failOnUnexpectedPageErrors`:
    its cases throw on purpose, and only `*.vr.ts` files must.
- **Screenshots:** the new home-page copy changes the `/` shot (`landing-chromium-linux.png`). Its
  baseline is regenerated in the Linux container (`pnpm test:web:docker:update`) and committed.
- **Download size:** the total transferred size of the `.js` files in one cold Playwright load of
  `/play` against `next start`, measured the same way before and after; both numbers go in the PR
  description. (Next 16's `next build` no longer prints "First Load JS".)

## 7. Documents that change

- `docs/decisions/decision-changelog.md` — the 2026-10-03 entry recording these decisions.
- `docs/decisions/decision-registry.md` — L11-sentry points at this spec; L11-srcmap reworded (D4);
  L11-envsecret superseded; F7-sentry rewritten for Vercel. Flips to ✅ happen in the implementation
  PR.
- `web/README.md` — the Deploy section names both environment variables.
- `shared/src/error-codes.ts` and `docs/reference/error-codes.md` — the new E105 (section 2.4).
- **Jira, at implementation:** the two NH-298 checklist items "Sentry integration" and "Test the
  'Nothing you open leaves this device' claim" change. The second's future same-origin test must now
  allow exactly the Sentry ingest host — and only once this ships.

## Known limits

- **AudioWorklet errors.** A throw inside AlphaTab's sound thread is reported only if AlphaTab
  forwards it through its `error` event. Untested.
- **Engine frames stay minified.** The vendored `alphaTab.core.mjs` is AlphaTab's minified build,
  the whole engine on one 1.1 MB line, and the package ships no source map. Every frame inside it
  reads like `Fi.loadScoreFromBytes` at line 51; only our own frames are mapped. Every E103 starts
  there.
- **Ad-blocked visitors.** Their reports never arrive (D3). How many are missed is not measured:
  this project counts no visits outside Sentry, and adding a counter is the usage tracking
  [NH-52](https://leocaseiro.atlassian.net/browse/NH-52) owns.
- **The privacy note is on the home page only.** A visitor who opens `/play` directly is counted
  without seeing it. The choice popup, [NH-349](https://leocaseiro.atlassian.net/browse/NH-349),
  would show on every page.
- **The quota.** Past 5,000 errors in a month, Sentry refuses further reports until it resets — "Events
  and attachments that exceed your quota will not be accepted" (Sentry's quota docs). The SDK stops
  sending without any sign to the visitor, and Release Health keeps counting. There is no per-page cap:
  Sentry already drops an event identical to the one before it, which covers the usual error in a
  loop. If volume ever grows, the setting to turn is `sampleRate`. On the free plan, per-key rate
  limits and spike protection are not available.
- **Release Health pings on every visit**, not only on a crash. The home-page copy says so.

## To verify at plan time

Each is a claim this design rests on but no one has run yet:

- One build with `withSentryConfig` beside `reactCompiler`, `transpilePackages`, the AlphaTab copy
  step and the design-system CSS check. This is a go/no-go: if the wrapper breaks the build, D1 falls
  back to `@sentry/react` plus our own upload script.
- The exact shape of `dataCollection` in the installed version.
- That the browser SDK sends Release Health sessions by default.
- That the source-map upload reaches the EU region with the organization auth token alone, or needs
  the region's address set as well.
- Which Release Health figure shows "visits with no unhandled error" under Sentry 11.
- What argument AlphaTab's `error` event passes — an `Error` or a string.
- That Vercel never builds a fork's pull request with Production variables.
- That Playwright can route a request to the `.invalid` host before any DNS lookup.
