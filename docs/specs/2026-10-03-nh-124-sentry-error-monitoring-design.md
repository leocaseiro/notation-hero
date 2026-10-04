# Sentry error monitoring for `web/` — NH-124

Date: 2026-10-03
Status: Design approved by leocaseiro on 2026-10-03, section by section (four sections, ten
decisions). Not implemented. The plan comes next.
Ticket: [NH-124](https://leocaseiro.atlassian.net/browse/NH-124) — "[H-8] Sentry client error
tracking", in the epic NH-180 "Observability & SRE".

## Goal

Every error a visitor meets in `web/` reaches Sentry — whether our code catches it or not — and
neither the score, nor its file name, nor anything in it leaves the device.

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
| `web/lib/monitoring/report.ts`             | `reportError()`, `noteError()` and `tagInstruments()`. Apart from `instrumentation-client.ts`, the only file that imports Sentry.                                   |
| `web/lib/monitoring/scrub.ts`              | The privacy filter (section 3): names out of error messages, page addresses cut at `?` or `#`.                                                                      |
| `web/lib/monitoring/known-engine-noise.ts` | The known AlphaTab throws, shared by the Sentry filter and `web/e2e/page-errors.ts` (section 2.6).                                                                  |
| `web/e2e/error-reporting.e2e.ts`           | The end-to-end reporting and privacy cases (section 6).                                                                                                             |

Each `lib/monitoring` file has its unit test beside it.

**Changed files:** `web/next.config.ts` (the `withSentryConfig` wrapper), both `error.tsx` files, the
16 catch sites and 4 failure paths listed in section 2.4, `web/app/page.tsx` (copy),
`web/eslint.config.mjs` (the rule), `web/e2e/page-errors.ts` (reads the shared list), the `/`
screenshot baseline, `web/README.md` (the environment variables), `web/playwright.e2e.config.ts`
(a fake DSN), `cspell.json`, and the decision registry and changelog.

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
| a `throw` in an event handler, timer or effect | Sentry's global `error` handler — automatic                                                                                                                                                                                                                                           |
| a rejected promise nobody awaited              | Sentry's global `unhandledrejection` handler — automatic                                                                                                                                                                                                                              |
| a throw inside AlphaTab's Web Worker           | It reaches the page's `error` handler. Evidence: a spike on 2026-10-03 (Chromium 149, worker served from the same origin) — a throw inside a module or classic worker reached `window.onerror` and Playwright's `pageerror`. NH-335 is not evidence: it is thrown on the main thread. |
| a throw inside AlphaTab's AudioWorklet         | **Not caught.** A worklet error does not reach the page. Only what AlphaTab forwards through its own `error` event arrives. See "Known limits".                                                                                                                                       |
| a React render crash                           | The error pages, which swallow it today — section 2.2.                                                                                                                                                                                                                                |

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
type FileFacts = { readonly type: string; readonly bytes: number }; // never the name

/** An error or a warning: one event against the monthly quota. */
export function reportError(
  error: unknown,
  options?: { code?: ErrorCode; level?: 'error' | 'warning'; file?: FileFacts; handled?: false },
): void;

/** A breadcrumb: never sent alone; it travels inside the next real report. Costs no quota. */
export function noteError(error: unknown, what: string): void;

/** The score's kinds of instrument, as the Sentry tag `instruments`; an empty list clears it. */
export function tagInstruments(tracks: readonly { program: number; isPercussion: boolean }[]): void;
```

- `level` defaults to `error`.
- `handled: false` marks the report _unhandled_, and the visit with it, which is what the interim
  health number counts (Non-goals). Only the three error pages (E901) and the player failures
  E201–E204 pass it. It reaches Sentry as
  `captureException(error, { mechanism: { handled: false }, captureContext: { tags: { code }, level } })`.
  The shorter `{ tags, mechanism }` form fails the type-check and, forced through, stays handled.
- `code` becomes the Sentry tag `code`, so a visitor who quotes "Error E203" maps straight to a
  Sentry search.
- **E101, E102 and E103 drop the exception message** and keep its type, its stack, and the file's
  type and size. The engine's parse message can quote text from inside the file (section 3.1).
- **E105 keeps its message.** It is our own code failing after the file was read, so the message
  describes our bug, not the file. The names filter (section 3.2) still runs over it.
- **`instruments`** is a Sentry tag naming the open score's kinds of instrument, so an issue's
  Tags panel shows when its reports cluster on one instrument. Each kind appears once: `drums` for
  a percussion track (a staff marked percussion, read as `web/lib/alphatab/mixer-tracks.ts`
  already does), otherwise the track's General MIDI program as the engine stores it
  (`playbackInfo.program`, 0–127, counted from 0, so `30` is Distortion Guitar). `drums` comes
  first, then the numbers in ascending order, joined by `,` — `Punk.gp` gives `drums,30`. No name
  table: the engine's own list is internal, and the number is enough. The tag is set when a score
  loads, and cleared as soon as another file is picked or dropped, before it is read, so a failure
  while opening it never carries the last song's instruments.

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
reload the page. (Error E105)", and the screen-reader announcement names the same code. E105 is a
new row in `shared/src/error-codes.ts` and `docs/reference/error-codes.md`: "The file was read, but
loading it into the player failed — a bug in our code, not the file."

**Failures that never throw** — an event, a timer, or a state change:

| Where                                              | What fails                                          | Code      | Sends            |
| -------------------------------------------------- | --------------------------------------------------- | --------- | ---------------- |
| `web/app/play/NotationSurface.tsx:117`             | the music font failed to download                   | E203      | error, unhandled |
| `web/app/play/NotationSurface.tsx:126`             | the music font did not arrive within 60 seconds     | E204      | error, unhandled |
| `web/app/play/NotationSurface.tsx:139`             | AlphaTab's `error` event, for example the SoundFont | E202      | error, unhandled |
| `web/app/play/PlayerShell.tsx`, both restore paths | saved settings or transport repaired, or unreadable | E601/E603 | warning          |

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

- **They join the existing `no-restricted-syntax` list** at `web/eslint.config.mjs:68`. A second
  block that sets the same rule would silently replace the AlphaTab dynamic-import fence already
  there. If the new selectors need a narrower `files` scope (test files are exempt), that block must
  repeat the fence's selector, held in a shared constant.
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
when NH-335 or NH-338 is fixed updates both.

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
| kinds of instrument                            | the `instruments` tag (2.3) — sent on purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                       | only `drums` and the General MIDI numbers 0–127 can be sent, never text from the file, so no name can reach the tag                                                  |
| IP address, cookies, headers                   | collected by Sentry's defaults                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `dataCollection` turns each one off, **and** the project setting "Prevent Storing of IP Addresses" is on (section 5)                                                 |
| query strings and `#` fragments                | the event's page address, and the from/to of navigation breadcrumbs — Sentry 11's `dataCollection` covers neither                                                                                                                                                                                                                                                                                                                                                                                   | `scrub.ts` cuts each address at its first `?` or `#`: the event's `request.url`, navigation breadcrumbs' `from` and `to`, fetch and xhr breadcrumbs' `url`           |

The copy says "anonymous", so the IP address must be stopped on **both** sides: Sentry's docs warn
that with `userInfo` off, an IP address can still arrive through headers, cookies or query strings.

### 3.2 The names filter

```ts
// web/lib/monitoring/scrub.ts
export function rememberOpenFile(fileName: string): void; // called when a file is picked or dropped
export function rememberScore(score: ScoreFacts): void; // title, subtitle, artist, album, words,
// music, copyright, tab author, and every track's name and short name
```

- **Error messages only.** Click breadcrumbs are off (section 3.3), so no button label — and no
  track name in one — is ever recorded. What is left is an error's own message: none quotes a name
  today, but a future bug could, and E105, E901 and E201–E204 keep their message. So when an event
  is sent (`beforeSend`), the filter runs over each exception's message, and over nothing else.
- **The list never forgets** within a tab. An error about file A can be sent after file B opens.
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
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, urlQueryParams: false },
  integrations: (defaults) => [
    ...defaults.filter(
      (integration) => !['Console', 'BrowserApiErrors', 'Breadcrumbs'].includes(integration.name),
    ),
    breadcrumbsIntegration({ dom: false }), // no click breadcrumbs: their labels hold track names
  ],
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: (event) => (isKnownEngineNoise(event) ? null : scrubEvent(event)),
});
```

`dom: false` turns off click and key-press breadcrumbs (section 3.2); navigation, fetch and xhr
breadcrumbs stay. The exact shape of `dataCollection` is confirmed against the installed types
(see "To verify").

### 3.4 The copy

```text
Before (web/app/page.tsx:9):  …and play along. Nothing you open leaves this device.
After:                        …and play along. Your scores never leave this device. This site
                              counts visits and crashes anonymously, and sends an error report
                              when something goes wrong. Neither includes your file, its name,
                              or the music in it — only the kinds of instrument it uses.

Before (web/app/error.tsx:12 and web/app/play/error.tsx:12):
                              Nothing you opened was sent anywhere. Try again, or reload the page.
After (both, and the new global-error.tsx):
                              Errors are reported automatically — without your file, its name, or
                              the music in it. Try again, or reload the page.
```

The error pages deliberately do **not** say "a report was sent". An ad blocker may have stopped it,
and the page cannot know.

"Counts visits" is Release Health (S4): a small ping on every visit, not only on a crash. It carries
the release, the environment and whether the visit ended in an unhandled error — no file data.
That is why the home page names it.

"The kinds of instrument" is the `instruments` tag (2.3): `drums` and General MIDI numbers, never
a name.

## 4. Releases, environments and source maps

- **Release** = the existing `APP_VERSION` (`web/lib/app-version.ts`), for example
  `v0.26.09.21-1143.5f027f6`. The source-map upload reads the same `NEXT_PUBLIC_APP_VERSION`, which
  the `build` script already sets for `next build`, so a report always matches its own maps.
- **Environment** = `NEXT_PUBLIC_VERCEL_ENV`. With D5 only `production` reports.
- **Source maps** (D4): `withSentryConfig` uploads them after `next build` (Turbopack builds are
  supported from `@sentry/nextjs` 10.13) and deletes them from the deploy by default
  (`sourcemaps.deleteSourcemapsAfterUpload: true`). "Hide source content" stays **off**: the
  repository is public, so hiding the code in Sentry protects nothing and removes the code around
  each error line.
- **No upload without a token.** `SENTRY_AUTH_TOKEN` exists only in Vercel's Production environment.
  Preview builds, CI builds and local builds skip the upload, and the wrapper is told so rather than
  left to warn.
- **The build plugin's own telemetry is off** (`telemetry: false`).

```ts
// web/next.config.ts
export default withSentryConfig(nextConfig, {
  org: '<org-slug>', // filled in from section 5, step 1 — not secret
  project: '<project-slug>',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: { name: process.env.NEXT_PUBLIC_APP_VERSION },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
```

## 5. Setup — done by leocaseiro, by hand

An agent may not create accounts or handle the token.

1. Create a Sentry account on the free Developer plan, and a project with the platform **Next.js**.
   Note the organization and project slugs for `next.config.ts`.
2. At project creation, choose **"I'll create my own alerts later"**: the default alert fires on
   high-priority issues only, and Sentry ranks a warning as medium. Then create one issue alert that
   fires when **any** of these happens: **"A new issue is created"**, **"A resolved issue
   regresses"**, **"An issue escalates"**. No level filter; the action is **"Notify on preferred
   channel → Member: leocaseiro"**, which arrives by email on the Developer plan. Each new kind of
   error or warning, and each fixed one that comes back, then sends one email.
3. Project settings → Security & Privacy → turn on **"Prevent Storing of IP Addresses"**.
4. Create an **organization auth token**, used only for the source-map upload.
5. Vercel → the project → Settings → Environment Variables, **Production only** (D5):
   - `NEXT_PUBLIC_SENTRY_DSN` — public by design; it ships inside the page.
   - `SENTRY_AUTH_TOKEN` — marked **Sensitive**. Never in chat, never in the repository.
6. After the first production deploy, open a file that is not a score. An E103 warning appearing in
   Sentry, with the file's type and size and without its name, proves the whole path — and its
   email (step 2) proves the alert.

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
  - the address scrub: `/play?fbclid=abc#x` comes out as `/play`, in the event's address and in a
    navigation breadcrumb;
  - `reportError`: the default level, the `code` tag, and E101–E103 dropping the message;
  - `tagInstruments`: a percussion track and a Distortion Guitar track (program 30) give
    `drums,30`; two tracks on the same program give one number; an empty list clears the tag;
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
  reports an error that keeps its message; and picking a file clears the `instruments` tag before
  the file is read.
- **Lint canary:** a test runs ESLint over a silent `catch { }` and expects it to fail, so the rule
  cannot stop working quietly — the same idea as `tooling/check-core-purity-canary.sh`.
- **End to end (Playwright, in the existing `web` job):**
  - Every build of the lane — CI, local, and the Docker baseline update — gets a fake DSN,
    `https://public@sentry.invalid/1`, from `webServer.env` in `web/playwright.e2e.config.ts`,
    beside `NEXT_PUBLIC_ALPHATAB_LOG_LEVEL`. One shared fixture routes every request to that host,
    answers it, and records the envelope, so nothing reaches the network and the real SDK is under
    test with no test code in the app.
  - **Cases that already force a failure** get one extra assertion each: the engine-module abort
    (`web/e2e/player-states.ts:55`) must produce E201, the font abort (`web/e2e/player.e2e.ts:218`)
    E203, and the SoundFont abort (`web/e2e/player.e2e.ts:267`) E202.
  - **New cases in `web/e2e/error-reporting.e2e.ts`:**
    1. A throw the test schedules with `setTimeout` inside `page.evaluate` sends an `error`. (A
       direct throw only rejects the `evaluate` call; it never reaches the page.)
    2. Opening a file that is not a score sends an E103 `warning` with its type and size, and no name.
    3. Open a sample whose name, title and track names are known, click Solo, log a marker string
       with `console.error`, then throw an error whose message quotes the Solo track's name: the
       envelope holds no click breadcrumb, its message reads `[file]` where the name was, and the
       raw envelope contains none of those strings, and not the marker.
    4. Open `guitar-no-percussion.gp` (an NH-335 file). Once a page error with the NH-335 message
       has been seen, the test throws a sentinel error: the sentinel is the only error event sent,
       and it carries the tag `instruments: 25` (the file's one track, an acoustic guitar).
    5. With storage blocked by an init script that throws `DOMException('…', 'SecurityError')`, as
       browsers do, no event is sent until a real error, and that report carries the storage
       breadcrumb.
    6. Play then Pause quickly, repeated until a page error with the NH-338 message has been
       seen (at most 20 tries): no event envelope carries that message.
    7. Open `/?fbclid=probe123#frag` and cause an error there, then click Play and cause another:
       neither envelope contains `probe123` or `frag`.
  - **Every case that expects nothing to be sent ends with a sentinel** — an error the test throws
    and waits for — and reads event envelopes only, never the session envelope that Release Health
    (S4) sends on every visit. Without the sentinel, a recorder that captured nothing would pass.
    The sentinel is never added to the shared engine-noise list: the Sentry filter reads that list
    too, and would drop it. `error-reporting.e2e.ts` does not install `failOnUnexpectedPageErrors`:
    its cases throw on purpose, and only `*.vr.ts` files must.
- **Screenshots:** the new home-page copy changes the `/` shot (`landing-chromium-linux.png`). Its
  baseline is regenerated in the Linux container (`pnpm test:web:docker:update`) and committed.
- **Download size:** `/play`'s first-load JavaScript is measured before and after, and both numbers go
  in the PR description.

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
- **Ad-blocked visitors.** Their reports never arrive (D3). After a month, Release Health's session
  count against Vercel's visit count shows how many are missed.
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
- Which Release Health figure shows "visits with no unhandled error" under Sentry 11.
- That `NEXT_PUBLIC_VERCEL_ENV` is exposed on Vercel for this project.
- What argument AlphaTab's `error` event passes — an `Error` or a string.
- That Vercel never builds a fork's pull request with Production variables.
- That Playwright can route a request to the `.invalid` host before any DNS lookup.
