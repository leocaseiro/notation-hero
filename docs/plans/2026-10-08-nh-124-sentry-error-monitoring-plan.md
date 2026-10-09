---
lap: 1
last_applied: P1
---

# Sentry error monitoring for `web/` — implementation plan (NH-124)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every error a visitor meets in `web/` reaches Sentry — whether our code catches it or not
— while the score, its file name and the music in it never leave the device. Reports carry only the
file's type and size, and the kinds of instrument it uses.

**Architecture:** `@sentry/nextjs` 11, browser part only. `web/instrumentation-client.ts` starts the
SDK before the page becomes interactive; `withSentryConfig` in `web/next.config.ts` uploads source
maps from Vercel's production build and nowhere else. The rest of `web/` reaches Sentry through one
module, `web/lib/monitoring/report.ts` (`reportError`, `noteError` and the `instruments` tag).
`scrub.ts` removes remembered names from error messages and cuts page addresses before a report
leaves; `known-engine-noise.ts` drops two known AlphaTab throws and is shared with the end-to-end
gate. A lint rule fails any `catch` in `web/` that reports nothing.

**Tech Stack:** `@sentry/nextjs` 11 (11.1.0 resolved on 2026-10-08, pinned exactly), Next.js 16.3.6
App Router with its Turbopack build, React 19.2, AlphaTab 1.8.4, Vitest 4.1 + jsdom 29 + Testing
Library, Playwright 1.61.1, ESLint 9 flat config, `node --test`, pnpm 11 workspaces.

**Spec:**
[`docs/specs/2026-10-03-nh-124-sentry-error-monitoring-design.md`](../specs/2026-10-03-nh-124-sentry-error-monitoring-design.md)
— read it beside this plan. The plan argues from it. Where the two disagree, the spec wins unless a
section below says what changed and why.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the
spec, or from the decision named beside them.

- **One dependency:** `@sentry/nextjs` (major version 11), in `web/package.json` only. Whatever pnpm
  resolves under the 7-day `minimumReleaseAge` gate; this plan pins it exactly and records it.
- **Browser part only** (D1): no `sentry.server.config.ts`, no `sentry.edge.config.ts`, no
  `instrumentation.ts`. `web/` has no runtime server code.
- **Production only** (D5): "With no DSN the SDK sends nothing — which is the state in `pnpm dev`,
  in unit tests, and on preview deployments."
- **Errors only** (S3): no performance tracing, no Session Replay, no feedback widget. No tunnel
  (D3).
- **The SDK settings** (spec 3.3), exactly:
  `dataCollection: { userInfo: false, cookies: false, httpHeaders: { allow: ['User-Agent'] }, urlQueryParams: false }`;
  the default integrations `Console`, `BrowserApiErrors`, `Breadcrumbs` and `BrowserTracing` are
  removed; `breadcrumbsIntegration({ dom: false })` and
  `{ name: 'InstrumentsTag', preprocessEvent: addInstrumentsTag }` are added;
  `beforeBreadcrumb: scrubBreadcrumb`;
  `beforeSend: (event) => (isKnownEngineNoise(event) ? null : scrubEvent(event))`.
- **Release** = `APP_VERSION` (`web/lib/app-version.ts`). **Environment** is not set; the SDK
  default applies.
- **Only two files import Sentry at runtime:** `web/instrumentation-client.ts` and
  `web/lib/monitoring/report.ts`. Others may use `import type` only.
- **Never sent:** the file name, the file's contents, the score's title, credits or track names.
  `FileFacts.type` is "an extension the open-file picker accepts (`ACCEPT` in
  `web/app/play/OpenFileControl.tsx`: `gp`, `gp3`, `gp4`, `gp5`, `gpx`, `musicxml`, `mxl`, `xml`,
  `capx`, `atex`, `alphatex`); any other, or none, becomes `other`". The `instruments` tag holds
  only `drums`, `sample` and the General MIDI numbers `000`–`127`.
- **Fixed sentences:** "E101, E102 and E103 replace the exception message … with a fixed sentence of
  ours: the code, then its meaning from `docs/reference/error-codes.md`". E105, E901 and E201–E204
  keep their message.
- **`handled: false`:** "Only the three error pages (E901) and the player failures E201–E204 pass
  it."
- **Every catch reports:** every `catch` clause and `.catch()` callback in `web/` calls `reportError`
  or `noteError`. "A deliberate silence is
  `// eslint-disable-next-line no-restricted-syntax -- <reason>`."
- **The token:** `SENTRY_AUTH_TOKEN` — "Never in chat, never in the repository." "An agent may not
  create accounts or handle the token." Setup section 5 is done by the owner, by hand.
- **Public repository:** no personal data and no machine paths in any committed file.
- **Repository rules** (`AGENTS.md`, `web/AGENTS.md`): tests sit beside their source, never in
  `__tests__/`; `globalThis`, never `window`; never `--no-verify`; code comments name the thing, not
  a task or finding number; the PR body is written before every push.

## Review Focus

Five inputs the spec implies but no test in the spec exercises, most likely first. Each line names
the task that pins it with a test.

1. **A report shaped differently from what the filters expect** — no exception, an exception with
   no frames or no value, a breadcrumb with no `data`, a string reported in place of an `Error`. If
   `beforeSend` throws, Sentry 11 drops that report without a word and never marks the visit
   unhandled (a `callback_error` client report is all that is left). Every filter must return the
   event untouched when a field is missing, and never throw. Pinned in Tasks 3, 4 and 5.
2. **Two opens at once** — a visitor drops a file while a picked file is still opening, and the
   second open returns early (the `openInFlight` guard). The count of running opens must return to
   0 and the tag come back once both end, never stay off for the rest of the visit. Pinned in
   Task 13.
3. **A name that looks like a pattern** — a file called `Song (Live) [v2].gp` or `C++ Riff $1.gp`,
   a track called `.*`. It must be replaced exactly as written, and nothing else in the message may
   change. Pinned in Task 4.
4. **An unusual extension** — `Song.GP5`, `riff.gp.bak`, `README`, `.gp`. They must give `gp5`,
   `other`, `other` and `gp`, never a name. Pinned in Task 10.
5. **A later 11.x renames an integration the filter removes.** The filter matches four names as
   strings, so a renamed `Console` or `Breadcrumbs` would come back silently: console lines can
   quote a broken alphaTex line, and click labels hold track names. A test must fail instead. Pinned
   in Task 6 (an end-to-end check of the SDK's own integration list). The same case pins the IP:
   Sentry 11's default infers each visitor's address, and only `userInfo: false` stops it, so
   `infer_ip` must stay `never` and no envelope may carry `ip_address` (spiked in the plan review:
   without that line, both change).

## Before you start

- **Where:** the branch `claude/sentry-error-monitoring-89abc2`, draft PR
  [#191](https://github.com/leocaseiro/notation-hero/pull/191), Jira
  [NH-124](https://leocaseiro.atlassian.net/browse/NH-124). One PR carries the spec, this plan and
  the code. Move NH-124 to CODE (transition 61) when Task 1 starts.
- **Bring the branch up to date first** — merge `origin/master` (never rebase, never force-push),
  then run `pnpm run lint:md`: the changelog merges with `merge=union`, which can join two entries
  with no blank line between them.
- **The owner's setup (spec section 5) runs beside this plan, by hand.** Nothing here needs it
  until Task 17. Never ask for, read, print or store the token.
- **Commands** (from the repository root):
  - one unit test file: `pnpm --filter @notation-hero/web exec vitest run <path inside web/>`
  - `web/`'s whole unit lane: `pnpm --filter @notation-hero/web run test`
  - lint and types: `pnpm --filter @notation-hero/web run lint` and
    `pnpm --filter @notation-hero/web run typecheck`
  - one end-to-end file:
    `pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e <path inside web/>`.
    Every local run must name its project. Each run builds the app first (two or three minutes).
  - **Before every end-to-end run,** check that nothing already listens on port 4174:
    `lsof -nP -iTCP:4174 -sTCP:LISTEN` must print nothing. Locally the lane reuses a running server
    (`reuseExistingServer: !process.env.CI`), and one built without the fake DSN makes the new cases
    time out on their sentinel instead of failing with a clear cause.
  - tooling tests: `node --test tooling/<name>.test.mjs`, `bash tooling/<name>.test.sh`
- **Commit at every green step,** with the message the step gives, ending with the attribution
  trailer your harness asks for. Lefthook runs the pre-commit checks; never pass `--no-verify`.

## The spec's line numbers, re-mapped

The spec cites lines at the branch's base, `0dd46b52`. Master has since moved `PlayerShell.tsx`
(#185, NH-344). Each line below was matched by its code and its neighbours, not by offset.

| Spec cites (base `0dd46b52`)              | Today                                                  | What is there                                           |
| ----------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| `PlayerShell.tsx:190`                     | `PlayerShell.tsx:184`                                  | the settings read in the `useState` initializer         |
| `PlayerShell.tsx:220`                     | `PlayerShell.tsx:214`                                  | the settings repair write-back                          |
| `PlayerShell.tsx:309`                     | `PlayerShell.tsx:303`                                  | stored settings applied at start (`fillFromJson`)       |
| `PlayerShell.tsx:594`                     | **moved:** `web/lib/alphatab/transport-storage.ts:168` | `persistTransport`'s write — #185 lifted it out         |
| `PlayerShell.tsx:722`                     | `PlayerShell.tsx:696`                                  | the settings write when a row is edited                 |
| `PlayerShell.tsx:743` and `:761`          | `PlayerShell.tsx:717` and `:735`                       | the MIDI and Guitar Pro exports (E401)                  |
| `PlayerShell.tsx:805`                     | `PlayerShell.tsx:779`                                  | `loadAlphaTabEngine().catch(() => null)` (E205)         |
| `PlayerShell.tsx:862`                     | `PlayerShell.tsx:836`                                  | `flushSync(() => setOpening(true))`                     |
| `PlayerShell.tsx:872`                     | `PlayerShell.tsx:846`                                  | the parse catch (E103)                                  |
| `PlayerShell.tsx:873` and `:913`          | `PlayerShell.tsx:847` and `:887`                       | the two `setOpening(false)` calls                       |
| `PlayerShell.tsx:969`                     | `PlayerShell.tsx:943`                                  | the drop path's catch (E101, E102, E105)                |
| `PlayerShell.tsx:561-572` (lap 3, FYI-18) | `PlayerShell.tsx:555-566`                              | the transport restore warning                           |
| — (the other "restore path")              | `PlayerShell.tsx:210-253`                              | the settings restore warning                            |
| `web/e2e/player.e2e.ts:218`, `:267`       | unchanged                                              | the font abort, the SoundFont abort                     |
| `web/e2e/player.e2e.ts:1856`, `:1885`     | unchanged (cases at `:1855`, `:1882`)                  | the out-of-range Zoom, the corrupt settings             |
| — (new since the spec)                    | `web/e2e/player.e2e.ts:1911`, `:1945`                  | **two transport-restore cases #185 added** (see Task 9) |

Unchanged since the base: `OpenFileControl.tsx:75`, `useRestoredTransport.ts:114`,
`NotationSurface.tsx:117`, `:121`, `:126`, `:141`, `AlphaTabEngineContext.tsx:35`,
`live-settings.ts:165`, `settings-storage.ts:195`, `transport-storage.ts:129`,
`web/eslint.config.mjs:68`, `web/app/page.tsx:9`, and line 12 of both `error.tsx` files.

**The count still holds:** 16 catches. `transport-storage.ts` now holds two of them (`:129` and
`:168`), where the spec counted one there and one in `PlayerShell.tsx`.

**One consequence:** the spec says the transport restore's E601 and E603 "stays untested", because
no case stored a bad transport value. #185 added two such cases (`player.e2e.ts:1911` and `:1945`),
so Task 9 gives each the same one-line assertion as the settings cases.

## What was verified before this plan was written

The spec's "To verify at plan time" list, each item run or read on 2026-10-08. "Spike" means a
throwaway build in a separate worktree with `@sentry/nextjs` 11.1.0 installed, a production build,
and a real Chromium run; nothing from it was committed.

| Claim                                                                                                                          | Result                                                                                                                                                                                                                                                                                                                                                                                 | How                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `withSentryConfig` builds beside `reactCompiler`, `transpilePackages`, the AlphaTab copy step and the CSS check (the go/no-go) | **GO**, with one change: in 11.x `withSentryConfig` is exported from **`@sentry/nextjs/config`**, not `@sentry/nextjs` (the old import fails the build with `TypeError: … withSentryConfig is not a function`, and `tsc` with TS2305). The whole build script passed; no line mentions Sentry, a token, source maps or "ACTION REQUIRED"; no `.map` files are emitted without a token. | spike: build, `tsc`                                         |
| The shape of `dataCollection`                                                                                                  | Matches the spec. Every key is optional and an unset key falls back to a permissive default (`true`). `sendDefaultPii` no longer exists.                                                                                                                                                                                                                                               | spike: the installed `.d.ts`                                |
| The browser SDK sends Release Health sessions by default                                                                       | **Yes** (`BrowserSession` is a default integration). One session per page load (`lifecycle: 'page'`); a client-side navigation to `/play` starts none. An uncaught error turns it `unhandled`, never `crashed`.                                                                                                                                                                        | spike: envelopes recorded in Chromium                       |
| The source-map upload reaches the EU region with the organization token alone                                                  | **Expected yes, if `org` is set.** 11.x uploads with the new `sentry` CLI package (JavaScript and WASM, no binary), which asks the API for the organization's region by its slug. No URL setting is needed for sentry.io. Proven only by the first production deploy (setup step 6).                                                                                                   | docs and source read (CLI 0.44.1 installed, 0.45.0 read)    |
| Which Release Health figure is "visits with no unhandled error"                                                                | **100% minus the "Unhandled Session Rate"** on a release's details page (`unhandled_rate(session)` on dashboards). The "Crash Free Rate" stays near 100% for a browser, as the spec says. Confirm in the UI after setup.                                                                                                                                                               | docs read                                                   |
| What AlphaTab's `error` event passes                                                                                           | **Always an `Error`** in 1.8.4 — never a string or a plain object. But its class and `type` field cannot be relied on (minified; lost across the worker), and a SoundFont network failure carries an **empty message**: see question QP-1 below.                                                                                                                                       | spike: every emit site in `alphaTab.core.mjs`, and Chromium |
| Vercel never builds a fork's pull request with Production variables                                                            | **Holds.** A fork's PR gets a Preview deployment, which only sees Preview variables; Git Fork Protection makes a team member authorize the build first. Production variables reach fork code only through a human step (promote to production, or merge).                                                                                                                              | docs read                                                   |
| Playwright can route a request to the `.invalid` host before any DNS lookup                                                    | **Yes.** Seven envelope requests to `https://sentry.invalid/api/1/envelope/…` were routed and answered; none failed.                                                                                                                                                                                                                                                                   | spike: Chromium                                             |

Found on the way, and used below:

- **`urlQueryParams: false` leaves page addresses alone** — the SDK says so in its own source. An
  event's `request.url` and its navigation and fetch breadcrumbs kept their query strings. The spec
  already relies on `scrub.ts` for exactly this, so nothing changes; it is why that cut matters.
- **The Referer header is kept with the value `[Filtered]`**, and the User-Agent is kept — as the
  spec says.
- **`Error.stackTraceLimit` is 50 once the SDK starts** (set by `GlobalHandlers`, which the filter
  keeps), so our own `PlayerShell.tsx` frame survives in an E103's stack.
- **Vitest loads Sentry's Node build** (`build/cjs/index.server.js`) under jsdom, where
  `breadcrumbsIntegration` does not exist. Unit tests therefore never load the real SDK (Task 5).
- **Under Vitest's jsdom, `new DOMException(…, 'SecurityError') instanceof Error` is `false`**
  (browsers say `true`). `isStorageRefusal` reads the error's `name` instead (Task 5).
- **Under Vitest's jsdom, `readFileSync(new URL(…, import.meta.url))` throws** "The URL must be of
  scheme file". Tests read fixtures by path from the package folder:
  `path.join(process.cwd(), 'e2e/fixtures', name)`.
- **A real score parses under jsdom** in about 20 ms: `Punk.gp` gives tracks Drumkit (percussion),
  Distortion Guitar (program 30) and Drumkit Left (percussion), so `drums,030`;
  `guitar-no-percussion.gp` gives one unnamed track on program 25, so `025`. All of `Punk.gp`'s
  title and credit fields are empty.
- **Nothing to approve for pnpm:** the 46 packages under `@sentry/nextjs` carry no
  install scripts; native code arrives only as optional platform packages. `allowBuilds` stays as
  it is.
- **Vercel renamed "Sensitive" environment variables to "Secret"**; existing Sensitive ones are
  treated as Secret. Setup step 5's "marked **Sensitive**" now means marked **Secret**.
- **Sentry emails the owner** when 80% of the monthly error quota is used, and again when it runs
  out (lap 1's Q4). Whether the free plan shows the page that sets those thresholds is not
  documented; check after setup (Task 17).

## Notes the spec review left for the plan

Each lap's `findings.json` under `.spec-triage-loop/2026-10-03-nh-124-sentry-error-monitoring-design/`
recorded notes for this stage. Each one, and where it lands:

| Lap | Note                                                                                                                                                                                                                                                                                              | Lands in                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Each storage catch calls `reportError` or `noteError` itself — `isStorageRefusal(e) ? noteError(…) : reportError(e)` — because the lint rule cannot see a call hidden in a shared helper.                                                                                                         | Task 8                                                                 |
| 1   | End-to-end case 5 blocks storage with `new DOMException('…', 'SecurityError')`, as browsers do; a plain `Error` would now be reported as a bug.                                                                                                                                                   | Task 8                                                                 |
| 1   | `error-reporting.e2e.ts` does not install `failOnUnexpectedPageErrors`: its cases throw on purpose.                                                                                                                                                                                               | Task 6                                                                 |
| 1   | Case 3 activates the Solo button itself from the keyboard. A click on its icon can push the button past Sentry's 80-character ancestor limit, so the case would pass without testing anything.                                                                                                    | Task 12                                                                |
| 2   | Keep `GlobalHandlers`: it raises `Error.stackTraceLimit` to 50, and our E103 frame depends on it (verified again: 50).                                                                                                                                                                            | Task 6 (the filter removes four integrations, never that one)          |
| 2   | AlphaTab's loader turns a throw from any score-loaded listener into its own `error` event during the bundled beat's load. Keep monitoring code out of score-loaded handlers.                                                                                                                      | Tasks 12 and 13: names and tag are set in `runRequestNotation`         |
| 2   | Sentry's crawler and old-browser filters need the User-Agent on error events.                                                                                                                                                                                                                     | Task 6 (`httpHeaders: { allow: ['User-Agent'] }`)                      |
| 2   | `bundleSizeOptimizations` options are webpack-only; `next build` uses Turbopack.                                                                                                                                                                                                                  | Task 1 (not used)                                                      |
| 2   | A shell handler reading React state inside the score-loaded event sees the previous render's state — read `api.score` or a ref.                                                                                                                                                                   | Task 13 (the tag comes from the parsed `score`; a ref for mount)       |
| 2   | Implement lap 2's "Design A": the call sites in the two open paths and the player, the count inside `report.ts`, the swap's tag set just before `setNotation`.                                                                                                                                    | Task 13                                                                |
| 2   | A hung open (an engine import that never settles) keeps the count above 0, so the tag stays off for the rest of the visit — never wrong, only absent.                                                                                                                                             | Task 13 (accepted; stated in a comment)                                |
| 2   | `PlayerShell.test.tsx` has no api, so the loading bar shows from the start: deliver `playerReady` before the open, or "no bar" proves nothing.                                                                                                                                                    | Task 11 (a stand-in api)                                               |
| 2   | Count the font clock only while the page is visible, keep the time left across a hide, and stop it for good at the first finished render — a listener left behind would re-arm it after any tab switch.                                                                                           | Task 14 (a one-second counter with no listener at all)                 |
| 2   | The token check reads `process.env.SENTRY_AUTH_TOKEN`, exits 0 when it is unset, walks the folders with `readdirSync({ recursive, withFileTypes })` (`parentPath` needs Node 20.12; the repo pins 24), and never prints the value.                                                                | Task 2                                                                 |
| 3   | The token check walks `.next/static`, `.next/server` and `public/`; Next copies the 404 and 500 pages into `.next/server/pages`.                                                                                                                                                                  | Task 2                                                                 |
| 3   | `addInstrumentsTag` reads `location.pathname` at capture time; Vitest's jsdom page is `/`, so tag tests set `/play` with `history.replaceState`; import the type as `import type { Event as SentryEvent } from '@sentry/nextjs'` (no `@sentry/core` dependency); skip events whose `type` is set. | Tasks 5 and 13                                                         |
| 3   | Nothing in the test lanes can tell `preprocessEvent` from `beforeSend` (production builds run both inside `captureException`); the sentence in spec 2.3 is what keeps the hook.                                                                                                                   | Task 6 (a comment beside the integration)                              |
| 3   | jsdom has no `document.fonts`; tests that mount `NotationSurface` with an api stub it.                                                                                                                                                                                                            | Tasks 11 and 14                                                        |
| 3   | Put the fixed sentence on the thrown error itself, where Sentry titles a chained error. The sentences are new runtime strings: `shared/src/error-codes.ts` holds the meanings only as comments, and `tooling/check-error-codes.mjs` compares codes, not wording.                                  | Task 5 (a test holds each sentence to the reference page)              |
| 3   | Sentry's own doc comment says a failed upload already throws; its code only logs. Do not rely on the comment.                                                                                                                                                                                     | Task 1 (`errorHandler` rethrows; the 11.1.0 types repeat the comment)  |
| 3   | The transport restore raises E601 and E603 and had no case forcing it.                                                                                                                                                                                                                            | Task 9 (#185 added the cases)                                          |
| 3   | AlphaTab 1.8.4 throws an E103 with no `cause`, so nothing chained can leak; the risk returns with an engine that wraps errors.                                                                                                                                                                    | Task 5 (the sent error is built fresh, with no `cause`)                |
| 3   | The domain move (README's domain line, repeating setup step 6 from the new domain).                                                                                                                                                                                                               | Not this PR — [NH-278](https://leocaseiro.atlassian.net/browse/NH-278) |

## Questions the spec left to the plan

| Question                                                            | Answer                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q2 — does pnpm need `allowBuilds` entries for `@sentry/nextjs`?     | **No.** No install scripts anywhere in its tree (verified).                                                                                                                                                                                                                                                           |
| Q3 — re-check the SDK's behaviour against the version pnpm resolves | Done for 11.1.0: the four integration names, the `unhandled` session status, the `page` session lifecycle, `attachStacktrace` on, permissive `dataCollection` defaults. Task 6's test keeps checking the names on every later version.                                                                                |
| Q5 — how are the three error pages seen in a real browser?          | Task 7: a temporary throw (never committed) under `next dev`, looked at desktop and phone width, screenshots in the PR.                                                                                                                                                                                               |
| Q6 — how does the open-file code key E105?                          | Task 11: the `read` flag chooses the code, the toast id, and (for a drop) the announcement.                                                                                                                                                                                                                           |
| Q7 — blank every chained exception's message for E101–E103?         | Moot: the error sent for those codes is built fresh, with no `cause` (Task 5).                                                                                                                                                                                                                                        |
| Q9 — which end-to-end tests install the envelope recorder?          | `error-reporting.e2e.ts` and the six `player.e2e.ts` cases that gain a reporting assertion. Every other page load sends its session ping to `sentry.invalid`, which never resolves (the `.invalid` domain is reserved, RFC 6761): it fails at the DNS lookup and sends nothing anywhere.                              |
| Q10 — how does `@sentry/nextjs` load under Vitest?                  | As the Node build. `web/vitest.setup.ts` replaces it for every unit test (Task 5): no unit test talks to the real SDK.                                                                                                                                                                                                |
| Q11 — repeat setup step 6 from the new domain                       | Belongs to NH-278.                                                                                                                                                                                                                                                                                                    |
| Q14 — in which order do the commits land?                           | The task order below.                                                                                                                                                                                                                                                                                                 |
| QP-1 (new) — an E202 whose message is empty                         | **Decided in the plan review, lap 1:** a SoundFont network failure reaches the `error` event with the message `""`, which titles its issue only `Error`; `reportError` sends E202's sentence from the reference page in that case, as E101–E103 always do (Task 5, Choice 4). A non-empty E202 keeps its own message. |
| Q8 (lap 2) — how exact is the file size?                            | **Decided in the plan review, lap 1:** rounded up to the next power of two in `reportError` (Task 5, Choice 3); 0 stays 0. An exact size and the type together could identify a widely shared tab file, and a file over the limit already has its own code, E101.                                                     |
| Q12 (lap 3) — the E105 toast after the swap                         | **Decided in the plan review, lap 1:** its own sentence. A catch around the steps after the swap in `runRequestNotation` reports E105 and says `riff.gp opened, but something went wrong on our side. If the player misbehaves, reload the page. (Error E105)`, for a picked and a dropped file alike (Task 11).      |
| Q13 (lap 3) — the picker's announcement                             | **Decided in the plan review, lap 1:** kept as it is. A picked file's E105 is announced by its toast alone, as E101 and E102 are: the toast is a polite live region, so the sentence is heard once. A drop also writes it into the player's announcement.                                                             |

Nothing the spec left to the plan is still open: the owner decided QP-1, Q8, Q12 and Q13 in the
plan review's first lap.

## Choices this plan makes

The spec leaves these open. Each is the simplest reading that keeps every spec promise; the plan
review can overturn any of them.

1. **The SDK is pinned exactly** (`--save-exact`), as `next` and AlphaTab are: the spec's behaviour
   was measured against exact versions, and an upgrade should be a deliberate change.
2. **`org` and `project` go into `next.config.ts` as soon as the owner has them** (not secret). Until
   then they are left out: only a production build on Vercel reads the token, so they are unused.
   The upload looks up the EU region by the `org` slug, so they must be in before the token is in
   Vercel (Task 17) — and the build enforces that order. Sentry's plugin only warns about a missing
   project, then deploys with the maps deleted, which `errorHandler` never sees; so a production
   build that has the token but not both slugs throws, naming them. Approved in the plan review,
   lap 1.
3. **`FileFacts` travels twice:** as the tag `file_type`, so an issue's Tags panel shows the spread
   of file types, and as a `file` context `{ type, bytes }`, shown on each event. `bytes` is
   rounded up to the next power of two (0 stays 0), where the spec sent the exact count: an exact
   size and the type together could single out a widely shared file, and nothing needs the exact
   number. Approved in the plan review, lap 1.
4. **For E101–E103, `reportError` sends a fresh `Error`** holding the fixed sentence, with the
   original's `name` and stack frames and **no `cause`**. No text from the file can travel in the
   message or in a chained error. E202 does the same only when its error arrives with an empty
   message, as a SoundFont network failure does, so its issue is not titled just `Error`; a
   non-empty E202 keeps its own words. Approved in the plan review, lap 1.
5. **`isStorageRefusal` and `noteError` read an error's `name` by shape,** not with
   `instanceof Error`: jsdom's `DOMException` is not an `Error`. The breadcrumb carries the error's
   name, never its message.
6. **The E601 and E603 reports carry fixed text** plus, for E601, the repaired keys' dot-paths
   (`display.scale`) — our schema's names, never a stored value. Each report fires beside its toast,
   inside the same deferred callback, so React's development double-mount cannot send two.
7. **The E204 clock is a one-second counter** that counts a second only while
   `document.visibilityState` is `visible`. It behaves as spec 2.4 describes, to within a second,
   with no `visibilitychange` listener that could be left behind. Under Playwright's fake clock it
   is advanced with `runFor`, which fires every tick; `fastForward` fires a due timer at most once,
   so Task 14 edits the one existing case that used it.
8. **Every unit test runs against a replaced `@sentry/nextjs`** (`web/vitest.setup.ts`).
9. **The two transport-restore cases #185 added** get the same E601 and E603 assertions as the
   settings cases.
10. **Three extra tests** beyond the spec's list, each cheap: the lint canary also checks that the
    browser's global `reportError` is banned; a test holds the fixed sentences to
    `docs/reference/error-codes.md`; and the dropped-file twin of the open-file catch gets an E105
    case (lap 2's R37).
11. **Case 7's fragment is `#anchor-probe-456`,** not `#frag`: four letters could appear in an envelope
    for reasons unrelated to the page address.
12. **Only a production build on Vercel reads the upload token** (`VERCEL_ENV === 'production'`),
    where spec section 4's snippet read the token alone. Sentry's own command-line tools read a
    variable of the same name from a developer's shell, and Playwright passes the shell's variables
    to the build it starts, so a token exported for reading issues would turn every local build and
    end-to-end run into an upload attempt — a refused one with a read-only token, or uploads into
    the production project with a broader one. The token check (Task 2) still reads the raw
    variable: a token in a shell is still worth catching in a browser file. `VERCEL_ENV` needs
    Vercel's system environment variables exposed to the build; the wordmark's version already
    relies on them, and on 2026-10-09 the production bundle carried a `v0.` version, which only a
    `production` build prints. Approved in the plan review, lap 1.

## Commit order

One task, one commit (two where a step says so). Q14 suggested: the build go/no-go, reporting and
scrub, the lint rule and its canary, the instruments lifecycle, E105 with the opening state, the
E204 clock, the token check. This plan keeps that spine and changes three things:

- The **token check** moves up beside the build, because both change only the build.
- The **lint rule** moves to the end. Until every catch reports, the rule would fail `web/`'s lint,
  and each commit must stay green.
- The catch sites are **split by area**, so each commit's test proves one thing.

| #   | Task                                                 | Proves                                          |
| --- | ---------------------------------------------------- | ----------------------------------------------- |
| 1   | Install `@sentry/nextjs`, wrap the build             | the go/no-go, in this worktree                  |
| 2   | The token check                                      | a leaked token fails the build                  |
| 3   | Known engine noise, shared with the end-to-end gate  | one list, two readers                           |
| 4   | The privacy filter, `scrub.ts`                       | names and addresses leave nothing behind        |
| 5   | The reporting functions, `report.ts`                 | codes, levels, fixed sentences, the tag's rules |
| 6   | Start Sentry in the browser; the envelope recorder   | the real SDK runs with the spec's settings      |
| 7   | The three error pages, and the copy                  | every crash reports once; the copy matches      |
| 8   | Storage the browser refuses                          | a breadcrumb, never a report of its own         |
| 9   | Engine-load, export and settings failures            | E201, E205, E401, E601, E602, E603              |
| 10  | The file's type, and E103                            | type and size, never the name                   |
| 11  | The open-file catches, and the opening state         | E101, E102, E105; the bar stops                 |
| 12  | The names arrive before the swap                     | an E105 or E901 quoting a name is filtered      |
| 13  | The `instruments` tag follows the score on screen    | the tag's whole life                            |
| 14  | The music-font clock, and AlphaTab's own error event | E202, E203, E204 in visible time                |
| 15  | The lint rule that keeps every catch reporting       | a silent catch fails lint                       |
| 16  | The documents                                        | README, registry, changelog                     |
| 17  | Before code review                                   | the owner's setup, the slugs, the numbers       |

---

## Tasks

### Task 1: Install `@sentry/nextjs`, wrap the build

The spec's go/no-go: one build with `withSentryConfig` beside everything `next.config.ts` and the
build script already do. It passed in the plan-time spike; this task makes it real in this worktree
and measures the page weight first, because the spec wants a before-and-after number and "before"
only exists until the SDK is installed.

**Files:**

- Modify: `web/package.json` (the dependency), `pnpm-lock.yaml`
- Modify: `web/next.config.ts`
- Not changed: `pnpm-workspace.yaml` (no install scripts to approve — verify in Step 3)

**Interfaces:**

- Consumes: nothing.
- Produces: `@sentry/nextjs` in `web/`'s dependencies; `withSentryConfig` around the existing Next
  config, imported from `@sentry/nextjs/config`; the options in a named
  `const sentryBuildOptions: SentryBuildOptions`, which Task 17 gives `org` and `project`.

- [ ] **Step 1: Measure the JavaScript a cold `/play` load transfers today**

Build and serve the current code:

```bash
pnpm --filter @notation-hero/web run build
pnpm --filter @notation-hero/web exec next start -p 4199
```

Run `next start` in the background and wait until `http://localhost:4199/play` answers. Then save
this script as `web/zz-measure-play-js.mjs` (inside `web/`, so Node finds `@playwright/test`; it is
never committed):

```js
import { chromium } from '@playwright/test';

// The spec's download-size measure: the .js files one cold load of /play transfers, against
// `next start`. Next 16's `next build` no longer prints "First Load JS".
const browser = await chromium.launch();
const page = await browser.newPage();
const sizes = [];
page.on('response', (response) => {
  if (!new URL(response.url()).pathname.endsWith('.js')) return;
  sizes.push(response.finished().then(() => response.request().sizes()));
});
await page.goto('http://localhost:4199/play', { waitUntil: 'networkidle' });
const total = (await Promise.all(sizes)).reduce((sum, size) => sum + size.responseBodySize, 0);
console.log(`JavaScript transferred on a cold /play load: ${(total / 1024).toFixed(1)} KiB`);
await browser.close();
```

Run it from `web/` three times — `node zz-measure-play-js.mjs` — and keep the middle value as
"before". Stop the server. Delete the script: `rm web/zz-measure-play-js.mjs`. Task 17 measures
"after" the same way, from this same text.

- [ ] **Step 2: Install the SDK, pinned exactly**

```bash
pnpm --filter @notation-hero/web add --save-exact @sentry/nextjs@^11
```

pnpm picks the newest 11.x older than seven days (`minimumReleaseAge`). On 2026-10-08 that was
11.1.0; a later run may pick a newer 11.x, which is fine. **Record the version** — it goes in the
PR body and the changelog entry (Task 16). Never add an exclusion to get a newer one.

Expected: `web/package.json` gains `"@sentry/nextjs": "11.x.y"` with no `^`.

- [ ] **Step 3: Check what the install brought**

```bash
git diff --stat
git diff pnpm-workspace.yaml
```

Expected: only `web/package.json` and `pnpm-lock.yaml` changed, and `pnpm-workspace.yaml` did not:
pnpm printed nothing about ignored build scripts, because nothing under `@sentry/nextjs` has one
(the source-map uploader is the `sentry` package, JavaScript and WASM). If pnpm does report an
ignored build script, stop and ask the owner whether to approve it — do not edit `allowBuilds`
yourself.

Then run the same dependency audit CI runs:

```bash
osv-scanner --recursive ./
```

Expected: no advisory in any package the install added. If one appears, stop and ask the owner
whether to fix or defer it. Never add an ignore entry yourself.

- [ ] **Step 4: Wrap the Next config**

Replace `web/next.config.ts` with:

```ts
import { withSentryConfig } from '@sentry/nextjs/config';

import type { SentryBuildOptions } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // SPIKE: set explicitly (App Router defaults it to true) so the AlphaTab mount/dispose lifecycle
  // is provably exercised by React 19's dev-only double-invoke.
  reactStrictMode: true,
  // React Compiler 1.0 — stable top-level option; Babel-based, so builds are slower (accepted).
  reactCompiler: true,
  // The app imports @notation-hero/client as raw .tsx source. Next doesn't transpile
  // node_modules (a workspace package is symlinked there), so the JSX won't parse without this.
  transpilePackages: ['@notation-hero/client', '@notation-hero/shared'],
};

// Sentry's build step: it uploads the production build's source maps to Sentry, then deletes them
// from the deploy. Only a production build on Vercel reads the token: Sentry's own command-line
// tools read a variable of the same name from a developer's shell, and a local build must never
// upload with it. VERCEL_ENV needs Vercel's system environment variables on, which the version
// in the wordmark (scripts/app-version.mjs) already relies on. Previews, CI and local builds
// upload nothing — and, with the hook off, print nothing about it either.
const uploadToken =
  process.env.VERCEL_ENV === 'production' ? process.env.SENTRY_AUTH_TOKEN : undefined;

const sentryBuildOptions: SentryBuildOptions = {
  authToken: uploadToken,
  // The same variable the build script sets for `next build`, so a report always matches its maps.
  release: { name: process.env.NEXT_PUBLIC_APP_VERSION },
  sourcemaps: { disable: !uploadToken },
  useRunAfterProductionCompileHook: Boolean(uploadToken),
  // Sentry's own default only logs a failed release or upload step, deploys anyway and deletes
  // the maps, so that release's frames stay unreadable. Throwing fails the production build
  // instead, and Vercel keeps the previous deployment live. (Sentry's doc comment says the
  // default already throws; its code does not.)
  errorHandler: (error) => {
    throw error;
  },
  // That hook is for navigation tracing, and this site sends errors only.
  suppressOnRouterTransitionStartWarning: true,
  telemetry: false,
};

if (uploadToken && !(sentryBuildOptions.org && sentryBuildOptions.project)) {
  // Sentry's plugin only warns about a missing slug, then deploys with the maps deleted: the very
  // outcome errorHandler exists to prevent. Fail the production build instead.
  throw new Error(
    'web/next.config.ts: set org and project before SENTRY_AUTH_TOKEN reaches a production build.',
  );
}

export default withSentryConfig(nextConfig, sentryBuildOptions);
```

The comment lines above `nextConfig`'s three options are today's, unchanged. `uploadToken` departs
from spec section 4's snippet, which read the token alone (Choice 12); the slug check is Choice 2.

**`org` and `project`:** if the owner has already created the Sentry project (setup step 1), ask for
the two slugs — they are not secret — and add them as the first two options of
`sentryBuildOptions`: `org: '<organization slug>', project: '<project slug>',`. If not, leave them
out: only a production build on Vercel reads the token, so nothing here reads them, and a
production build that has the token without them stops with the error above. Task 17 adds them
before the token reaches Vercel.

- [ ] **Step 5: Build — the go/no-go**

```bash
pnpm --filter @notation-hero/web run build
find web/.next/static -name '*.map' | wc -l
```

Expected: the whole build script passes — the AlphaTab copy, `next build` and
`assert-design-system-css`. Read the build output: no line
mentions Sentry, an auth token, "ACTION REQUIRED" or source maps. `find` prints `0`: no source map
is emitted without a token. The build may print an experimental-option line naming
`clientTraceMetadata`; the wrapper sets it, and with no server SDK it renders nothing.

If the build fails because of the wrapper: stop. The spec's fallback is `@sentry/react` plus an
upload script of our own (decision D1), which is the owner's call.

- [ ] **Step 6: Types and lint**

```bash
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run lint
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add web/package.json pnpm-lock.yaml web/next.config.ts
git commit -m "build(web): add @sentry/nextjs and wrap the Next config (NH-124)"
```

---

### Task 2: The token check

A build step that fails when `SENTRY_AUTH_TOKEN`'s value sits in any file a browser can download
(spec section 4). Nothing puts it there today; this is what would fail if a later change did.

**Files:**

- Create: `web/scripts/assert-no-auth-token.mjs`
- Test: `tooling/assert-no-auth-token.test.mjs` (beside `tooling/assert-design-system-css.test.mjs`;
  `pnpm run test:tooling` runs every `tooling/*.test.mjs`)
- Modify: `web/package.json` (the `build` script)

**Interfaces:**

- Consumes: nothing.
- Produces: `tokenLeakReport({ token, root }): string | null` — `null` when there is no token or no
  browser file holds it; otherwise the failure message, naming the files and never the value. Run
  directly, the script reads `process.env.SENTRY_AUTH_TOKEN` and sets exit code 1 on a leak.

- [ ] **Step 1: Write the failing test**

Create `tooling/assert-no-auth-token.test.mjs`:

```js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { tokenLeakReport } from '../web/scripts/assert-no-auth-token.mjs';

// A fake. The real token never appears in a test, a fixture or a log.
const TOKEN = 'fake-sentry-token-for-the-leak-check';

/** A temp web/ folder holding `files`, laid out the way `next build` and public/ hold them. */
const withWeb = (files, run) => {
  const root = mkdtempSync(join(tmpdir(), 'assert-no-auth-token-'));
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(join(root, dirname(file)), { recursive: true });
      writeFileSync(join(root, file), text);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const CLEAN = {
  '.next/static/chunks/app.js': 'console.log("hello")',
  '.next/server/app/play.html': '<html><body>Player</body></html>',
  '.next/server/pages/404.html': '<html><body>Not found</body></html>',
  'public/notation/1-beat.gp': 'bytes',
};

test('passes when no browser file holds the token', () => {
  withWeb(CLEAN, (root) => assert.equal(tokenLeakReport({ token: TOKEN, root }), null));
});

test('has nothing to check when the build has no token', () => {
  withWeb({ ...CLEAN, '.next/static/chunks/leak.js': `const t = "${TOKEN}";` }, (root) => {
    assert.equal(tokenLeakReport({ token: undefined, root }), null);
    assert.equal(tokenLeakReport({ token: '', root }), null);
  });
});

for (const file of [
  '.next/static/chunks/leak.js',
  '.next/server/app/play.html',
  '.next/server/app/play.rsc',
  'public/leak.txt',
]) {
  test(`fails on the token in ${file}, naming the file but never the value`, () => {
    withWeb({ ...CLEAN, [file]: `before ${TOKEN} after` }, (root) => {
      const report = tokenLeakReport({ token: TOKEN, root });
      assert.ok(report !== null, 'the leak was not found');
      assert.ok(report.includes(file), `the report does not name ${file}`);
      assert.ok(!report.includes(TOKEN), 'the report holds the token itself');
    });
  });
}

test('does not read the build cache, which no browser downloads', () => {
  withWeb({ ...CLEAN, '.next/cache/fetch-cache/entry': TOKEN }, (root) => {
    assert.equal(tokenLeakReport({ token: TOKEN, root }), null);
  });
});

test('run as a script with no token, it exits 0', () => {
  const run = spawnSync(process.execPath, ['web/scripts/assert-no-auth-token.mjs'], {
    env: { ...process.env, SENTRY_AUTH_TOKEN: '' },
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tooling/assert-no-auth-token.test.mjs`
Expected: FAIL — `Cannot find module '…/web/scripts/assert-no-auth-token.mjs'`.

- [ ] **Step 3: Write the script**

Create `web/scripts/assert-no-auth-token.mjs`:

```js
// Fails the build when SENTRY_AUTH_TOKEN's value sits in a file a browser can download.
//
// The token lets anyone holding it upload source maps and create releases in our Sentry
// organization. It lives only in Vercel's Production environment, marked Secret, and only
// next.config.ts reads it: withSentryConfig hands it to the source-map upload and adds none of it
// to the bundle. Nothing else would fail, though, if a later change put it in front of a browser.
// Next copies only NEXT_PUBLIC_ variables into browser JavaScript, but a server component can render
// any variable into a page, and both pages here are static, so `next build` writes them as files
// under .next/server.
//
// So it reads the three folders browsers download from: the scripts and styles under .next/static,
// the pre-rendered pages under .next/server (each page's .html and .rsc, and the 404 and 500 pages),
// and the files in public/. It names the files it finds, never the value. With no token in the
// environment — CI, previews, local builds — there is nothing to look for, so only the production
// build on Vercel runs it for real.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The folders a browser downloads from, relative to web/. */
const BROWSER_FOLDERS = ['.next/static', '.next/server', 'public'];

const filesUnder = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));

/**
 * The failure message when a browser file holds `token`, or null when none does — or when there
 * is no token to look for. The message names each file and never the value.
 *
 * @param {{ token: string | undefined, root?: string }} options
 * @returns {string | null}
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types -- plain .mjs script runs unmodified under node; TS annotation syntax isn't valid here, JSDoc above documents the shape
export function tokenLeakReport({ token, root = WEB }) {
  if (!token) return null;
  const leaks = BROWSER_FOLDERS.map((folder) => path.join(root, folder))
    .filter((folder) => existsSync(folder))
    .flatMap((folder) => filesUnder(folder))
    .filter((file) => readFileSync(file).includes(token))
    .map((file) => path.relative(root, file));
  if (leaks.length === 0) return null;
  return [
    `assert-no-auth-token: SENTRY_AUTH_TOKEN's value is in ${leaks.length} file(s) a browser downloads:`,
    ...leaks.map((file) => `  ${file}`),
    'Remove what put it there. Then the owner rotates the token in Sentry: anyone who loaded those',
    'files could have read it.',
  ].join('\n');
}

// Only check when invoked directly, so the test can import the function without side effects.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const report = tokenLeakReport({ token: process.env.SENTRY_AUTH_TOKEN });
  if (report !== null) {
    console.error(report);
    process.exitCode = 1;
  }
}
```

- [ ] **Step 4: Run the test again**

Run: `node --test tooling/assert-no-auth-token.test.mjs`
Expected: PASS — 8 tests.

- [ ] **Step 5: Run it at the end of every build**

In `web/package.json`, the `build` script becomes:

```json
"build": "node scripts/vendor-alphatab.mjs && NEXT_PUBLIC_APP_VERSION=$(node scripts/app-version.mjs) next build && node scripts/assert-design-system-css.mjs && node scripts/assert-no-auth-token.mjs",
```

Run: `pnpm --filter @notation-hero/web run build`
Expected: PASS, with nothing printed by the new step (no token, nothing to check).

- [ ] **Step 6: Lint and commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm run test:tooling
git add web/scripts/assert-no-auth-token.mjs tooling/assert-no-auth-token.test.mjs web/package.json
git commit -m "build(web): fail the build when the Sentry token reaches a browser file (NH-124)"
```

---

### Task 3: Known engine noise, shared with the end-to-end gate

`web/e2e/page-errors.ts` already excuses two AlphaTab throws (NH-335, NH-338) when every stack frame
sits in the engine bundle. The list moves to `web/lib/monitoring/known-engine-noise.ts`, so the
Sentry filter (Task 6) and the gate read one list (decision D2): fixing NH-335 or NH-338 means
deleting one entry, and both follow.

**Files:**

- Create: `web/lib/monitoring/known-engine-noise.ts`
- Test: `web/lib/monitoring/known-engine-noise.test.ts`
- Modify: `web/e2e/page-errors.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `ENGINE_BUNDLE: '/alphatab/esm/alphaTab.core.mjs'`
  - `KNOWN_ENGINE_NOISE: readonly { ticket: string; message: string }[]`
  - `isKnownEngineNoiseStack(message: string, stack: string): boolean` — for the gate
  - `isKnownEngineNoise(event: NoiseEvent): boolean` — for `beforeSend`; Sentry's `ErrorEvent`
    fits `NoiseEvent`

- [ ] **Step 1: Write the failing test**

Create `web/lib/monitoring/known-engine-noise.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  ENGINE_BUNDLE,
  KNOWN_ENGINE_NOISE,
  isKnownEngineNoise,
  isKnownEngineNoiseStack,
} from './known-engine-noise';

const ENGINE = `https://notationhero.com${ENGINE_BUNDLE}`;
const OURS = 'https://notationhero.com/_next/static/chunks/app/play/page-0a1b2c.js';
const [voices, stop] = KNOWN_ENGINE_NOISE.map((noise) => noise.message);

/** The part of a Sentry event the filter reads: one exception, its message and its frames. */
const event = (value: string, filenames: readonly string[]) => ({
  exception: {
    values: [{ value, stacktrace: { frames: filenames.map((filename) => ({ filename })) } }],
  },
});

describe('isKnownEngineNoise, the Sentry filter', () => {
  it('drops each known throw when every frame sits in the engine bundle', () => {
    expect(isKnownEngineNoise(event(voices, [ENGINE, ENGINE]))).toBe(true);
    expect(isKnownEngineNoise(event(stop, [ENGINE]))).toBe(true);
  });

  it('matches frames Sentry has rewritten to app:/// addresses', () => {
    expect(isKnownEngineNoise(event(voices, [`app://${ENGINE_BUNDLE}`]))).toBe(true);
  });

  it('keeps the same message when one frame is our own code', () => {
    expect(isKnownEngineNoise(event(voices, [ENGINE, OURS]))).toBe(false);
  });

  it('keeps any other message, even one thrown inside the engine', () => {
    expect(isKnownEngineNoise(event('Soundfont is not a valid Soundfont2 file', [ENGINE]))).toBe(
      false,
    );
  });

  it('keeps an event it cannot attribute, and never throws on one', () => {
    expect(isKnownEngineNoise(event(voices, []))).toBe(false);
    expect(isKnownEngineNoise({})).toBe(false);
    expect(isKnownEngineNoise({ exception: {} })).toBe(false);
    expect(isKnownEngineNoise({ exception: { values: [] } })).toBe(false);
    expect(isKnownEngineNoise({ exception: { values: [{ value: voices }] } })).toBe(false);
    expect(isKnownEngineNoise({ exception: { values: [{ stacktrace: { frames: [{}] } }] } })).toBe(
      false,
    );
  });
});

/** A V8 stack string for the known throw: its first line, then one frame in each file given. */
const stack = (...frames: readonly string[]) =>
  [`TypeError: ${voices}`, ...frames.map((frame) => `    at Jn.fromJson (${frame}:1:100)`)].join(
    '\n',
  );

describe('isKnownEngineNoiseStack, the end-to-end gate', () => {
  it('lets the known throw through when every frame sits in the engine bundle', () => {
    expect(isKnownEngineNoiseStack(`TypeError: ${voices}`, stack(ENGINE, ENGINE))).toBe(true);
  });

  it('fails the same words with one frame from our own code', () => {
    expect(isKnownEngineNoiseStack(`TypeError: ${voices}`, stack(ENGINE, OURS))).toBe(false);
  });

  it('fails a stack with no frames at all', () => {
    expect(isKnownEngineNoiseStack(voices, `TypeError: ${voices}`)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/monitoring/known-engine-noise.test.ts`
Expected: FAIL — `Failed to resolve import "./known-engine-noise"`.

- [ ] **Step 3: Write the module**

Create `web/lib/monitoring/known-engine-noise.ts`. The reasons for each entry move here from
`page-errors.ts`; the NH-335 note is corrected on the way: the throw happens on the **main thread**,
in the engine's listener on its worker, not inside the worker.

```ts
/**
 * AlphaTab 1.8.4 throws two errors that break nothing a person can see. Two readers must agree on
 * them: the Sentry filter (web/instrumentation-client.ts), which drops them before they use the
 * monthly quota, and the end-to-end gate (web/e2e/page-errors.ts), which lets them through. One
 * list, so fixing NH-335 or NH-338 means deleting one entry here, and both follow.
 *
 * Each is excused only when EVERY stack frame sits inside the vendored engine bundle. The messages
 * are generic — the engine indexes `.voices` in 62 places — so the same words thrown from our own
 * code still fail the gate and still reach Sentry. The bundle PATH is matched rather than frame
 * names: the build is minified and its names change with every engine version, but
 * web/scripts/vendor-alphatab.mjs serves the engine at a fixed path.
 *
 * Never add a test's own sentinel error here: the Sentry filter reads this list too, and would drop
 * it.
 */

/** The vendored engine bundle, as web/scripts/vendor-alphatab.mjs serves it. */
export const ENGINE_BUNDLE = '/alphatab/esm/alphaTab.core.mjs';

export const KNOWN_ENGINE_NOISE: readonly { readonly ticket: string; readonly message: string }[] =
  [
    {
      // NH-335. Thrown on the MAIN thread, by the engine's listener on its worker, while it
      // deserializes a score the worker sent back. Nothing observable follows — the score renders,
      // a transposition reaches the staff, and playback runs. Ordinary Guitar Pro files reach it:
      // guitar-no-percussion.gp, alphatex-GP5.gp5 and alphatex-GPX.gpx all do, seven times in one
      // open. Every frame of every occurrence is the engine's:
      //     at Jn.fromJson        (…/alphatab/esm/alphaTab.core.mjs)
      //     at jn.Zu              (…/alphatab/esm/alphaTab.core.mjs)
      //     at Worker.<anonymous> (…/alphatab/esm/alphaTab.core.mjs)
      ticket: 'NH-335',
      message: "Cannot read properties of undefined (reading 'voices')",
    },
    {
      // NH-338. The engine's AudioWorklet output has no "has started" flag: play() reaches
      // source.start(0) only inside an async promise, while pause() calls source.stop(0) at once, so
      // a Pause pressed before that promise settles stops a node that never started. Measured 7 of
      // 10 quick Pause presses. The remedy that helps a person — holding Pause back until the output
      // has started — costs responsiveness, and NH-338 carries that decision.
      ticket: 'NH-338',
      message: 'cannot call stop without calling start first',
    },
  ];

const isKnownMessage = (message: string): boolean =>
  KNOWN_ENGINE_NOISE.some((noise) => message.includes(noise.message));

const isEngineFile = (file: string): boolean => file.includes(ENGINE_BUNDLE);

/**
 * For the end-to-end gate: a page error, read from its message and its V8 stack string. A stack
 * with no frames never qualifies — an unattributable throw is exactly what the gate must not let
 * through.
 */
export function isKnownEngineNoiseStack(message: string, stack: string): boolean {
  const frames = stack.split('\n').filter((line) => line.trimStart().startsWith('at '));
  return (
    isKnownMessage(message) && frames.length > 0 && frames.every((frame) => isEngineFile(frame))
  );
}

/** The part of a Sentry event the filter reads. Sentry's own `ErrorEvent` fits this shape. */
export interface NoiseEvent {
  readonly exception?: {
    readonly values?: readonly {
      readonly value?: string;
      readonly stacktrace?: { readonly frames?: readonly { readonly filename?: string }[] };
    }[];
  };
}

/**
 * For Sentry's `beforeSend`: whether EVERY exception in the event is known engine noise, read from
 * Sentry's structured frames. An event with no exception, or an exception with no frames, never
 * qualifies. It must never throw: Sentry 11 drops an event whose `beforeSend` throws.
 */
export function isKnownEngineNoise(event: NoiseEvent): boolean {
  const exceptions = event.exception?.values ?? [];
  return (
    exceptions.length > 0 &&
    exceptions.every((exception) => {
      const frames = exception.stacktrace?.frames ?? [];
      return (
        isKnownMessage(exception.value ?? '') &&
        frames.length > 0 &&
        frames.every((frame) => isEngineFile(frame.filename ?? ''))
      );
    })
  );
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/monitoring/known-engine-noise.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Make the gate read the shared list**

In `web/e2e/page-errors.ts`, delete `ENGINE_BUNDLE`, `ALLOWED` and `framesAreAllEngine` (lines
16–82 today, including their comments — the reasons now live in `known-engine-noise.ts`). Add the
import below the existing one:

```ts
import { expect, test } from '@playwright/test';

import { isKnownEngineNoiseStack } from '../lib/monitoring/known-engine-noise';
```

The `pageerror` listener inside `failOnUnexpectedPageErrors` becomes:

```ts
page.on('pageerror', (error) => {
  // The two known AlphaTab throws, and only when every frame is the engine's. The list, and
  // why each is safe, live in web/lib/monitoring/known-engine-noise.ts — the Sentry filter
  // reads it too.
  if (isKnownEngineNoiseStack(error.message, error.stack ?? '')) return;
  unexpected.push(`${error.message}\n${error.stack ?? '(no stack)'}`);
});
```

Keep the file's first comment block (why page errors are collected at all) and everything below
the listener unchanged.

- [ ] **Step 6: Prove the gate still behaves**

The two cases that meet the known throws must stay green, and nothing else may change:

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/player.e2e.ts -g "no percussion staff|opens alphatex-GP5"
```

Expected: `lsof` prints nothing; then PASS (both cases open files that reach NH-335).

- [ ] **Step 7: Lint, types, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
git add web/lib/monitoring/known-engine-noise.ts web/lib/monitoring/known-engine-noise.test.ts web/e2e/page-errors.ts
git commit -m "test(web): share the known AlphaTab noise list between the e2e gate and monitoring (NH-124)"
```

---

### Task 4: The privacy filter, `scrub.ts`

The names filter (spec 3.2) and the address cut (spec 3.1). It runs inside Sentry's `beforeSend`
and `beforeBreadcrumb` (Task 6); the open paths feed it names (Task 12).

**Files:**

- Create: `web/lib/monitoring/scrub.ts`
- Test: `web/lib/monitoring/scrub.test.ts`

**Interfaces:**

- Consumes: nothing (Sentry types only, through `import type`).
- Produces:
  - `interface ScoreFacts` — the title, subtitle, artist, album, words, music, copyright, tab
    author, instructions, notices, and each track's `name` and `shortName`. AlphaTab's `Score`
    fits it, so callers pass the parsed score itself.
  - `rememberOpenFile(fileName: string): void`
  - `rememberScore(score: ScoreFacts): void`
  - `scrubEvent(event: ErrorEvent): ErrorEvent` — for `beforeSend`
  - `scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb` — for `beforeBreadcrumb`

- [ ] **Step 1: Write the failing test**

Create `web/lib/monitoring/scrub.test.ts`. The names used are invented.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Scrub from './scrub';
import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

// The remembered names live for the whole tab, so each case starts from a fresh copy of the module.
let scrub: typeof Scrub;
beforeEach(async () => {
  vi.resetModules();
  scrub = await import('./scrub');
});

const SCORE: Scrub.ScoreFacts = {
  title: 'Night Drive',
  subTitle: '',
  artist: 'The Example Band',
  album: 'Demo Tapes',
  words: '',
  music: '',
  copyright: '',
  tab: 'Tabbed By Someone',
  instructions: '',
  notices: '',
  tracks: [
    { name: 'Lead Guitar ', shortName: 'L.Gt.' },
    { name: 'Drums (Left Kit)', shortName: 'Drums (Lef' },
    { name: '1', shortName: '1' },
  ],
};

/** An event Sentry built from a thrown Error, with one of our own frames. */
const thrown = (value: string): ErrorEvent => ({
  type: undefined,
  exception: {
    values: [
      {
        type: 'TypeError',
        value,
        stacktrace: { frames: [{ filename: 'app:///_next/static/chunks/Night Drive.js' }] },
      },
    ],
  },
});
const valueOf = (event: ErrorEvent) => event.exception?.values?.[0]?.value;

describe('the names filter', () => {
  it('replaces the file name, the title, the credits and every track name', () => {
    scrub.rememberOpenFile('night-drive.gp');
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent(
      thrown('night-drive.gp: Night Drive by The Example Band, tab Tabbed By Someone, Lead Guitar'),
    );
    expect(valueOf(event)).toBe('[file]: [file] by [file], tab [file], [file]');
  });

  it('leaves names shorter than three characters alone', () => {
    scrub.rememberScore(SCORE);
    expect(valueOf(scrub.scrubEvent(thrown('Error 1 of 2')))).toBe('Error 1 of 2');
  });

  it('never touches stack frames', () => {
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent(thrown('x'));
    expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe(
      'app:///_next/static/chunks/Night Drive.js',
    );
  });

  it('stores a name trimmed, the form the mixer shows', () => {
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent(
      thrown("Cannot read properties of undefined (reading 'Lead Guitar')"),
    );
    expect(valueOf(event)).toBe("Cannot read properties of undefined (reading '[file]')");
  });

  it('replaces the longest name first, so a longer name goes whole', () => {
    scrub.rememberScore(SCORE);
    expect(valueOf(scrub.scrubEvent(thrown('Drums (Left Kit) is muted')))).toBe('[file] is muted');
  });

  it('matches a name as written, never as a pattern', () => {
    scrub.rememberOpenFile('Song (Live) [v2].gp');
    scrub.rememberOpenFile('C++ Riff $1.gp');
    scrub.rememberScore({ ...SCORE, tracks: [{ name: '.*+', shortName: '' }] });
    expect(
      valueOf(scrub.scrubEvent(thrown('Song (Live) [v2].gp and C++ Riff $1.gp, track .*+'))),
    ).toBe('[file] and [file], track [file]');
    expect(valueOf(scrub.scrubEvent(thrown('a.b.c')))).toBe('a.b.c');
  });

  it('filters an event built from text, in its message and in its exception', () => {
    scrub.rememberScore(SCORE);
    const event = scrub.scrubEvent({
      type: undefined,
      message: 'Night Drive failed',
      exception: { values: [{ value: 'Night Drive failed' }] },
    });
    expect(event.message).toBe('[file] failed');
    expect(valueOf(event)).toBe('[file] failed');
  });

  it('never forgets a name within the tab', () => {
    scrub.rememberOpenFile('first-song.gp');
    scrub.rememberOpenFile('second-song.gp');
    expect(valueOf(scrub.scrubEvent(thrown('first-song.gp failed')))).toBe('[file] failed');
  });
});

describe('the address cut', () => {
  it("cuts the event's page address at its first ? or #", () => {
    const event = scrub.scrubEvent({
      type: undefined,
      request: { url: 'https://notationhero.com/play?fbclid=abc#x' },
    });
    expect(event.request?.url).toBe('https://notationhero.com/play');
  });

  it('cuts navigation, fetch and xhr breadcrumbs', () => {
    const navigation = scrub.scrubBreadcrumb({
      category: 'navigation',
      data: { from: '/?fbclid=abc#x', to: '/play#bar-3' },
    });
    expect(navigation.data).toEqual({ from: '/', to: '/play' });
    const fetched = scrub.scrubBreadcrumb({
      category: 'fetch',
      data: { method: 'GET', url: '/play?_rsc=1a2b' },
    });
    expect(fetched.data).toEqual({ method: 'GET', url: '/play' });
  });
});

describe('an event or breadcrumb the filter does not expect', () => {
  it('passes it through untouched, and never throws', () => {
    const bare: ErrorEvent = { type: undefined };
    expect(scrub.scrubEvent(bare)).toEqual({ type: undefined });
    expect(scrub.scrubEvent({ type: undefined, exception: { values: [{}] } })).toEqual({
      type: undefined,
      exception: { values: [{}] },
    });
    const empty: Breadcrumb = {};
    expect(scrub.scrubBreadcrumb(empty)).toEqual({});
    expect(scrub.scrubBreadcrumb({ category: 'navigation', data: { from: 42 } })).toEqual({
      category: 'navigation',
      data: { from: 42 },
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/monitoring/scrub.test.ts`
Expected: FAIL — `Failed to resolve import "./scrub"`.

- [ ] **Step 3: Write the module**

Create `web/lib/monitoring/scrub.ts`:

```ts
import type { Breadcrumb, ErrorEvent } from '@sentry/nextjs';

/**
 * The privacy filter every report passes through before it leaves the browser.
 *
 * The names filter: a file name, a score's title or credits, or a track name quoted in an error's
 * message becomes `[file]`. Click breadcrumbs are off (web/instrumentation-client.ts), so what is
 * left to filter is an error's own text. No message quotes a name today, but a future bug could,
 * and E105, E901 and E201–E204 keep their message.
 *
 * The address cut: a page address loses everything from its first `?` or `#`. Sentry 11's
 * `dataCollection` settings remove neither from the event's address or from its breadcrumbs.
 */

/** The parts of a score that can name it. AlphaTab's own `Score` fits this shape. */
export interface ScoreFacts {
  readonly title: string;
  readonly subTitle: string;
  readonly artist: string;
  readonly album: string;
  readonly words: string;
  readonly music: string;
  readonly copyright: string;
  readonly tab: string;
  readonly instructions: string;
  readonly notices: string;
  readonly tracks: readonly { readonly name: string; readonly shortName: string }[];
}

const REDACTED = '[file]';

// Shorter names are skipped, so a track named `1` cannot rewrite unrelated text.
const SHORTEST_NAME = 3;

// Every name seen in this tab, longest first, so a name that contains a shorter one goes whole.
// Never cleared: an error about one file can be sent after the next file opens.
let names: readonly string[] = [];

function remember(text: string): void {
  const name = text.trim();
  if (name.length < SHORTEST_NAME || names.includes(name)) return;
  names = [...names, name].toSorted((a, b) => b.length - a.length);
}

/** Called when a file is picked or dropped, before it is read. */
export function rememberOpenFile(fileName: string): void {
  remember(fileName);
}

/**
 * Called as soon as a file parses, before the new score replaces the open one: an E105 thrown
 * after the parse, or a crash drawing the new title, keeps its message and is sent before
 * AlphaTab's score-loaded event.
 */
export function rememberScore(score: ScoreFacts): void {
  const credits = [
    score.title,
    score.subTitle,
    score.artist,
    score.album,
    score.words,
    score.music,
    score.copyright,
    score.tab,
    score.instructions,
    score.notices,
  ];
  for (const text of credits) remember(text);
  for (const track of score.tracks) {
    remember(track.name);
    remember(track.shortName);
  }
}

/** `text` with every remembered name replaced, matched as written — never as a pattern. */
function scrubText(text: string): string {
  let scrubbed = text;
  for (const name of names) scrubbed = scrubbed.replaceAll(name, REDACTED);
  return scrubbed;
}

/** An address cut at its first `?` or `#`. */
function cutAddress(address: string): string {
  const cut = address.search(/[?#]/);
  return cut === -1 ? address : address.slice(0, cut);
}

/**
 * Sentry's `beforeSend` half: the names out of the event's free text — each exception's value and
 * the event's `message`, and nothing else — and its page address cut. It must never throw: Sentry
 * 11 drops an event whose `beforeSend` throws.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.message !== undefined) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value !== undefined) exception.value = scrubText(exception.value);
  }
  if (event.request?.url !== undefined) event.request.url = cutAddress(event.request.url);
  return event;
}

/**
 * Sentry's `beforeBreadcrumb`: navigation breadcrumbs carry `from` and `to`, fetch and xhr
 * breadcrumbs carry `url`. Each is cut when it is recorded.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const { data } = breadcrumb;
  if (data === undefined) return breadcrumb;
  for (const key of ['from', 'to', 'url']) {
    const value: unknown = data[key];
    if (typeof value === 'string') data[key] = cutAddress(value);
  }
  return breadcrumb;
}
```

- [ ] **Step 4: Run the test again**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/monitoring/scrub.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Lint, types, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
git add web/lib/monitoring/scrub.ts web/lib/monitoring/scrub.test.ts
git commit -m "feat(web): add the privacy filter Sentry reports pass through (NH-124)"
```

---

### Task 5: The reporting functions, `report.ts`

The one module the rest of `web/` calls (spec 2.3). Under Vitest the SDK would load as its Node
build, so the unit lane replaces it once, in `web/vitest.setup.ts`, for every test file.

**Files:**

- Create: `web/lib/monitoring/report.ts`
- Test: `web/lib/monitoring/report.test.ts`
- Modify: `web/vitest.setup.ts`

**Interfaces:**

- Consumes: `ERROR` and `ErrorCode` from `@notation-hero/shared/error-codes`.
- Produces:
  - `reportError(error: unknown, options?: { code?: ErrorCode; level?: 'error' | 'warning'; file?: { type: string; bytes: number }; handled?: false }): void`
    — calls `captureException(sent, { captureContext })`, or
    `captureException(sent, { mechanism: { handled: false }, captureContext })` when `handled` is
    `false`. `captureContext` is `{ level, tags }` plus `contexts: { file: { type, bytes } }` when
    `file` is given, `bytes` rounded up to a power of two; `tags` holds `code` and `file_type` when
    given. E101–E103 send their fixed sentence in place of the message, and E202 sends its own
    sentence when its message is empty.
  - `noteError(error: unknown, what: string): void` — a breadcrumb
    `{ category: 'notation-hero', level: 'warning', message: what, data: { error: <its name> } }`
  - `isStorageRefusal(error: unknown): boolean`
  - `instrumentsValue(tracks: readonly { program: number; isPercussion: boolean }[]): string`
  - `tagInstruments(value: string): void`, `suspendInstruments(): void`,
    `restoreInstruments(): void`
  - `addInstrumentsTag(event: SentryEvent): void` — Sentry's `preprocessEvent` hook (Task 6)

- [ ] **Step 1: Replace the SDK for every unit test**

In `web/vitest.setup.ts`, change the `vitest` import and add the mock below it:

```ts
import { afterEach, vi } from 'vitest';

// No unit test talks to Sentry. Under jsdom, Vitest loads @sentry/nextjs's Node build, so every
// test file gets this stand-in instead. web/lib/monitoring/report.ts is the only module that calls
// the SDK at runtime, and it calls only these two; a test that needs to see a report reads them.
vi.mock('@sentry/nextjs', () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }));
```

- [ ] **Step 2: Write the failing test**

Create `web/lib/monitoring/report.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/monitoring/report.test.ts`
Expected: FAIL — `Failed to resolve import "./report"`.

- [ ] **Step 4: Write the module**

Create `web/lib/monitoring/report.ts`:

```ts
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
  // Only the error pages (E901) and the player failures E201–E204 pass `handled: false`. It marks
  // the visit unhandled, which is what the interim health number counts.
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

/** The `instruments` value for these tracks: `drums` first, then each program in three digits. */
export function instrumentsValue(
  tracks: readonly { program: number; isPercussion: boolean }[],
): string {
  const programs = [
    ...new Set(tracks.filter((track) => !track.isPercussion).map((track) => track.program)),
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
```

- [ ] **Step 5: Run the test again**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/monitoring/report.test.ts`
Expected: PASS — 24 tests.

- [ ] **Step 6: The whole unit lane still passes with the stand-in SDK**

Run: `pnpm --filter @notation-hero/web run test`
Expected: PASS. Nothing outside `lib/monitoring` imports Sentry yet; this proves the setup file's
mock breaks nothing.

- [ ] **Step 7: Lint, types, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
git add web/lib/monitoring/report.ts web/lib/monitoring/report.test.ts web/vitest.setup.ts
git commit -m "feat(web): add the reporting functions every catch in web/ will call (NH-124)"
```

---

### Task 6: Start Sentry in the browser, and the envelope recorder

`web/instrumentation-client.ts` starts the SDK with the settings of spec 3.3. Every build of the
end-to-end lane gets a fake DSN, and one shared helper routes that host, answers it and records each
envelope, so the real SDK is under test and the app carries no test code.

**Files:**

- Create: `web/instrumentation-client.ts`
- Modify: `web/playwright.e2e.config.ts` (the fake DSN)
- Create: `web/e2e/sentry-envelopes.ts`
- Create: `web/e2e/error-reporting.e2e.ts` (its first three cases; Tasks 8–13 add the rest)

**Interfaces:**

- Consumes: `isKnownEngineNoise`, `KNOWN_ENGINE_NOISE` (Task 3); `scrubEvent`, `scrubBreadcrumb`
  (Task 4); `addInstrumentsTag` (Task 5); `APP_VERSION` (`web/lib/app-version.ts`).
- Produces, in `web/e2e/sentry-envelopes.ts`:
  - `recordSentry(page: Page): Promise<SentryRecorder>` — `raw(): string[]` (every envelope body)
    and `events(): RecordedEvent[]` (error and warning events only)
  - `withCode(recorder, code: string): RecordedEvent[]`
  - `messageOf(event: RecordedEvent): string | undefined`
  - `throwSentinel(page, recorder, text: string, sent?: string): Promise<RecordedEvent>` — `sent`
    is the message the report should carry once the names filter has run, when that differs
  - `interface RecordedEvent` — `level`, `message`, `tags`, `contexts`, `exception`,
    `breadcrumbs`, `sdk`

- [ ] **Step 1: Write the envelope recorder**

Create `web/e2e/sentry-envelopes.ts`:

```ts
import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * The fake DSN every build of this lane reports to (`webServer.env` in
 * web/playwright.e2e.config.ts). `.invalid` is reserved and never resolves (RFC 6761), so a page
 * that does not install this recorder sends its session ping nowhere.
 */
const SENTRY_HOST = 'https://sentry.invalid';

/** What the tests read from a recorded error or warning event. */
export interface RecordedEvent {
  readonly level?: string;
  readonly message?: string;
  readonly tags?: Readonly<Record<string, string>>;
  readonly contexts?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly exception?: {
    readonly values?: readonly {
      readonly value?: string;
      readonly mechanism?: { readonly handled?: boolean };
    }[];
  };
  readonly breadcrumbs?: readonly {
    readonly category?: string;
    readonly message?: string;
    readonly data?: Readonly<Record<string, unknown>>;
  }[];
  readonly sdk?: {
    readonly integrations?: readonly string[];
    readonly settings?: { readonly infer_ip?: string };
  };
}

export interface SentryRecorder {
  /** Every envelope body as it arrived, for "this text appears nowhere" checks. */
  readonly raw: () => string[];
  /** Error and warning events only — never a session ping or a client report. */
  readonly events: () => RecordedEvent[];
}

/** An envelope body: a header line, then pairs of item-header and payload lines. */
function eventsIn(body: string): RecordedEvent[] {
  const lines = body.split('\n').filter((line) => line.length > 0);
  const events: RecordedEvent[] = [];
  for (let at = 1; at + 1 < lines.length; at += 2) {
    const header = JSON.parse(lines[at]) as { readonly type?: string };
    if (header.type === 'event') events.push(JSON.parse(lines[at + 1]) as RecordedEvent);
  }
  return events;
}

/**
 * Routes every request to the fake DSN host, answers it, and records its envelope. Install it
 * BEFORE the first `page.goto`: a report can leave during the first load.
 */
export async function recordSentry(page: Page): Promise<SentryRecorder> {
  const bodies: string[] = [];
  await page.route(`${SENTRY_HOST}/**`, async (route) => {
    bodies.push(route.request().postData() ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return { raw: () => [...bodies], events: () => bodies.flatMap((body) => eventsIn(body)) };
}

/** The events tagged with `code`. */
export const withCode = (recorder: SentryRecorder, code: string): RecordedEvent[] =>
  recorder.events().filter((event) => event.tags?.code === code);

/** The first exception's message, as it was sent. */
export const messageOf = (event: RecordedEvent): string | undefined =>
  event.exception?.values?.[0]?.value;

/**
 * Throws an uncaught error in the page and waits until its report arrives. A throw from a timer
 * reaches the page's `error` handler; a throw directly inside `page.evaluate` only rejects the
 * evaluate call. Every case that expects nothing else to be sent ends with one: without it, a
 * recorder that captured nothing at all would pass. Never add a sentinel's text to the known-noise
 * list — the Sentry filter reads that list too.
 */
export async function throwSentinel(
  page: Page,
  recorder: SentryRecorder,
  text: string,
  // The message the report should carry once the names filter has run, when that differs.
  sent: string = text,
): Promise<RecordedEvent> {
  await page.evaluate((message) => {
    setTimeout(() => {
      throw new Error(message);
    }, 0);
  }, text);
  await expect
    .poll(() => recorder.events().filter((event) => messageOf(event) === sent).length, {
      timeout: 15_000,
    })
    .toBe(1);
  const sentinel = recorder.events().find((event) => messageOf(event) === sent);
  if (sentinel === undefined) throw new Error(`the sentinel "${sent}" was never recorded`);
  return sentinel;
}
```

- [ ] **Step 2: Write the failing end-to-end cases**

Create `web/e2e/error-reporting.e2e.ts`:

```ts
import { expect, test } from '@playwright/test';

import { KNOWN_ENGINE_NOISE } from '../lib/monitoring/known-engine-noise';
import { recordSentry, throwSentinel } from './sentry-envelopes';

// The reporting and privacy cases (spec section 6). Every case throws on purpose, so this file
// does NOT install failOnUnexpectedPageErrors — only *.vr.ts files must. Each case reads event
// envelopes only, never the session ping Release Health sends on every visit, and a case that
// expects something NOT to be sent ends with a sentinel it waits for.

// The integrations Sentry 11.1.0 runs with the settings in web/instrumentation-client.ts, measured
// on 2026-10-08. The filter removes four defaults by NAME, so a later version that renames one
// would bring it back without a word: Console lines can quote a broken alphaTex line, and a click
// breadcrumb records a button's label, which can hold a track name. Any change to this list after
// an upgrade needs a person to check what the new integration collects.
const EXPECTED_INTEGRATIONS = [
  'Breadcrumbs',
  'BrowserSession',
  'ConversationId',
  'CultureContext',
  'Dedupe',
  'EventFilters',
  'FunctionToString',
  'GlobalHandlers',
  'HttpContext',
  'InstrumentsTag',
  'LinkedErrors',
  'NextjsClientStackFrameNormalization',
];

test('the SDK runs with exactly the integrations the spec chose', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/');
  const sentinel = await throwSentinel(page, sentry, 'sentinel: integrations');
  expect([...(sentinel.sdk?.integrations ?? [])].toSorted((a, b) => a.localeCompare(b))).toEqual(
    EXPECTED_INTEGRATIONS,
  );
  // "Anonymously" rests on `userInfo: false` alone. Sentry 11's default infers each visitor's IP:
  // without that line, `infer_ip` reads `auto` and the session ping carries ip_address "{{auto}}".
  expect(sentinel.sdk?.settings?.infer_ip).toBe('never');
  expect(sentry.raw().join('\n')).not.toContain('ip_address');
});

// Case 6. NH-338's throw breaks nothing a person can see; sent as it is, it would use the monthly
// quota on a bug that is already known.
test('known engine noise never reaches Sentry (NH-338)', async ({ page }) => {
  const nh338 = KNOWN_ENGINE_NOISE.find((noise) => noise.ticket === 'NH-338')?.message ?? '';
  const sentry = await recordSentry(page);
  let seen = false;
  page.on('pageerror', (error) => {
    if (error.message.includes(nh338)) seen = true;
  });
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });

  // Play, then Pause at once: the race NH-338 records, measured 7 times in 10.
  for (let attempt = 0; attempt < 20 && !seen; attempt += 1) {
    await play.click();
    await play.click();
    await page.waitForTimeout(300);
  }
  // Without the throw this case proves nothing. When NH-338 is fixed, delete the case.
  expect(seen, 'NH-338 never fired in 20 tries').toBe(true);

  await throwSentinel(page, sentry, 'sentinel: after NH-338');
  expect(sentry.events().filter((event) => JSON.stringify(event).includes(nh338))).toEqual([]);
});

// Case 7. Sentry 11's dataCollection settings leave page addresses alone; scrub.ts cuts them.
test('page addresses reach Sentry without their query or fragment', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/?fbclid=probe123#anchor-probe-456');
  const home = await throwSentinel(page, sentry, 'sentinel: on the home page');
  // A report from `/` never carries the instruments tag.
  expect(home.tags?.instruments).toBeUndefined();

  await page.getByRole('link', { name: 'Play' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await throwSentinel(page, sentry, 'sentinel: after the Play link');

  const raw = sentry.raw().join('\n');
  expect(raw).not.toContain('probe123');
  expect(raw).not.toContain('anchor-probe-456');
});
```

- [ ] **Step 3: Run them to see them fail**

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts
```

Expected: `lsof` prints nothing; then FAIL — each case times out in `throwSentinel`, because no SDK
runs yet and nothing is ever sent.

- [ ] **Step 4: Give the lane its fake DSN**

In `web/playwright.e2e.config.ts`, the `webServer.env` block becomes:

```ts
    env: {
      // NEXT_PUBLIC_* is inlined at BUILD time, which is why the command above runs `pnpm build`
      // under this env rather than only `pnpm start`. Debug prints the visitor's user agent,
      // window size and screen size, so it is never the shipped default — only this lane's build.
      NEXT_PUBLIC_ALPHATAB_LOG_LEVEL: 'Debug',
      // So the real Sentry SDK runs in every build of this lane: CI, local, and the Docker
      // baseline update. `.invalid` never resolves; web/e2e/sentry-envelopes.ts routes and answers
      // it where a case reads what was sent, and elsewhere the session ping goes nowhere.
      NEXT_PUBLIC_SENTRY_DSN: 'https://public@sentry.invalid/1',
    },
```

- [ ] **Step 5: Start the SDK**

Create `web/instrumentation-client.ts`:

```ts
import { breadcrumbsIntegration, init } from '@sentry/nextjs';

import { APP_VERSION } from './lib/app-version';
import { isKnownEngineNoise } from './lib/monitoring/known-engine-noise';
import { addInstrumentsTag } from './lib/monitoring/report';
import { scrubBreadcrumb, scrubEvent } from './lib/monitoring/scrub';

// Next.js runs this file in the browser before the page becomes interactive. It starts Sentry and
// nothing else. With no NEXT_PUBLIC_SENTRY_DSN — `pnpm dev`, unit tests, preview deployments — the
// SDK sends nothing: only Vercel's Production environment holds the DSN.
init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  release: APP_VERSION,
  // Each of these is on by default in Sentry 11. The User-Agent stays, so each issue shows its
  // browser and Sentry's crawler filter can work; the Referer is sent as [Filtered]. Neither key
  // touches the page address — scrub.ts cuts that.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { allow: ['User-Agent'] },
    urlQueryParams: false,
  },
  integrations: (defaults) => [
    ...defaults.filter(
      (integration) =>
        // Console: AlphaTab's console lines can quote a broken alphaTex line. BrowserApiErrors:
        // it wraps the engine's listeners in a frame of ours, so known-engine-noise.ts could no
        // longer match "every frame in the engine bundle". Breadcrumbs: added back below, without
        // clicks. BrowserTracing: errors only, and it adds trace headers to every same-origin
        // request.
        !['Console', 'BrowserApiErrors', 'Breadcrumbs', 'BrowserTracing'].includes(
          integration.name,
        ),
    ),
    // Navigation, fetch and xhr breadcrumbs stay. Click and key-press breadcrumbs go: they record
    // a button's label, and the track buttons are labelled with the track's name.
    breadcrumbsIntegration({ dom: false }),
    // The `instruments` tag, decided by the page at the moment an error is captured. Sentry runs
    // preprocessEvent inside captureException; beforeSend would read the page only as the report
    // leaves, which @sentry/nextjs delays under `next dev`. No test can tell the two hooks apart
    // in a production build, so this comment is what keeps the hook.
    { name: 'InstrumentsTag', preprocessEvent: addInstrumentsTag },
  ],
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: (event) => (isKnownEngineNoise(event) ? null : scrubEvent(event)),
});
```

- [ ] **Step 6: Run the cases again**

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts
```

Expected: PASS — 3 tests. If the integrations case fails on a newer 11.x, read the difference:
an integration that is new or renamed must be checked against the privacy promises before the
expected list changes.

- [ ] **Step 7: The whole behaviour lane still passes with the SDK running**

Every page load in every case now starts Sentry and sends its session ping to `sentry.invalid`.

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e
```

Expected: PASS, with no new failure. (`failOnUnexpectedPageErrors` would fail a case on any
uncaught error the SDK caused.)

- [ ] **Step 8: Lint, types, unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/instrumentation-client.ts web/playwright.e2e.config.ts web/e2e/sentry-envelopes.ts web/e2e/error-reporting.e2e.ts
git commit -m "feat(web): start Sentry in the browser with the spec's privacy settings (NH-124)"
```

---

### Task 7: The three error pages, and the copy

Each error page reports the crash it receives (E901, unhandled), and the new `global-error.tsx`
catches a crash in the root layout itself. The home page and the error pages say what is reported
(spec 3.4).

**Files:**

- Modify: `web/app/error.tsx`, `web/app/play/error.tsx`
- Create: `web/app/global-error.tsx`
- Test: `web/app/error.test.tsx`, `web/app/play/error.test.tsx`, `web/app/global-error.test.tsx`
- Modify: `web/app/page.tsx`
- Modify: `web/e2e/pages.vr.ts-snapshots/landing-chromium-linux.png` (regenerated in Docker)

**Interfaces:**

- Consumes: `reportError` (Task 5); `ERROR.unexpectedCrash` (`E901`).
- Produces: nothing other tasks call.

- [ ] **Step 1: Write the failing page tests**

Create `web/app/error.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { reportError } from '../lib/monitoring/report';
import AppError from './error';

vi.mock('../lib/monitoring/report', () => ({ reportError: vi.fn() }));

test('the error page reports the crash once, and says what a report leaves out', async () => {
  const error = new Error('render crash');
  const reset = vi.fn();
  render(<AppError error={error} reset={reset} />);

  expect(
    screen.getByText(
      'Errors are reported automatically — without your file, its name, or the music in it. Try again, or reload the page.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('Error E901')).toBeInTheDocument();
  expect(vi.mocked(reportError).mock.calls).toEqual([[error, { code: 'E901', handled: false }]]);

  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reset).toHaveBeenCalledOnce();
});
```

Create `web/app/play/error.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { reportError } from '../../lib/monitoring/report';
import PlayerError from './error';

vi.mock('../../lib/monitoring/report', () => ({ reportError: vi.fn() }));

test('the player error page reports the crash once, and says what a report leaves out', async () => {
  const error = new Error('render crash');
  const reset = vi.fn();
  render(<PlayerError error={error} reset={reset} />);

  expect(
    screen.getByText(
      'Errors are reported automatically — without your file, its name, or the music in it. Try again, or reload the page.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('Error E901')).toBeInTheDocument();
  expect(vi.mocked(reportError).mock.calls).toEqual([[error, { code: 'E901', handled: false }]]);

  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reset).toHaveBeenCalledOnce();
});
```

Create `web/app/global-error.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { reportError } from '../lib/monitoring/report';
import GlobalError from './global-error';

vi.mock('../lib/monitoring/report', () => ({ reportError: vi.fn() }));

// Rendering a whole document inside the test's <div> prints one development warning, <html>
// inside a <div>. It does not fail the test.
test('the root error page reports the crash once, and says what a report leaves out', async () => {
  const error = new Error('root layout crash');
  const reset = vi.fn();
  render(<GlobalError error={error} reset={reset} />);

  // React places a <title> in the document head wherever it is rendered.
  expect(document.title).toBe('Notation Hero');
  expect(
    screen.getByText(
      'Errors are reported automatically — without your file, its name, or the music in it. Try again, or reload the page.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('Error E901')).toBeInTheDocument();
  expect(vi.mocked(reportError).mock.calls).toEqual([[error, { code: 'E901', handled: false }]]);

  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reset).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @notation-hero/web exec vitest run app/error.test.tsx app/play/error.test.tsx app/global-error.test.tsx`
Expected: FAIL — the two existing pages show the old sentence and call nothing;
`./global-error` does not resolve.

- [ ] **Step 3: The two error pages report, and say so**

`web/app/error.tsx` becomes:

```tsx
'use client';

import { Button } from '@notation-hero/client';
import { ERROR } from '@notation-hero/shared/error-codes';
import { useEffect } from 'react';

import { reportError } from '../lib/monitoring/report';

export default function AppError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  useEffect(() => reportError(error, { code: ERROR.unexpectedCrash, handled: false }), [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      {/* Not "a report was sent": an ad blocker may have stopped it, and this page cannot know. */}
      <p className="max-w-prose text-muted-foreground">
        Errors are reported automatically — without your file, its name, or the music in it. Try
        again, or reload the page.
      </p>
      <p className="text-sm text-muted-foreground">Error {ERROR.unexpectedCrash}</p>
      <Button className="min-h-11 px-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
```

`web/app/play/error.tsx` becomes:

```tsx
'use client';

import { Button } from '@notation-hero/client';
import { ERROR } from '@notation-hero/shared/error-codes';
import { useEffect } from 'react';

import { reportError } from '../../lib/monitoring/report';

export default function PlayerError({
  error,
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  useEffect(() => reportError(error, { code: ERROR.unexpectedCrash, handled: false }), [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">The player stopped unexpectedly</h1>
      {/* Not "a report was sent": an ad blocker may have stopped it, and this page cannot know. */}
      <p className="max-w-prose text-muted-foreground">
        Errors are reported automatically — without your file, its name, or the music in it. Try
        again, or reload the page.
      </p>
      <p className="text-sm text-muted-foreground">Error {ERROR.unexpectedCrash}</p>
      <Button className="min-h-11 px-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
```

- [ ] **Step 4: Add the root error page**

Create `web/app/global-error.tsx`:

```tsx
'use client';

import { Button } from '@notation-hero/client';
import { ERROR } from '@notation-hero/shared/error-codes';
import { useEffect } from 'react';

import { reportError } from '../lib/monitoring/report';

import './globals.css';

// Catches a crash in the root layout itself, where web/app/error.tsx cannot: it REPLACES the root
// layout, so it brings its own <html> and <body> and its own stylesheet. Without it a root-layout
// crash shows Next's bare default page. A client component cannot export metadata, so React's
// <title> names the tab.
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  useEffect(() => reportError(error, { code: ERROR.unexpectedCrash, handled: false }), [error]);
  return (
    <html lang="en">
      <body>
        <title>Notation Hero</title>
        <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          {/* Not "a report was sent": an ad blocker may have stopped it, and this page cannot know. */}
          <p className="max-w-prose text-muted-foreground">
            Errors are reported automatically — without your file, its name, or the music in it. Try
            again, or reload the page.
          </p>
          <p className="text-sm text-muted-foreground">Error {ERROR.unexpectedCrash}</p>
          <Button className="min-h-11 px-8" onClick={reset}>
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Run the page tests again**

Run: `pnpm --filter @notation-hero/web exec vitest run app/error.test.tsx app/play/error.test.tsx app/global-error.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 6: The home page copy**

`web/app/page.tsx` becomes the file below (spec 3.4). The tagline's second sentence changes and
keeps its two lines — as one paragraph the copy would grow from 119 to 348 characters — and a new
paragraph follows the Play button. The whole file is given, not two fragments: Prettier, which also
formats this plan's code blocks, turns a lone JSX comment followed by an element into statements
and appends a `;` that would render on the page.

```tsx
import { Button } from '@notation-hero/client';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Notation Hero</h1>
      <p className="max-w-prose text-muted-foreground">
        Open a score from your own computer, read it as standard notation, and play along. Your
        scores never leave this device.
      </p>
      {/* min-h-11 = 44px, the minimum touch target (spec §4). The glyph keeps its drawn size;
          only the hit area is padded. */}
      {/* `render`, NOT `asChild`. client/src/components/ui/Button/Button.tsx types its props as
          useRender.ComponentProps<'button'> & VariantProps<typeof buttonVariants> — `asChild`
          appears nowhere in client/src, it was dropped in the Radix -> Base UI migration. The
          precedent is Button.test.tsx:52 and the AsLink story. Passing `asChild` would land as a
          stray DOM attribute and the Link would never render. */}
      <Button render={<Link href="/play" />} className="min-h-11 px-8 text-base">
        Play
      </Button>
      {/* "Counts visits" is Release Health: a small ping on every visit, not only on a crash. The
          kinds of instrument are the `instruments` tag; the type and size go only with a file
          that fails to open. */}
      <p className="text-sm text-muted-foreground">
        This site counts visits and crashes anonymously, and sends an error report when something
        goes wrong. Neither includes your file, its name, or the music in it — only the file&apos;s
        type and size, and the kinds of instrument it uses.
      </p>
    </main>
  );
}
```

- [ ] **Step 7: Regenerate the landing screenshot, in the Linux container**

```bash
pnpm test:web:docker:update
git status --short web/e2e/pages.vr.ts-snapshots/
```

Expected: only `landing-chromium-linux.png` changed. If another baseline changed, the copy is not
why: compare the two images before going on, and do not commit a baseline you cannot explain. Open
the new landing image and check that the paragraph sits below the Play button, in the small muted
style, and reads well at its width (it has no `max-w-prose`, so it can run wider than the tagline
above it). Attach the image to the PR for the owner to see.

- [ ] **Step 8: Look at the three error pages in a real browser**

They render only after a crash, and no screenshot or accessibility lane reaches them. With
`pnpm --filter @notation-hero/web dev` running:

1. Add `throw new Error('render check');` as the first line of `Player()` in
   `web/app/play/PlayerShell.tsx`. Open `/play`, close Next's development overlay, and screenshot
   the page at 1280 × 900 and at 375 × 812.
2. Undo it: `git checkout -- web/app/play/PlayerShell.tsx`.
3. Add the same line as the first line of `Home()` in `web/app/page.tsx`, open `/`, and screenshot
   `web/app/error.tsx` the same way. Undo it by deleting the line you added — not with
   `git checkout`, because `web/app/page.tsx` also holds Step 6's uncommitted copy.
4. Add the same line as the first line of `RootLayout()` in `web/app/layout.tsx`, open `/`, and
   screenshot `global-error.tsx` the same way. Undo it: `git checkout -- web/app/layout.tsx`.

Expected: each page shows its heading, the new sentence, "Error E901" and a Try again button, styled
like the app, with no horizontal scroll at 375 px. `git status` is clean of all three temporary
lines, and `git diff web/app/page.tsx` shows only Step 6's copy change. Put the six screenshots in
the PR.

- [ ] **Step 9: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/app/error.tsx web/app/play/error.tsx web/app/global-error.tsx web/app/error.test.tsx web/app/play/error.test.tsx web/app/global-error.test.tsx web/app/page.tsx web/e2e/pages.vr.ts-snapshots/landing-chromium-linux.png
git commit -m "feat(web): report every render crash, and say what a report holds (NH-124)"
```

---

### Task 8: Storage the browser refuses

Six catches read or write `localStorage`. Storage the browser **refuses** — site data blocked, a
full quota — is the visitor's environment: a breadcrumb (S2b). Anything else thrown in the same
catch is our own reader or writer failing: an error. Each catch tells the two apart in place,
because the lint rule (Task 15) cannot see a call hidden in a shared helper.

**Files:**

- Modify: `web/lib/alphatab/transport-storage.ts` (catches at `:129` and `:168`)
- Modify: `web/app/play/PlayerShell.tsx` (catches at `:184`, `:214`, `:696`)
- Modify: `web/app/play/useRestoredTransport.ts` (catch at `:114`)
- Test: `web/lib/alphatab/transport-storage.test.ts`
- Test: `web/e2e/error-reporting.e2e.ts` (case 5)

**Interfaces:**

- Consumes: `isStorageRefusal`, `noteError`, `reportError` (Task 5); `recordSentry`,
  `throwSentinel` (Task 6).
- Produces: nothing other tasks call.

- [ ] **Step 1: Write the failing unit tests**

In `web/lib/alphatab/transport-storage.test.ts`, add `import { addBreadcrumb, captureException } from '@sentry/nextjs';`
below the `vitest` import, and add this block at the end of the file:

```ts
// A refusal is the visitor's browser, not our bug: a breadcrumb that travels with the next real
// report. Anything else thrown in the same catch is our own reader or writer: an error.
describe('what a storage failure reports', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.mocked(addBreadcrumb).mockClear();
    vi.mocked(captureException).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves only a breadcrumb when the browser blocks the read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    readStoredTransport();
    expect(vi.mocked(addBreadcrumb).mock.calls).toEqual([
      [
        {
          category: 'notation-hero',
          level: 'warning',
          message: 'Transport values could not be read from storage',
          data: { error: 'SecurityError' },
        },
      ],
    ]);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reports an error for anything the browser did not refuse', () => {
    const bug = new TypeError('the reader broke');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw bug;
    });
    readStoredTransport();
    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(vi.mocked(captureException).mock.calls).toEqual([
      [bug, { captureContext: { level: 'error', tags: {} } }],
    ]);
  });

  it('leaves only a breadcrumb when the browser refuses the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    persistTransport({ isLooping: true });
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Transport values could not be saved' }),
    );
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reports an error when the write fails for any other reason', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new TypeError('the writer broke');
    });
    persistTransport({ isLooping: true });
    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/transport-storage.test.ts`
Expected: FAIL — the four new cases; both catches call nothing yet. The existing cases pass.

- [ ] **Step 3: Report from the two transport catches**

In `web/lib/alphatab/transport-storage.ts`, add the import below the file's existing imports:

```ts
import { isStorageRefusal, noteError, reportError } from '../monitoring/report';
```

`readStoredTransport`'s catch (`:129`) becomes:

```ts
  } catch (error) {
    // A fresh object rather than the shared DEFAULT_TRANSPORT_VALUES, so the two paths agree about
    // whether the caller may hold on to what it got. Storage being unreadable is not a repair:
    // nothing was corrected, so `reset` stays false and no warning fires.
    if (isStorageRefusal(error)) noteError(error, 'Transport values could not be read from storage');
    else reportError(error);
    return { values: { ...DEFAULT_TRANSPORT_VALUES }, reset: false, repaired: [] };
  }
```

`persistTransport`'s catch (`:168`) becomes:

```ts
  } catch (error) {
    // Private browsing and a full quota both throw here. Losing persistence is survivable; losing
    // the transport is not, so the toggle carries on either way.
    if (isStorageRefusal(error)) noteError(error, 'Transport values could not be saved');
    else reportError(error);
  }
```

- [ ] **Step 4: Run the unit tests again**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/transport-storage.test.ts`
Expected: PASS.

- [ ] **Step 5: The other four storage catches**

`web/app/play/useRestoredTransport.ts` — add
`import { isStorageRefusal, noteError, reportError } from '../../lib/monitoring/report';` beside its
imports; the write-back catch (`:114`) becomes:

```ts
    } catch (error) {
      // Storage is unavailable or full. The warning is still worth showing.
      if (isStorageRefusal(error)) noteError(error, 'Repaired transport values could not be written back');
      else reportError(error);
    }
```

`web/app/play/PlayerShell.tsx` — add the import beside the other `../../lib/` imports:

```ts
import { isStorageRefusal, noteError, reportError } from '../../lib/monitoring/report';
```

The settings read in the `useState` initializer (`:184`) becomes:

```ts
    } catch (error) {
      // A browser with site data blocked makes the localStorage GETTER itself throw, not only
      // setItem — and this initialiser runs during render, so an unguarded throw takes the whole
      // page. Blocked storage is not a corrupt document: reset stays false, so no toast fires and
      // no repair write happens. Both setItem calls below are guarded the same way. A throw from
      // our own reader lands here too, and that one is a bug.
      if (isStorageRefusal(error)) noteError(error, 'Player settings could not be read from storage');
      else reportError(error);
      return { settings: DEFAULT_PLAYER_SETTINGS, reset: false, repaired: [] };
    }
```

The repair write-back (`:214`) becomes:

```ts
    } catch (error) {
      // Storage is unavailable or full; the warning below is still worth showing.
      if (isStorageRefusal(error)) noteError(error, 'Repaired player settings could not be written back');
      else reportError(error);
    }
```

The write when a row is edited (`:696`) becomes:

```ts
          } catch (error) {
            // Private browsing and a full quota both throw here. Losing persistence is survivable;
            // losing the player is not, so the edit carries on either way.
            if (isStorageRefusal(error)) noteError(error, 'Player settings could not be saved');
            else reportError(error);
          }
```

Prettier may break the longer `noteError` lines in two; let it.

- [ ] **Step 6: Write the end-to-end case, and run it**

Add `case 5` to `web/e2e/error-reporting.e2e.ts`:

```ts
// Case 5. Blocked storage is the visitor's environment: a breadcrumb only (S2b), which travels
// inside the next real report.
test('storage the browser blocks leaves a breadcrumb, never a report of its own', async ({
  page,
}) => {
  const sentry = await recordSentry(page);
  await page.addInitScript(() => {
    // What a browser with site data blocked does: the getter itself throws a SecurityError. A
    // plain Error here would be reported as a bug of ours, correctly.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const sentinel = await throwSentinel(page, sentry, 'sentinel: storage blocked');
  expect(sentry.events()).toHaveLength(1);
  expect(
    sentinel.breadcrumbs?.some(
      (crumb) =>
        crumb.category === 'notation-hero' &&
        crumb.message === 'Player settings could not be read from storage' &&
        crumb.data?.error === 'SecurityError',
    ),
  ).toBe(true);
});
```

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 7: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/lib/alphatab/transport-storage.ts web/lib/alphatab/transport-storage.test.ts web/app/play/PlayerShell.tsx web/app/play/useRestoredTransport.ts web/e2e/error-reporting.e2e.ts
git commit -m "feat(web): note storage the browser refuses, and report our own storage bugs (NH-124)"
```

---

### Task 9: Engine-load, export and settings failures

The engine import (E201), the engine missing when a file is opened (E205), stored settings that
cannot be applied at start, the two exports (E401), a value the engine refuses (E602), and the two
restore warnings (E601, E603).

**Files:**

- Modify: `web/lib/alphatab/AlphaTabEngineContext.tsx` (`:35`)
- Modify: `web/lib/alphatab/live-settings.ts` (`:165`)
- Modify: `web/app/play/PlayerShell.tsx` (`:303`, `:717`, `:735`, `:779`, the settings warning at
  `:210-253`, the transport warning at `:555-566`)
- Test: `web/lib/alphatab/live-settings.test.ts`
- Test: `web/e2e/player.e2e.ts` (the cases at `:1855`, `:1882`, `:1911`, `:1945`)
- Test: `web/e2e/error-reporting.e2e.ts` (case 8)

**Interfaces:**

- Consumes: `reportError`, `noteError` (Task 5); `recordSentry`, `withCode`, `throwSentinel`
  (Task 6); `abortEngine` (`web/e2e/player-states.ts`).
- Produces: nothing other tasks call.

- [ ] **Step 1: Write the failing unit test**

In `web/lib/alphatab/live-settings.test.ts`, add `import { captureException } from '@sentry/nextjs';`
below the `vitest` import, and add this case inside `describe('applyThenPersist — apply BEFORE persist', …)`:

```ts
// A refusal means our own checks let through a value the engine cannot use: a warning, so the
// missing check gets written.
it('reports the refusal to Sentry as an E602 warning', () => {
  vi.mocked(captureException).mockClear();
  const api = createFakeApi();
  const refusal = new Error('Missing font list');
  api.settings.fillFromJson.mockImplementation(() => {
    throw refusal;
  });

  applyThenPersist({
    api: api as unknown as AlphaTab.AlphaTabApi,
    next: { display: { resources: { graceFont: 'bold' } } },
    apply: 'render',
    onRejected: vi.fn(),
    persist: vi.fn(),
  });

  expect(vi.mocked(captureException).mock.calls).toEqual([
    [refusal, { captureContext: { level: 'warning', tags: { code: 'E602' } } }],
  ]);
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/live-settings.test.ts`
Expected: FAIL — the new case only.

- [ ] **Step 2: E602**

In `web/lib/alphatab/live-settings.ts`, add the imports at the top:

```ts
import { ERROR } from '@notation-hero/shared/error-codes';

import { reportError } from '../monitoring/report';
```

The catch in `applyThenPersist` (`:165`) becomes:

```ts
    } catch (error) {
      // The engine refused a value our own checks allowed, so a check is missing.
      reportError(error, { code: ERROR.settingRejected, level: 'warning' });
      onRejected();
      return false;
    }
```

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/live-settings.test.ts`
Expected: PASS.

- [ ] **Step 3: E201, in the engine provider**

In `web/lib/alphatab/AlphaTabEngineContext.tsx`, add the imports:

```ts
import { ERROR } from '@notation-hero/shared/error-codes';

import { reportError } from '../monitoring/report';
```

and the `.catch` becomes:

```ts
      .catch((error: unknown) => {
        if (!disposed) {
          // E201: the player never started. Unhandled, so the visit counts against the health
          // number. Reported where the message is shown, so React's development double-mount —
          // which disposes the first provider — cannot send it twice.
          reportError(error, { code: ERROR.engineImport, handled: false });
          setState({
            engine: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
```

- [ ] **Step 4: E205, the exports, and the settings applied at start**

`web/app/play/PlayerShell.tsx` already imports `ERROR`, and `noteError` and `reportError` since
Task 8, so it needs no new import.

The engine wait in `runRequestNotation` (`:779`) becomes:

```ts
at = await loadAlphaTabEngine().catch((error: unknown) => {
  // A breadcrumb only: the provider has already reported the cause as E201.
  noteError(error, 'The engine was not there when a file was opened (E205)');
  return null;
});
```

The settings applied at start (`:303`) become:

```ts
try {
  engineSettings.fillFromJson(settings as AlphaTab.json.SettingsJson);
} catch (error) {
  // Keep the defaults already on `engineSettings`. The per-key merge makes this unreachable in
  // practice, so a throw here is a bug of ours.
  reportError(error);
}
```

The MIDI export's catch (`:717`) becomes:

```ts
        } catch (error) {
          reportError(error, { code: ERROR.exportFailed });
          toast.error(`That file could not be exported. (Error ${ERROR.exportFailed})`);
        }
```

and the Guitar Pro export's catch (`:735`) the same:

```ts
      } catch (error) {
        reportError(error, { code: ERROR.exportFailed });
        toast.error(`That file could not be exported. (Error ${ERROR.exportFailed})`);
      }
```

- [ ] **Step 5: E601 and E603, beside each restore warning**

Both warnings fire inside a deferred callback, which the effect's cleanup cancels on an unmount.
Each report goes inside the same callback, so React's development double-mount cannot send two, and
every warning shown has exactly one report.

The settings warning's callback (inside the effect at `:210-253`) gains these lines after its
`toast.warning(…)` call:

```ts
// A corrupt stored document means our own code wrote something bad, or an update changed
// which values are valid: a bug signal, so a warning. The repaired keys go as dot-paths —
// the schema's names, never a stored value.
if (named.length > 0) {
  reportError(new Error(`Player settings repaired: ${restored.repaired.join(', ')}`), {
    code: ERROR.settingsRepaired,
    level: 'warning',
  });
} else {
  reportError(new Error('Player settings could not be read'), {
    code: ERROR.settingsUnreadable,
    level: 'warning',
  });
}
```

The transport warning's callback (inside the effect at `:555-566`) gains the same, after its
`toast.warning(…)` call:

```ts
if (named.length > 0) {
  reportError(new Error(`Transport values repaired: ${transportRepaired.join(', ')}`), {
    code: ERROR.settingsRepaired,
    level: 'warning',
  });
} else {
  reportError(new Error('Transport values could not be read'), {
    code: ERROR.settingsUnreadable,
    level: 'warning',
  });
}
```

The transport effect's dependency list stays `[transportRepaired]`: `transportRepaired` is
already in it.

- [ ] **Step 6: The end-to-end assertions**

In `web/e2e/player.e2e.ts`, add the import below the `page-errors` one:

```ts
import { recordSentry, withCode } from './sentry-envelopes';
```

In each of the four restore cases, make `const sentry = await recordSentry(page);` the first line
of the test body (before `addInitScript`), and add one assertion after the toast assertions:

| Case                                                                          | Add                                                                                                   |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `a single out-of-range setting is corrected and the warning NAMES it`         | `await expect.poll(() => withCode(sentry, 'E601').map((event) => event.level)).toEqual(['warning']);` |
| `a corrupt stored value resets with a toast, and the player still starts`     | `await expect.poll(() => withCode(sentry, 'E603').map((event) => event.level)).toEqual(['warning']);` |
| `a single out-of-range transport value is corrected and the warning NAMES it` | `await expect.poll(() => withCode(sentry, 'E601').map((event) => event.level)).toEqual(['warning']);` |
| `a corrupt stored transport resets with a toast, and the player still starts` | `await expect.poll(() => withCode(sentry, 'E603').map((event) => event.level)).toEqual(['warning']);` |

`toEqual(['warning'])` holds only for exactly one event of that code, at warning level.

Add case 8 to `web/e2e/error-reporting.e2e.ts`, importing `abortEngine` and `withCode`:

```ts
import { abortEngine } from './player-states';
import { recordSentry, throwSentinel, withCode } from './sentry-envelopes';
```

```ts
// Case 8. No case in player.e2e.ts aborts the engine module, so E201 gets its own.
test('an engine that never loads sends one unhandled E201', async ({ page }) => {
  // The recorder FIRST: the import fails during abortEngine's own first load of the page.
  const sentry = await recordSentry(page);
  await abortEngine(page);
  await expect(page.getByTestId('engine-error')).toContainText('Error E201', { timeout: 15_000 });

  await throwSentinel(page, sentry, 'sentinel: after E201');
  const reports = withCode(sentry, 'E201');
  expect(reports).toHaveLength(1);
  expect(reports[0]?.level).toBe('error');
  expect(reports[0]?.exception?.values?.[0]?.mechanism?.handled).toBe(false);
});
```

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts e2e/player.e2e.ts -g "E201|out-of-range|corrupt stored"
```

Expected: PASS — case 8 and the four restore cases.

- [ ] **Step 7: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/lib/alphatab/AlphaTabEngineContext.tsx web/lib/alphatab/live-settings.ts web/lib/alphatab/live-settings.test.ts web/app/play/PlayerShell.tsx web/e2e/player.e2e.ts web/e2e/error-reporting.e2e.ts
git commit -m "feat(web): report engine-load, export and stored-settings failures (NH-124)"
```

---

### Task 10: The file's type, and E103

A report may say what kind of file failed, never what it is called. Browsers give `.gp`, `.gp5`,
`.gpx` and `.atex` files an empty MIME type, so the type comes from the name, read once when the file
is read and carried on `LoadedNotation`. Then the parse failure (E103) reports a warning with it.

**Files:**

- Modify: `web/app/play/OpenFileControl.tsx` (`fileType`; `readNotation` carries it)
- Modify: `web/app/play/PlayerShell.tsx` (`LoadedNotation.type`; the E103 catch at `:846`)
- Create: `web/app/play/OpenFileControl.test.tsx`
- Test: `web/e2e/error-reporting.e2e.ts` (case 2)

**Interfaces:**

- Consumes: `reportError` (Task 5); `recordSentry`, `withCode`, `messageOf` (Task 6).
- Produces:
  - `fileType(fileName: string): string` in `OpenFileControl.tsx` — an extension `ACCEPT` lists,
    lower-case, or `other`
  - `LoadedNotation` gains `type: string`; `readNotation(file)` fills it

- [ ] **Step 1: Write the failing test**

Create `web/app/play/OpenFileControl.test.tsx` (Tasks 11 and 13 add to it):

```tsx
import { describe, expect, it } from 'vitest';

import { fileType } from './OpenFileControl';

describe('fileType', () => {
  it('names an extension the picker accepts, in lower case', () => {
    expect(fileType('Song.GP5')).toBe('gp5');
    expect(fileType('riff.gp')).toBe('gp');
    expect(fileType('score.musicxml')).toBe('musicxml');
    expect(fileType('.gp')).toBe('gp');
  });

  it('says other for any other extension, and for none', () => {
    expect(fileType('notes.txt')).toBe('other');
    expect(fileType('riff.gp.bak')).toBe('other');
    expect(fileType('README')).toBe('other');
    expect(fileType('song.')).toBe('other');
  });
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/OpenFileControl.test.tsx`
Expected: FAIL — `fileType` is not exported.

- [ ] **Step 2: Derive the type from `ACCEPT`**

In `web/app/play/OpenFileControl.tsx`, below `ACCEPT`:

```ts
// The types a report may name: each extension in ACCEPT, without its dot.
const ACCEPTED_TYPES: ReadonlySet<string> = new Set(
  ACCEPT.split(',').map((extension) => extension.slice(1)),
);

/**
 * What kind of file this is, for an error report: its extension, in lower case, when the picker
 * accepts it — otherwise `other`. Never the name, which a report must not carry. Browsers give
 * .gp, .gp5, .gpx and .atex files an empty MIME type, so the name is the only source.
 */
export function fileType(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const extension = dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
  return ACCEPTED_TYPES.has(extension) ? extension : 'other';
}
```

and `readNotation` returns the type with the bytes:

```ts
// loadScoreFromBytes takes a Uint8Array, so wrap here rather than at the call site.
return { name: file.name, type: fileType(file.name), bytes: new Uint8Array(buffer) };
```

In `web/app/play/PlayerShell.tsx`, `LoadedNotation` becomes:

```ts
/** What the picker produces: a file read into memory, not yet parsed. */
export interface LoadedNotation {
  name: string;
  /** `fileType(name)`: all an error report may say about the file, with its size. */
  type: string;
  bytes: Uint8Array;
}
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/OpenFileControl.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 3: Write the failing end-to-end case**

Add case 2 to `web/e2e/error-reporting.e2e.ts` (import `messageOf` from `./sentry-envelopes` too):

```ts
// Case 2. The visitor's file, not our bug: a warning, with what kind of file it is and its size.
test('a file that is not a score sends an E103 warning with its type and size, never its name', async ({
  page,
}) => {
  const sentry = await recordSentry(page);
  await page.goto('/play');
  const bytes = Buffer.from('this is not a guitar pro file');
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'secret-song-name.gp5',
    mimeType: 'application/octet-stream',
    buffer: bytes,
  });
  await expect(page.getByText(/\(Error E103\)/)).toBeVisible({ timeout: 15_000 });

  await expect.poll(() => withCode(sentry, 'E103').length).toBe(1);
  const e103 = withCode(sentry, 'E103')[0] ?? {};
  expect(e103.level).toBe('warning');
  expect(e103.tags?.file_type).toBe('gp5');
  // 29 bytes, sent rounded up to the next power of two.
  expect(e103.contexts?.file).toEqual({ type: 'gp5', bytes: 32 });
  // The fixed sentence, not the engine's parse message, which can quote the file.
  expect(messageOf(e103)).toBe('E103: No AlphaTab importer accepts the bytes.');
  expect(sentry.raw().join('\n')).not.toContain('secret-song-name');
});
```

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts -g "E103"
```

Expected: FAIL — no E103 report is sent yet.

- [ ] **Step 4: Report the parse failure**

In `web/app/play/PlayerShell.tsx`, the catch around `loadScoreFromBytes` (`:846`) becomes:

```ts
      } catch (error) {
        // The visitor's file, not our bug: a warning, with its type and size, never its name.
        // reportError sends E103's fixed sentence in place of the engine's parse message, which
        // can quote text from inside the file.
        reportError(error, {
          code: ERROR.notAScore,
          level: 'warning',
          file: { type: next.type, bytes: next.bytes.byteLength },
        });
        setOpening(false);
```

The lines after `setOpening(false);` in that catch stay as they are.

- [ ] **Step 5: Run it again**

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts -g "E103"
```

Expected: PASS.

- [ ] **Step 6: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/app/play/OpenFileControl.tsx web/app/play/OpenFileControl.test.tsx web/app/play/PlayerShell.tsx web/e2e/error-reporting.e2e.ts
git commit -m "feat(web): report a file that is not a score, with its type and size only (NH-124)"
```

---

### Task 11: The open-file catches, and the opening state

Both open paths — the picker (`OpenFileControl`) and a drop (`PlayerShell`) — set a flag between
their two steps: a failure before it is the visitor's file (E101 or E102, a warning); after it, our
own code failed loading a file that was read fine (E105, a new code, an error that keeps its
message). A bug of ours after the swap, with the new score already on screen, is E105 too, but says
so: a catch around the steps after the swap in `runRequestNotation`, which both paths call, reports
it and says the file opened (the plan review, lap 1). And every exit of `requestNotation` now
lowers the opening state, so an E105 no longer leaves the "Loading the player" bar pulsing. This
task also gives `PlayerShell.test.tsx` the stand-in api the next two tasks use.

**Files:**

- Modify: `shared/src/error-codes.ts`, `docs/reference/error-codes.md` (E105)
- Modify: `web/app/play/OpenFileControl.tsx` (`accept`; `loadFailureMessage`; `openFailureCode`'s
  type)
- Modify: `web/app/play/PlayerShell.tsx` (`acceptDropped`; `requestNotation`'s `finally`; the steps
  after the swap in `runRequestNotation`)
- Test: `web/app/play/OpenFileControl.test.tsx`, `web/app/play/PlayerShell.test.tsx`,
  `web/lib/monitoring/report.test.ts`

**Interfaces:**

- Consumes: `reportError` (Task 5); `fileType` (Task 10).
- Produces:
  - `ERROR.openFailedAfterRead: 'E105'`
  - `loadFailureMessage(file: { readonly name: string }): string` in `OpenFileControl.tsx`
  - `openFailureCode(file: File): ErrorCode` (was `string`)
  - in `PlayerShell.test.tsx`: `deliver(name, args?)`, `standInApi()`, `fixture(name)`,
    `pick(file)`, `reported(code)`, `loadingBarGone()`, and `currentApi`

- [ ] **Step 1: The new code, in both places the gate compares**

In `shared/src/error-codes.ts`, after `cachedScoreUnavailable`:

```ts
  /** The file was read, but loading it into the player failed — a bug in our code, not the file. */
  openFailedAfterRead: 'E105',
```

In `docs/reference/error-codes.md`, after the E104 row of the 1xx table:

```markdown
| E105 | The file was read, but loading it into the player failed — a bug in our code, not the file. |
```

```bash
pnpm exec prettier --write docs/reference/error-codes.md
pnpm run check:error-codes
```

Expected: the gate passes. (Prettier realigns the table's columns.)

- [ ] **Step 2: E105 keeps its message — the failing unit cases**

In `web/lib/monitoring/report.test.ts`, inside `describe('reportError', …)`:

```ts
it('E105 keeps its message: it describes our bug, not the file', () => {
  const bug = new Error("Cannot read properties of undefined (reading 'tracks')");
  report.reportError(bug, { code: 'E105', file: { type: 'gp', bytes: 5 } });
  expect(captured()[0]?.[0]).toBe(bug);
});
```

In `web/app/play/OpenFileControl.test.tsx`, replace the imports with:

```tsx
import { toast } from '@notation-hero/client';
import { captureException } from '@sentry/nextjs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenFileControl, fileType } from './OpenFileControl';
```

and add, after the `fileType` block:

```tsx
/** Picks `file` the way the hidden input receives it. */
function pick(file: File): void {
  fireEvent.change(screen.getByTestId('open-file-input'), { target: { files: [file] } });
}

/** A file whose read fails the way a moved or deleted file does. */
function unreadable(name: string): File {
  const file = new File(['x'], name);
  file.arrayBuffer = () =>
    Promise.reject(new DOMException('The file could not be read.', 'NotReadableError'));
  return file;
}

describe('the open-file catch', () => {
  beforeEach(() => {
    vi.mocked(captureException).mockReset();
    vi.restoreAllMocks();
  });

  it('reports a read that fails as an E102 warning: its fixed sentence, its type and size', async () => {
    const toastError = vi.spyOn(toast, 'error');
    render(<OpenFileControl onNotation={vi.fn()} />);
    pick(unreadable('Night Drive.gp'));

    await waitFor(() => expect(captureException).toHaveBeenCalledOnce());
    const [[sent, hint]] = vi.mocked(captureException).mock.calls;
    expect((sent as Error).message).toBe(
      'E102: The browser could not read the file — moved, deleted or unmounted after it was picked.',
    );
    expect(hint).toEqual({
      captureContext: {
        level: 'warning',
        tags: { code: 'E102', file_type: 'gp' },
        contexts: { file: { type: 'gp', bytes: 1 } },
      },
    });
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('(Error E102)'), {
      id: 'E102:Night Drive.gp',
    });
  });

  it('reports a failure after the read as an E105 error that keeps its message', async () => {
    const toastError = vi.spyOn(toast, 'error');
    const bug = new Error("Cannot read properties of undefined (reading 'tracks')");
    render(<OpenFileControl onNotation={() => Promise.reject(bug)} />);
    pick(new File(['bytes'], 'song.gp'));

    await waitFor(() => expect(captureException).toHaveBeenCalledOnce());
    expect(vi.mocked(captureException).mock.calls).toEqual([
      [
        bug,
        {
          captureContext: {
            level: 'error',
            tags: { code: 'E105', file_type: 'gp' },
            // Five bytes, sent rounded up to the next power of two.
            contexts: { file: { type: 'gp', bytes: 8 } },
          },
        },
      ],
    ]);
    expect(toastError).toHaveBeenCalledWith(
      'song.gp could not be opened. Something went wrong on our side, not with your file. Try again, or reload the page. (Error E105)',
      { id: 'E105:song.gp' },
    );
  });
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/OpenFileControl.test.tsx lib/monitoring/report.test.ts`
Expected: FAIL — the two open-file cases (the catch reports nothing); the E105 report case passes
once Step 1's code exists, since nothing replaces E105's message.

- [ ] **Step 3: The picker's catch keys on the read flag**

In `web/app/play/OpenFileControl.tsx`, add the imports:

```tsx
import { reportError } from '../../lib/monitoring/report';
import type { ErrorCode } from '@notation-hero/shared/error-codes';
```

`openFailureCode` now names its type:

```tsx
export function openFailureCode(file: File): ErrorCode {
  return file.size > MAX_NOTATION_BYTES ? ERROR.fileTooLarge : ERROR.fileUnreadable;
}
```

Add, below `readFailureMessage`:

```tsx
/** Toast text for a file that was read but could not be loaded: our bug, not the file (E105). */
export function loadFailureMessage(file: { readonly name: string }): string {
  return `${file.name} could not be opened. Something went wrong on our side, not with your file. Try again, or reload the page. (Error ${ERROR.openFailedAfterRead})`;
}
```

and `accept` becomes:

```tsx
const accept = async (file: File | undefined) => {
  if (!file) return;
  // Set between the two steps. Before it, a failure is the visitor's file: E101 or E102, a
  // warning. After it, our own code failed loading a file that was read fine: E105, an error.
  let read = false;
  try {
    // AWAIT it: onNotation is async, so an un-awaited call drops any rejection on the floor —
    // the same reason the drag-and-drop twin in PlayerShell awaits requestNotation.
    const loaded = await readNotation(file);
    read = true;
    await onNotation(loaded);
  } catch (error) {
    const facts = { type: fileType(file.name), bytes: file.size };
    // Own id, not the spinner's: see the note in PlayerShell. The same file failing the same way
    // twice refreshes one toast rather than stacking a duplicate.
    toast.dismiss('notation-load');
    if (read) {
      reportError(error, { code: ERROR.openFailedAfterRead, file: facts });
      toast.error(loadFailureMessage(file), { id: `${ERROR.openFailedAfterRead}:${file.name}` });
    } else {
      reportError(error, { code: openFailureCode(file), level: 'warning', file: facts });
      toast.error(readFailureMessage(file), { id: `${openFailureCode(file)}:${file.name}` });
    }
  }
};
```

The picker writes no announcement for E105, as for E101 and E102: `OpenFileControl` receives only
`onNotation` (spec 2.4). Its toast is a polite live region, so the sentence is heard once; the plan
review kept it that way (lap 3's Q13, decided in lap 1).

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/OpenFileControl.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 4: The stand-in api for the shell's own tests**

`web/app/play/PlayerShell.test.tsx` has no api, so the player can never report ready and the
loading bar never leaves: a "no bar" assertion there would prove nothing. Replace its imports and
its `useAlphaTab` mock (lines 1–52 today) with the block below. The `settings-paths`,
`next/navigation` and `AlphaTabEngineContext` mocks, and their comments, stay as they are, between
the imports and the new `handlers`.

```tsx
import { readFileSync } from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next, so the double-bundle reason for this fence does not apply
import * as engine from '@coderline/alphatab';
import { toast } from '@notation-hero/client';
import { captureException } from '@sentry/nextjs';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

// … the settings-paths, next/navigation and AlphaTabEngineContext mocks, unchanged …

// Every AlphaTab subscription, kept per event AND per call site, so a case can deliver an event to
// every component listening for it — not only the last one to subscribe. Each call site keeps one
// slot (a ref), so a component that re-renders replaces its own handler instead of adding another.
const handlers = new Map<string, Map<object, (args: unknown) => void>>();
// The api the shell sees. Undefined is the original harness, with no engine at all; a case that
// needs the player ready, or a file opened, sets a stand-in first.
let currentApi: object | undefined;
vi.mock('../../lib/alphatab/useAlphaTab', async () => {
  const { useRef } = await import('react');
  function useAlphaTabEvent(_api: unknown, name: string, handler: (args: unknown) => void): void {
    const slot = useRef({});
    const byName = handlers.get(name) ?? new Map<object, (args: unknown) => void>();
    byName.set(slot.current, handler);
    handlers.set(name, byName);
  }
  return {
    useAlphaTab: () => [currentApi, { current: null }],
    useAlphaTabEvent,
    setAlphaTabValue: () => {},
  };
});

// The step right after the parse and before the swap. A case makes it throw, to stand for a bug of
// ours there.
vi.mock('../../lib/alphatab/playback-selection', () => ({ dropPlaybackSelection: vi.fn() }));

// Imported after the vi.mock calls on purpose: Vitest hoists them, and keeping the import below
// them makes the dependency order readable rather than surprising.
import { dropPlaybackSelection } from '../../lib/alphatab/playback-selection';
import { PlayerShell } from './PlayerShell';

import type { ReactNode } from 'react';

/** Delivers one AlphaTab event to every component subscribed to it. */
const deliver = (name: string, args?: unknown): void => {
  for (const handler of handlers.get(name)?.values() ?? []) handler(args);
};

/**
 * Enough of the live api for the shell, NotationSurface and the popovers to mount, report the
 * player ready, and open a file.
 */
const standInApi = () => ({
  settings: {
    player: { playerMode: engine.PlayerMode.EnabledAutomatic },
    notation: { transpositionPitches: [] as number[] },
  },
  actualPlayerMode: engine.PlayerMode.EnabledSynthesizer,
  isReadyForPlayback: true,
  score: undefined,
  tracks: [],
  playbackRange: null,
  renderScore: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  playPause: vi.fn(),
});

/** A file from web/e2e/fixtures. Read by path: under jsdom, new URL(…, import.meta.url) fails. */
const fixture = (name: string): File =>
  new File([readFileSync(path.join(process.cwd(), 'e2e/fixtures', name))], name);

/** Picks `file` through the real open-file control. */
function pick(file: File): void {
  fireEvent.change(screen.getByTestId('open-file-input'), { target: { files: [file] } });
}

/** The reports sent with `code`, as captureException received them. */
const reported = (code: string) =>
  vi
    .mocked(captureException)
    .mock.calls.filter(
      ([, hint]) =>
        (hint as { captureContext?: { tags?: { code?: string } } } | undefined)?.captureContext
          ?.tags?.code === code,
    );

/** Waits until the loading bar has left the page: it fades for 700 ms once nothing is pending. */
const loadingBarGone = () =>
  waitFor(
    () => expect(screen.queryByRole('progressbar', { name: 'Loading the player' })).toBeNull(),
    { timeout: 3000 },
  );

beforeEach(() => {
  handlers.clear();
  currentApi = undefined;
  vi.mocked(captureException).mockReset();
  vi.mocked(dropPlaybackSelection).mockReset();
  // jsdom has no document.fonts, and NotationSurface listens on it as soon as an api exists.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { addEventListener: () => {}, removeEventListener: () => {} },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

In `runFrames`, the delivery becomes `deliver('playerPositionChanged', { … })` with the same
object as today.

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/PlayerShell.test.tsx`
Expected: PASS — the original case, unchanged by the new harness.

- [ ] **Step 5: The opening state and the drop path — failing cases**

Add to `web/app/play/PlayerShell.test.tsx`:

```tsx
test('an open that fails after the parse shows E105 and leaves no loading bar', async () => {
  currentApi = standInApi();
  const toastError = vi.spyOn(toast, 'error');
  vi.mocked(dropPlaybackSelection).mockImplementation(() => {
    throw new Error('a bug of ours, after the parse');
  });
  render(<PlayerShell />);
  act(() => deliver('playerReady'));
  // First, the bar must be gone with the player ready; otherwise "no bar" below proves nothing.
  await loadingBarGone();

  pick(fixture('Punk.gp'));
  await waitFor(
    () =>
      expect(toastError).toHaveBeenCalledWith(expect.stringContaining('(Error E105)'), {
        id: 'E105:Punk.gp',
      }),
    { timeout: 5000 },
  );
  await loadingBarGone();
});

test('a dropped file that fails after the read reports E105 and announces it', async () => {
  currentApi = standInApi();
  vi.mocked(dropPlaybackSelection).mockImplementation(() => {
    throw new Error('a bug of ours, after the parse');
  });
  render(<PlayerShell />);

  fireEvent.drop(screen.getByTestId('drop-zone'), {
    dataTransfer: { files: [fixture('Punk.gp')] },
  });
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  expect(await screen.findByText('Punk.gp could not be opened. Error E105.')).toBeInTheDocument();
});

test('a picked file whose open fails after the swap says it opened, and reports E105 once', async () => {
  currentApi = standInApi();
  const toastError = vi.spyOn(toast, 'error');
  // The first step after the swap. A throw there stands for a bug of ours with the score on screen.
  vi.spyOn(toast, 'success').mockImplementation(() => {
    throw new Error('a bug of ours, after the swap');
  });
  render(<PlayerShell />);
  act(() => deliver('playerReady'));
  await loadingBarGone();

  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  expect(toastError).toHaveBeenCalledWith(
    'Punk.gp opened, but something went wrong on our side. If the player misbehaves, reload the page. (Error E105)',
    { id: 'E105:Punk.gp' },
  );
  expect(toastError).not.toHaveBeenCalledWith(
    expect.stringContaining('could not be opened'),
    expect.anything(),
  );
  await loadingBarGone();
});

test('a dropped file whose open fails after the swap says it opened, not that it failed', async () => {
  currentApi = standInApi();
  const toastError = vi.spyOn(toast, 'error');
  vi.spyOn(toast, 'success').mockImplementation(() => {
    throw new Error('a bug of ours, after the swap');
  });
  render(<PlayerShell />);

  fireEvent.drop(screen.getByTestId('drop-zone'), {
    dataTransfer: { files: [fixture('Punk.gp')] },
  });
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  expect(toastError).toHaveBeenCalledWith(
    expect.stringContaining('Punk.gp opened, but something went wrong on our side.'),
    { id: 'E105:Punk.gp' },
  );
  expect(screen.queryByText('Punk.gp could not be opened. Error E105.')).toBeNull();
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/PlayerShell.test.tsx`
Expected: FAIL — the first case's last wait times out (the bar keeps pulsing: the throw skips both
`setOpening(false)` calls), and the second never sees an E105 (the drop's catch reports nothing
yet). Of the two after-the-swap cases, the picked file's toast says "could not be opened" (the
throw reaches the picker's catch), and the dropped file's never sees an E105.

- [ ] **Step 6: The drop path, and every exit lowers the opening state**

In `web/app/play/PlayerShell.tsx`, extend the `./OpenFileControl` import:

```tsx
import {
  OpenFileControl,
  fileType,
  loadFailureMessage,
  openFailureCode,
  readFailureMessage,
  readNotation,
} from './OpenFileControl';
```

`requestNotation` becomes:

```tsx
const requestNotation = useCallback(
  async (next: LoadedNotation) => {
    if (openInFlight.current) return;
    openInFlight.current = true;
    try {
      await runRequestNotation(next);
    } finally {
      openInFlight.current = false;
      // Every exit lowers the opening state, a throw after the parse included: without this,
      // that throw skipped both calls that lower it and the bar kept pulsing beside the error.
      // The early return above stays outside the `try`, so a second open never lowers the bar
      // of the open still running.
      setOpening(false);
    }
  },
  [runRequestNotation],
);
```

In the comment block above `openInFlight`, delete the last line, "PRE-EXISTING: this path is
unchanged by this feature, and the race predates it." — this change touches the path.

In `runRequestNotation`, the lines after `setNotation({ name: next.name, score });` and
`setOpening(false);` — `toast.success` through `playRef.current?.focus();`, with their comments
unchanged — move inside their own `try`:

```tsx
// The new score is on screen from here, so a bug of ours in the steps left must not say the file
// "could not be opened": this catch reports it as E105 with its own sentence, and the open ends
// here instead of reaching either open path's catch. No announcement: the toast is a polite live
// region, as the picker's E105 already relies on.
try {
  toast.success(`${next.name} loaded`, { id: 'notation-load' });
  // Success only. None of this is reachable from the cancel path or the parse failure (both
  // returned above), from the read failures the picker catches, or for the bundled score —
  // nobody asked for that one, so nothing is announced and nothing is focused at page load.
  setAnnouncement(`Opened ${next.name}`);
  // A later success contradicts an earlier open-a-file failure, so the stale 1xx toasts go.
  // 2xx engine failures are NOT toasts — they render over the notation area — so nothing
  // here reaches them.
  dismissErrors((id) => id.startsWith('E1'));
  playRef.current?.focus();
} catch (error) {
  reportError(error, {
    code: ERROR.openFailedAfterRead,
    file: { type: next.type, bytes: next.bytes.byteLength },
  });
  // The loading toast, or the "loaded" toast that replaced it, gives way to the error.
  toast.dismiss('notation-load');
  toast.error(
    `${next.name} opened, but something went wrong on our side. If the player misbehaves, reload the page. (Error ${ERROR.openFailedAfterRead})`,
    { id: `${ERROR.openFailedAfterRead}:${next.name}` },
  );
}
```

The toast keeps E105's id for that file, so it replaces a stale "could not be opened" toast for the
same file, and a later successful open dismisses it with the other 1xx toasts.

`acceptDropped` becomes:

```tsx
const acceptDropped = useCallback(
  async (file: File | undefined) => {
    if (!file) return;
    // Set between the two steps, as in OpenFileControl's `accept`: before it, the visitor's file
    // (E101 or E102, a warning); after it, our own code (E105, an error).
    let read = false;
    try {
      const loaded = await readNotation(file);
      read = true;
      await requestNotation(loaded);
    } catch (error) {
      const code = read ? ERROR.openFailedAfterRead : openFailureCode(file);
      const facts = { type: fileType(file.name), bytes: file.size };
      if (read) reportError(error, { code, file: facts });
      else reportError(error, { code, level: 'warning', file: facts });
      // Same id as requestNotation's loading toast — see OpenFileControl's `accept`.
      toast.dismiss('notation-load');
      toast.error(read ? loadFailureMessage(file) : readFailureMessage(file), {
        id: `${code}:${file.name}`,
      });
      setAnnouncement(`${file.name} could not be opened. Error ${code}.`);
    }
  },
  [requestNotation],
);
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/PlayerShell.test.tsx app/play/OpenFileControl.test.tsx lib/monitoring/report.test.ts`
Expected: PASS.

- [ ] **Step 7: The end-to-end lane's open cases still pass**

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/player.e2e.ts -g "25 MB|unsupported|not a score|dragging|corrupt replacement"
```

Expected: PASS — E101, E103 and the drop cases still show their toasts.

- [ ] **Step 8: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add shared/src/error-codes.ts docs/reference/error-codes.md web/app/play/OpenFileControl.tsx web/app/play/OpenFileControl.test.tsx web/app/play/PlayerShell.tsx web/app/play/PlayerShell.test.tsx web/lib/monitoring/report.test.ts
git commit -m "feat(web): tell the visitor's file from our own bug when an open fails (E105) (NH-124)"
```

---

### Task 12: The names arrive before the swap

The names filter can only remove a name it has seen. Picking or dropping a file remembers its name
before it is read, and `runRequestNotation` remembers the score's names as soon as it parses —
before the new score replaces the open one, because an E105 thrown after the parse, or a crash
while the header draws the new title (E901), keeps its message and is sent before AlphaTab's
score-loaded event.

**Files:**

- Modify: `web/app/play/OpenFileControl.tsx`, `web/app/play/PlayerShell.tsx`
- Test: `web/app/play/PlayerShell.test.tsx`, `web/e2e/error-reporting.e2e.ts` (case 3)

**Interfaces:**

- Consumes: `rememberOpenFile`, `rememberScore`, `scrubEvent` (Task 4); the Task 11 harness;
  `recordSentry`, `throwSentinel`, `messageOf` (Task 6).
- Produces: nothing other tasks call.

- [ ] **Step 1: Write the failing unit case**

In `web/app/play/PlayerShell.test.tsx`, wrap `rememberScore` so a case can see WHEN it ran (its
behaviour is unchanged), beside the other `vi.mock` calls:

```tsx
vi.mock('../../lib/monitoring/scrub', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  const rememberScore = real.rememberScore as (score: unknown) => void;
  return { ...real, rememberScore: vi.fn(rememberScore) };
});
```

import `rememberScore` and `scrubEvent` beside `dropPlaybackSelection`:

```tsx
import { rememberScore, scrubEvent } from '../../lib/monitoring/scrub';
```

and add:

```tsx
test("the score's names are remembered before the swap, so an E105 quoting one is filtered", async () => {
  currentApi = standInApi();
  // Earlier cases opened files too; only this case's call may count.
  vi.mocked(rememberScore).mockClear();
  vi.mocked(dropPlaybackSelection).mockImplementation(() => {
    throw new Error("Cannot read properties of undefined (reading 'Distortion Guitar')");
  });
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });

  // The names arrived before the step that threw. The list lasts the whole tab, so the order of
  // the two calls is the proof, whatever an earlier case in this file has already remembered.
  const [remembered] = vi.mocked(rememberScore).mock.invocationCallOrder;
  const [threw] = vi.mocked(dropPlaybackSelection).mock.invocationCallOrder;
  expect(remembered).toBeLessThan(threw ?? 0);

  // And once filtered, the report's message holds no name.
  const [[bug]] = reported('E105');
  const event = scrubEvent({
    type: undefined,
    exception: { values: [{ value: (bug as Error).message }] },
  });
  expect(event.exception?.values?.[0]?.value).toBe(
    "Cannot read properties of undefined (reading '[file]')",
  );
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/PlayerShell.test.tsx`
Expected: FAIL — `remembered` is `undefined`: nothing calls `rememberScore` yet.

- [ ] **Step 2: Remember the names**

In `web/app/play/OpenFileControl.tsx`, extend the monitoring import:

```tsx
import { reportError } from '../../lib/monitoring/report';
import { rememberOpenFile } from '../../lib/monitoring/scrub';
```

and make `rememberOpenFile(file.name);` the first line of `accept` after `if (!file) return;`.

In `web/app/play/PlayerShell.tsx`, add the import:

```tsx
import { rememberOpenFile, rememberScore } from '../../lib/monitoring/scrub';
```

make `rememberOpenFile(file.name);` the first line of `acceptDropped` after `if (!file) return;`,
and in `runRequestNotation`, right after the `try`/`catch` around `loadScoreFromBytes` and before
`if (wasPlaying) api?.pause();`, add:

```tsx
// Remembered now, before anything else can fail: an E105 thrown below, or a crash while the
// header draws the new title, keeps its message and is sent before AlphaTab's score-loaded
// event. The names filter removes only names it has seen.
rememberScore(score);
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/PlayerShell.test.tsx`
Expected: PASS.

- [ ] **Step 3: Write the end-to-end case, and run it**

Add case 3 to `web/e2e/error-reporting.e2e.ts`:

```ts
// Case 3. `transposed.alphatex` has a title ("Transposed") and two named tracks ("Lead",
// "Rhythm"), so every kind of name the filter knows is present.
test('a report holds no click, no console line, and no name from the file', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/transposed.alphatex');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    'transposed.alphatex',
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  // Solo a track from the keyboard, ON the button itself: a click lands on the icon inside it,
  // which can leave the button beyond Sentry's 80-character limit for a click's ancestors — and
  // then no label is recorded even with click breadcrumbs on, so the case would test nothing.
  await page.getByTestId('tracks-trigger').click();
  await page.getByRole('button', { name: 'Solo Rhythm' }).focus();
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    console.error('console-marker-7f3a');
  });

  const report = await throwSentinel(
    page,
    sentry,
    "privacy probe: (reading 'Rhythm')",
    "privacy probe: (reading '[file]')",
  );
  expect(report.breadcrumbs?.some((crumb) => crumb.category?.startsWith('ui.'))).toBe(false);
  const raw = sentry.raw().join('\n');
  for (const text of [
    'transposed.alphatex',
    'Transposed',
    'Rhythm',
    'Lead',
    'console-marker-7f3a',
  ]) {
    expect(raw, `the envelope holds "${text}"`).not.toContain(text);
  }
});
```

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts -g "no click"
```

Expected: PASS.

- [ ] **Step 4: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/app/play/OpenFileControl.tsx web/app/play/PlayerShell.tsx web/app/play/PlayerShell.test.tsx web/e2e/error-reporting.e2e.ts
git commit -m "feat(web): remember a file's names as it opens, so the filter can remove them (NH-124)"
```

---

### Task 13: The `instruments` tag follows the score on screen

Lap 2's "Design A" with lap 3's integration (spec 2.3): the player sets `sample` each time it
mounts; picking or dropping a file takes the tag off until that open ends; `runRequestNotation`
sets the opened score's value just before the swap, only while the player that started the open is
still mounted. AlphaTab's score-loaded event never sets it: that event also fires for the bundled
beat, sometimes after the visitor's file.

**Files:**

- Modify: `web/app/play/OpenFileControl.tsx`, `web/app/play/PlayerShell.tsx`
- Test: `web/app/play/OpenFileControl.test.tsx`, `web/app/play/PlayerShell.test.tsx`,
  `web/e2e/error-reporting.e2e.ts` (cases 1 and 4)

**Interfaces:**

- Consumes: `instrumentsValue`, `tagInstruments`, `suspendInstruments`, `restoreInstruments`,
  `addInstrumentsTag` (Task 5); the Task 11 harness.
- Produces: nothing other tasks call.

- [ ] **Step 1: The picker's half — a failing case**

In `web/app/play/OpenFileControl.test.tsx`, add the imports:

```tsx
import { addInstrumentsTag, tagInstruments } from '../../lib/monitoring/report';
import type * as Sentry from '@sentry/nextjs';
```

a helper at module scope, above `describe('the open-file catch', …)`:

```tsx
/** The instruments tag Sentry's hook would add to a report captured right now. */
const tagNow = () => {
  const event: Sentry.Event = {};
  addInstrumentsTag(event);
  return event.tags?.instruments;
};
```

and the case, inside that `describe`:

```tsx
it('carries no instruments tag on either failure, and puts it back once the open ends', async () => {
  // What Sentry's hook reads at the moment of each report, on /play.
  history.replaceState(null, '', '/play');
  const atCapture: unknown[] = [];
  vi.mocked(captureException).mockImplementation(() => {
    atCapture.push(tagNow());
    return 'event-id';
  });
  tagInstruments('drums,030');

  const { unmount } = render(
    <OpenFileControl onNotation={() => Promise.reject(new Error('our bug'))} />,
  );
  pick(unreadable('first.gp'));
  await waitFor(() => expect(atCapture).toHaveLength(1));
  pick(new File(['bytes'], 'second.gp'));
  await waitFor(() => expect(atCapture).toHaveLength(2));

  expect(atCapture).toEqual([undefined, undefined]);
  expect(tagNow()).toBe('drums,030');
  unmount();
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/OpenFileControl.test.tsx`
Expected: FAIL — both reports carry `drums,030`: nothing suspends the tag yet.

- [ ] **Step 2: Suspend and restore around both open paths**

In `web/app/play/OpenFileControl.tsx`, the monitoring import becomes:

```tsx
import { reportError, restoreInstruments, suspendInstruments } from '../../lib/monitoring/report';
```

and `accept` gains two calls and a `finally`:

```tsx
const accept = async (file: File | undefined) => {
  if (!file) return;
  rememberOpenFile(file.name);
  // While this open runs, no report carries the instruments tag: a failure while opening must
  // never carry the last song's instruments. The `finally` puts it back when the open ends.
  suspendInstruments();
  // Set between the two steps. Before it, a failure is the visitor's file: E101 or E102, a
  // warning. After it, our own code failed loading a file that was read fine: E105, an error.
  let read = false;
  try {
    // … unchanged …
  } catch (error) {
    // … unchanged …
  } finally {
    restoreInstruments();
  }
};
```

In `web/app/play/PlayerShell.tsx`, extend the monitoring import:

```tsx
import {
  instrumentsValue,
  isStorageRefusal,
  noteError,
  reportError,
  restoreInstruments,
  suspendInstruments,
  tagInstruments,
} from '../../lib/monitoring/report';
```

and `acceptDropped` gains the same: `suspendInstruments();` after `rememberOpenFile(file.name);`,
and `finally { restoreInstruments(); }` after its `catch` block.

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/OpenFileControl.test.tsx`
Expected: PASS.

- [ ] **Step 3: The player's half — failing cases**

In `web/app/play/PlayerShell.test.tsx`, add the imports:

```tsx
import { addInstrumentsTag } from '../../lib/monitoring/report';
import type * as Sentry from '@sentry/nextjs';
```

and these helpers and cases:

```tsx
/** The instruments tag a report captured on `pathname` would carry right now. */
function tagNow(pathname = '/play'): unknown {
  history.replaceState(null, '', pathname);
  const event: Sentry.Event = {};
  addInstrumentsTag(event);
  return event.tags?.instruments;
}

/** Each report's tag, read at the moment it was captured, as Sentry's hook reads it. */
let atCapture: unknown[] = [];
function readTagAtCapture(): void {
  atCapture = [];
  vi.mocked(captureException).mockImplementation(() => {
    atCapture.push(tagNow());
    return 'event-id';
  });
}

test('the tag is sample once the player mounts', () => {
  render(<PlayerShell />);
  expect(tagNow()).toBe('sample');
});

test('opening Punk.gp sets drums,030', async () => {
  currentApi = standInApi();
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });
});

test('after an unmount, /play keeps the last score and / has none; a new player says sample', async () => {
  currentApi = standInApi();
  const first = render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });

  first.unmount();
  // The E901 that /play's error page sends after a crash: React has already unmounted the player.
  expect(tagNow('/play')).toBe('drums,030');
  expect(tagNow('/')).toBeUndefined();

  render(<PlayerShell />);
  expect(tagNow('/play')).toBe('sample');
});

test('an open left running across an unmount sets nothing when it ends', async () => {
  currentApi = standInApi();
  const file = fixture('Punk.gp');
  const bytes = await file.arrayBuffer();
  // Set as soon as the read starts: picking the file calls arrayBuffer() at once.
  let release!: (value: ArrayBuffer) => void;
  file.arrayBuffer = () =>
    new Promise((resolve) => {
      release = resolve;
    });

  const first = render(<PlayerShell />);
  pick(file);
  first.unmount();
  render(<PlayerShell />);
  release(bytes);

  // The count returns to zero once the old open ends, and the old player set nothing.
  await waitFor(() => expect(tagNow()).toBe('sample'), { timeout: 5000 });
});

test('with Punk.gp open, a non-score and a Cancel each leave drums,030, and the E103 is untagged', async () => {
  currentApi = standInApi();
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });

  readTagAtCapture();
  pick(new File(['this is not a guitar pro file'], 'not-a-score.gp'));
  await waitFor(() => expect(reported('E103')).toHaveLength(1), { timeout: 5000 });
  expect(atCapture).toEqual([undefined]);
  await waitFor(() => expect(tagNow()).toBe('drums,030'));

  confirm.mockReturnValue(false);
  pick(fixture('guitar-no-percussion.gp'));
  expect(tagNow()).toBeUndefined(); // the open runs
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(tagNow()).toBe('drums,030'));
});

test('an E105 before the swap leaves the old value; one just after it, the new one', async () => {
  currentApi = standInApi();
  render(<PlayerShell />);
  readTagAtCapture();

  vi.mocked(dropPlaybackSelection).mockImplementationOnce(() => {
    throw new Error('a bug of ours, before the swap');
  });
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  await waitFor(() => expect(tagNow()).toBe('sample'));

  vi.spyOn(toast, 'success').mockImplementationOnce(() => {
    throw new Error('a bug of ours, just after the swap');
  });
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(2), { timeout: 5000 });
  await waitFor(() => expect(tagNow()).toBe('drums,030'));
  expect(atCapture).toEqual([undefined, undefined]);
});

test("a late score-loaded event for the bundled beat keeps the file's value", async () => {
  currentApi = standInApi();
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });

  const sample = engine.importer.ScoreLoader.loadScoreFromBytes(
    new Uint8Array(readFileSync(path.join(process.cwd(), 'public/notation/1-beat.gp'))),
  );
  act(() => deliver('scoreLoaded', sample));
  expect(tagNow()).toBe('drums,030');
});

test('two opens at once: the one that returns early still puts the tag back', async () => {
  currentApi = standInApi();
  const loading = vi.spyOn(toast, 'loading');
  render(<PlayerShell />);

  // A picked file still being read…
  const picked = fixture('Punk.gp');
  const bytes = await picked.arrayBuffer();
  // Set as soon as the read starts: picking the file calls arrayBuffer() at once.
  let release!: (value: ArrayBuffer) => void;
  picked.arrayBuffer = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  pick(picked);

  // …while a dropped file opens. Once the drop is in flight, the pick's read finishes, and its
  // open returns early (one open at a time).
  fireEvent.drop(screen.getByTestId('drop-zone'), {
    dataTransfer: { files: [fixture('guitar-no-percussion.gp')] },
  });
  await waitFor(() => expect(loading).toHaveBeenCalled());
  release(bytes);

  // Both ended: the count is back to zero, and the tag names the dropped file's one guitar.
  await waitFor(() => expect(tagNow()).toBe('025'), { timeout: 5000 });
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/PlayerShell.test.tsx`
Expected: FAIL — `tagNow()` is never `sample` or `drums,030`: nothing sets the tag yet.

- [ ] **Step 4: The player sets the tag**

In `web/app/play/PlayerShell.tsx`, inside `Player()`, right after
`const playRef = useRef<HTMLButtonElement | null>(null);`:

```tsx
// Whether this player is still mounted. An open that outlives its player must not set the tag
// for a page that has moved on; a ref, because the open's closure outlives the render.
const mounted = useRef(false);
useEffect(() => {
  mounted.current = true;
  // The bundled one-track beat AlphaTab loads on every visit is on screen first, and has its own
  // value, so its errors are found apart from a visitor's own drum chart.
  tagInstruments('sample');
  return () => {
    mounted.current = false;
  };
}, []);
```

In `runRequestNotation`, right before
`setNotation({ name: next.name, score });`:

```tsx
// The tag follows the score on screen: set just before the swap, from the parsed score —
// never from AlphaTab's score-loaded event, which also fires for the bundled beat, sometimes
// after the visitor's file. A throw while computing it counts as before the swap.
if (mounted.current) {
  tagInstruments(
    instrumentsValue(
      score.tracks.map((track) => ({
        program: track.playbackInfo.program,
        isPercussion: track.staves.some((staff) => staff.isPercussion),
      })),
    ),
  );
}
```

`isPercussion` reads the staves, the rule `mixer-tracks.ts` and `drum-tracks.ts` already settled
on.

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/PlayerShell.test.tsx app/play/OpenFileControl.test.tsx`
Expected: PASS.

- [ ] **Step 5: End to end — cases 1 and 4**

Add to `web/e2e/error-reporting.e2e.ts`:

```ts
// Case 1. Before any file is opened, an error on /play carries the bundled beat's value.
test('on /play, before any file opens, an error carries instruments: sample', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  const sentinel = await throwSentinel(page, sentry, 'sentinel: on the bundled beat');
  expect(sentinel.level).toBe('error');
  expect(sentinel.tags?.instruments).toBe('sample');
});

// Case 4. guitar-no-percussion.gp reaches NH-335 while it opens. None of those throws may be sent,
// and the next report carries the file's one track — an acoustic guitar, program 25 — not the
// bundled beat's value, even though the beat arrives after the file (the hold-back the late-sample
// case in player.e2e.ts uses). When NH-335 is fixed, stop waiting for its page error; keep the rest.
test("the opened file's instruments win over a late bundled beat, and NH-335 is never sent", async ({
  page,
}) => {
  const nh335 = KNOWN_ENGINE_NOISE.find((noise) => noise.ticket === 'NH-335')?.message ?? '';
  const sentry = await recordSentry(page);
  let nh335Seen = false;
  page.on('pageerror', (error) => {
    if (error.message.includes(nh335)) nh335Seen = true;
  });
  await page.route('**/notation/1-beat.gp', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });
  const lateBeat = page.waitForResponse('**/notation/1-beat.gp');

  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/guitar-no-percussion.gp');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    'guitar-no-percussion.gp',
    { timeout: 30_000 },
  );
  await lateBeat;
  await expect.poll(() => nh335Seen, { timeout: 30_000 }).toBe(true);
  // Let the late beat's score-loaded event run, and the re-assert of the file that follows it.
  await page.waitForTimeout(2000);

  const sentinel = await throwSentinel(page, sentry, 'sentinel: after the late beat');
  expect(sentinel.tags?.instruments).toBe('025');
  expect(sentry.events()).toHaveLength(1);
});
```

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/error-reporting.e2e.ts
```

Expected: PASS — all cases in the file so far (9).

- [ ] **Step 6: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/app/play/OpenFileControl.tsx web/app/play/OpenFileControl.test.tsx web/app/play/PlayerShell.tsx web/app/play/PlayerShell.test.tsx web/e2e/error-reporting.e2e.ts
git commit -m "feat(web): tag each report with the kinds of instrument on screen (NH-124)"
```

---

### Task 14: The music-font clock, and AlphaTab's own error event

`NotationSurface` raises the three engine-asset failures: E202 (AlphaTab's `error` event — in
practice the SoundFont), E203 (the music font failed to download) and E204 (it did not arrive). Each
is reported unhandled. E204's 60 seconds now count only while the page is visible, and three events
stop that clock for good: the first finished render, an E203, or the E204 itself (spec 2.4).

**Files:**

- Modify: `web/app/play/NotationSurface.tsx` (`:92-136`, `:140-143`, `:155-167`)
- Create: `web/app/play/NotationSurface.test.tsx`
- Test: `web/e2e/player.e2e.ts` (the cases at `:215` and `:266`; the 60-second backstop case at
  `:230` changes how it moves the fake clock)

**Interfaces:**

- Consumes: `reportError` (Task 5); `recordSentry`, `withCode` (Task 6).
- Produces: nothing other tasks call.

- [ ] **Step 1: Write the failing tests**

Create `web/app/play/NotationSurface.test.tsx`. Headless Chromium keeps every page visible, so
these hidden-tab cases can only run here.

```tsx
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../lib/monitoring/report', () => ({ reportError: vi.fn() }));
vi.mock('../../lib/alphatab/AlphaTabEngineContext', () => ({
  useAlphaTabEngine: () => ({ engine: null, error: null }),
}));
// Every AlphaTab subscription by event name. One NotationSurface is mounted per case, so one
// handler per name.
const handlers = new Map<string, (args: unknown) => void>();
vi.mock('../../lib/alphatab/useAlphaTab', () => ({
  useAlphaTabEvent: (_api: unknown, name: string, handler: (args: unknown) => void) => {
    handlers.set(name, handler);
  },
}));

// Imported after the vi.mock calls on purpose: Vitest hoists them.
import { reportError } from '../../lib/monitoring/report';
import { NotationSurface } from './NotationSurface';

import type * as AlphaTab from '@coderline/alphatab';

// The clock and the font listener start once an api exists; the renderFinished handler also reads
// its `tracks`.
const STAND_IN_API: unknown = { tracks: [] };
let visibility: DocumentVisibilityState = 'visible';
let fontFailed: ((event: { fontfaces: { family: string }[] }) => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(reportError).mockClear();
  handlers.clear();
  visibility = 'visible';
  fontFailed = undefined;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  // jsdom has no document.fonts; the component listens on it for the font's `loadingerror`.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      addEventListener: (_type: string, listener: typeof fontFailed) => {
        fontFailed = listener;
      },
      removeEventListener: () => {},
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function mount(): void {
  render(
    <NotationSurface
      api={STAND_IN_API as AlphaTab.AlphaTabApi}
      hostRef={{ current: null }}
      viewportRef={{ current: null }}
      notation={null}
      onSoundFontProgress={() => {}}
    />,
  );
}

/** Lets `ms` pass, in whatever visibility the tab has now. */
const pass = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const reports = () => vi.mocked(reportError).mock.calls.map(([, options]) => options);

test('two minutes in a hidden tab raise no E204', () => {
  visibility = 'hidden';
  mount();
  pass(120_000);
  expect(reports()).toEqual([]);
});

test('40 visible seconds, a hidden minute, then 20 more visible seconds raise one E204', () => {
  mount();
  pass(40_000);
  visibility = 'hidden';
  pass(60_000);
  visibility = 'visible';
  expect(reports()).toEqual([]);
  pass(20_000);
  expect(reports()).toEqual([{ code: 'E204', handled: false }]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E204');
});

test('once a render has finished, hiding and showing the tab raises nothing a minute later', () => {
  mount();
  pass(10_000);
  act(() => handlers.get('renderFinished')?.(null));
  visibility = 'hidden';
  pass(30_000);
  visibility = 'visible';
  pass(60_000);
  expect(reports()).toEqual([]);
});

test('after an E203, 60 visible seconds raise no E204, and the banner keeps E203', () => {
  mount();
  act(() => fontFailed?.({ fontfaces: [{ family: 'alphaTab' }] }));
  expect(reports()).toEqual([{ code: 'E203', handled: false }]);
  pass(60_000);
  expect(reports()).toEqual([{ code: 'E203', handled: false }]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E203');
});

test('once an E204 has been raised, hiding and showing the tab raises no second one', () => {
  mount();
  pass(60_000);
  visibility = 'hidden';
  pass(5000);
  visibility = 'visible';
  pass(120_000);
  expect(reports()).toEqual([{ code: 'E204', handled: false }]);
});

test("AlphaTab's error event is reported as an unhandled E202, as it arrived", () => {
  mount();
  const soundFont = new Error('Soundfont is not a valid Soundfont2 file');
  act(() => handlers.get('error')?.(soundFont));
  expect(vi.mocked(reportError).mock.calls).toEqual([
    [soundFont, { code: 'E202', handled: false }],
  ]);
  expect(screen.getByTestId('engine-error')).toHaveTextContent('Error E202');
});
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/NotationSurface.test.tsx`
Expected: FAIL — nothing is reported, and the plain 60-second timer raises E204 in the hidden-tab
cases.

- [ ] **Step 2: The clock counts visible seconds, and every failure reports**

In `web/app/play/NotationSurface.tsx`, add the import:

```tsx
import { reportError } from '../../lib/monitoring/report';
```

Replace the `timeoutRef` declaration and its comment (`:92-95`) with:

```tsx
// Stops the music-font clock below for good. The effect that starts the clock sets it; the first
// finished render calls it.
const stopFontClock = useRef<() => void>(() => {});
```

Replace the effect at `:105-136` with:

```tsx
// The two music-font failures AlphaTab itself never reports. Keyed on [api] because the font
// face is injected during AlphaTabApi construction — before that there is nothing to fail.
useEffect(() => {
  if (!api) return;

  // Backstop for a download that hangs without ever failing: no event arrives, so give up after
  // 60 seconds — counted only while the page is VISIBLE. AlphaTab starts its first render from an
  // animation frame, and a browser runs none in a hidden tab, so a player opened in a background
  // tab draws nothing there while a plain timer keeps counting; it would send an unhandled E204
  // although nothing failed. A tick each second that counts only a visible second needs no
  // visibilitychange listener, so none can be left behind to restart it. Long on purpose: the
  // 306 KB font on a slow link must not trip it. Three events stop the clock for good: the first
  // finished render, an E203, and the E204 itself.
  let visibleSeconds = 0;
  const clock = globalThis.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    visibleSeconds += 1;
    if (visibleSeconds < 60) return;
    globalThis.clearInterval(clock);
    reportError(new Error('The music font did not arrive within 60 visible seconds'), {
      code: ERROR.musicFontTimeout,
      handled: false,
    });
    setFontError(
      `Error ${ERROR.musicFontTimeout}: the music font did not arrive within 60 seconds`,
    );
    setDismissed(false);
  }, 1000);
  stopFontClock.current = () => globalThis.clearInterval(clock);

  // AlphaTab injects its music font as a CSS @font-face named `alphaTab…` during construction. If
  // that download fails, its font checker has no fallback family: it logs "rendering cannot
  // start", never fires renderFinished and raises no api.error — so the Skeleton would stay up
  // forever. The browser reports it at once, as `loadingerror` on document.fonts (verified in
  // Chromium). Text-font checkers have system fallbacks, hence the family filter.
  const onFontError = (event: FontFaceSetLoadEvent) => {
    if (!event.fontfaces.some((face) => face.family.startsWith('alphaTab'))) return;
    // AlphaTab never draws once the font has failed, so the clock stops here. Otherwise every
    // E203 would be followed, 60 visible seconds later, by an E204 saying the font is late.
    globalThis.clearInterval(clock);
    reportError(new Error('The music font could not be downloaded'), {
      code: ERROR.musicFontFailed,
      handled: false,
    });
    setFontError(`Error ${ERROR.musicFontFailed}: the music font could not be downloaded`);
    setDismissed(false);
  };
  document.fonts.addEventListener('loadingerror', onFontError);

  return () => {
    globalThis.clearInterval(clock);
    document.fonts.removeEventListener('loadingerror', onFontError);
  };
}, [api]);
```

The `error` subscription (`:140-143`) becomes:

```tsx
useAlphaTabEvent(api, 'error', (cause) => {
  // E202, unhandled, as it arrived. AlphaTab passes an Error in every case measured, though its
  // class and type field do not survive the worker, and a SoundFont network failure carries an
  // empty message, which reportError replaces with E202's meaning.
  reportError(cause, { code: ERROR.engineRuntime, handled: false });
  setRuntimeError(`Error ${ERROR.engineRuntime}: ${String(cause)}`);
  setDismissed(false);
});
```

and the first line of the `renderFinished` handler (`:156`), `globalThis.clearTimeout(timeoutRef.current);`,
becomes:

```tsx
stopFontClock.current();
```

Run: `pnpm --filter @notation-hero/web exec vitest run app/play/NotationSurface.test.tsx`
Expected: PASS — 6 tests.

- [ ] **Step 3: The end-to-end assertions**

In `web/e2e/player.e2e.ts`, in `a failed music-font download shows the engine error, not an endless
Skeleton` (`:215`), make `const sentry = await recordSentry(page);` the first line and add after its
last assertion:

```ts
await expect.poll(() => withCode(sentry, 'E203').length).toBeGreaterThan(0);
expect(withCode(sentry, 'E203')[0]?.level).toBe('error');
```

In `opening a new file clears a stale engine-error banner` (`:266`), the same first line, and after
the banner first shows E202:

```ts
await expect.poll(() => withCode(sentry, 'E202').length).toBeGreaterThan(0);
```

(The font abort may raise `loadingerror` more than once; Sentry drops an event identical to the one
before it, so "at least one" is the honest assertion for both.)

The existing case `a music font that arrives after the 60 s backstop clears the error` (`:230`)
reaches E204 by jumping Playwright's fake clock. `fastForward` fires a due timer at most once, so
the one-second counter would gain one second per jump and never reach 60 inside the case's
20-second retry — measured on Playwright 1.61.1: repeated `fastForward(61_000)` calls counted 40
seconds in 20, while one `runFor(61_000)` counted 60 and raised E204. `runFor` fires every tick on
the way. In that case:

```diff
-  // RETRY the fast-forward. The backstop is armed in an effect keyed on the api, which does not
-  // exist until the engine module has imported — fast-forwarding before that moment advances past
-  // nothing, and the timer is then armed against the new clock.
+  // RETRY the run. The backstop is armed in an effect keyed on the api, which does not exist until
+  // the engine module has imported — running the clock before that moment advances past nothing,
+  // and the counter then starts against the new clock. runFor, not fastForward: the backstop is a
+  // one-second tick that counts visible seconds, and fastForward fires a due timer at most once.
   await expect(async () => {
-    await page.clock.fastForward(61_000);
+    await page.clock.runFor(61_000);
     await expect(page.getByTestId('engine-error')).toContainText('Error E204', { timeout: 1000 });
   }).toPass({ timeout: 20_000 });
```

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e e2e/player.e2e.ts -g "music-font download|stale engine-error|60 s backstop"
```

Expected: PASS — all three, the 60-second backstop case with its clock now advanced by `runFor`
(headless Chromium keeps the page visible, so every second counts).

- [ ] **Step 4: Lint, types, the unit lane, commit**

```bash
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
git add web/app/play/NotationSurface.tsx web/app/play/NotationSurface.test.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): report engine-asset failures, and count the font timeout in visible time (NH-124)"
```

---

### Task 15: The lint rule that keeps every catch reporting

Every catch in `web/` now reports. This task makes that a rule: two selectors join the existing
`no-restricted-syntax` list, the browser's own global `reportError` is banned, and a canary proves
both still fire.

**Files:**

- Create: `tooling/silent-catch-fence.test.sh` (a sibling of `tooling/alphatab-import-fence.test.sh`;
  `pnpm run test:tooling` runs every `tooling/*.test.sh`, in the CI `quality` job)
- Modify: `web/eslint.config.mjs` (the list at `:68`)
- Modify: `web/lib/alphatab/settings-storage.ts` (`:195`, the one deliberate silence)
- Modify: `web/AGENTS.md`

**Interfaces:**

- Consumes: every catch site changed in Tasks 8–14.
- Produces: the rule; nothing callable.

- [ ] **Step 1: Write the failing canary**

Create `tooling/silent-catch-fence.test.sh`, and make it executable
(`chmod +x tooling/silent-catch-fence.test.sh`):

```bash
#!/usr/bin/env bash
#
# Silent-catch fence test — proves web/'s lint rule still REJECTS a catch that reports nothing, so a
# later config change cannot switch it off unnoticed.
#
#   catch { … }            a catch clause that calls neither reportError nor noteError
#   .catch(() => null)     a .catch() callback that calls neither
#   reportError(…)         the BROWSER's global reportError, reached through a forgotten import
#
# The first two must fail no-restricted-syntax, the third no-restricted-globals. In ESLint flat
# config a later block's options for a rule REPLACE an earlier block's, so a no-restricted-syntax
# block added after web/'s would drop both selectors while lint stays green. Runs under
# `pnpm run test:tooling` (every tooling/*.test.sh), a required step of the CI `quality` job. The
# probe files are ephemeral and never committed.
#
# NOTE: deliberately NOT `set -e` — eslint is EXPECTED to exit non-zero (the fence firing).
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
[ -n "$ROOT" ] || { printf '::error::silent-catch-fence.test.sh must run inside the git work tree\n' >&2; exit 1; }
cd "$ROOT" || exit 1

# Unique per-process names, so concurrent runs never delete each other's probe mid-lint.
CATCH_PROBE="app/__silent_catch_probe_$$__.ts"
PROMISE_PROBE="app/__silent_promise_catch_probe_$$__.ts"
GLOBAL_PROBE="app/__global_report_error_probe_$$__.ts"
# shellcheck disable=SC2317,SC2329 # cleanup IS invoked via trap EXIT (SC2329 = shellcheck >=0.10; SC2317 = older CI shellcheck)
cleanup() { rm -f "web/$CATCH_PROBE" "web/$PROMISE_PROBE" "web/$GLOBAL_PROBE"; }
trap cleanup EXIT

printf "export function probe(raw: string): unknown {\n  try {\n    return JSON.parse(raw);\n  } catch {\n    return null;\n  }\n}\n" > "web/$CATCH_PROBE" \
  || { printf '::error::failed to write the catch probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }
printf "export async function probe(load: () => Promise<number>): Promise<number | null> {\n  return load().catch(() => null);\n}\n" > "web/$PROMISE_PROBE" \
  || { printf '::error::failed to write the .catch() probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }
printf "export function probe(): void {\n  reportError(new Error('probe'));\n}\n" > "web/$GLOBAL_PROBE" \
  || { printf '::error::failed to write the global reportError probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }

# expect_rejected <probe path inside web/> <ERE for the rule id>
expect_rejected() {
  local out rc
  out="$(pnpm --filter @notation-hero/web exec eslint "$1" 2>&1)"
  rc=$?
  # A whole rule id, so an unrelated error (a parse failure, a missing module) cannot pass for the
  # fence, and neither can a renamed rule.
  if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qE "(^|[[:space:]])$2([[:space:]]|$)"; then
    echo "ok — web/ rejects $1"
  else
    printf '::error::the web/ silent-catch fence did not fire on %s (eslint exit %s)\n%s\n' "$1" "$rc" "$out" >&2
    exit 1
  fi
}

expect_rejected "$CATCH_PROBE" 'no-restricted-syntax'
expect_rejected "$PROMISE_PROBE" 'no-restricted-syntax'
expect_rejected "$GLOBAL_PROBE" 'no-restricted-globals'
echo "Silent-catch fence OK — web/ rejects a silent catch, a silent .catch() and the global reportError."
```

Run: `bash tooling/silent-catch-fence.test.sh`
Expected: FAIL — `the web/ silent-catch fence did not fire on app/__silent_catch_probe_…`.

- [ ] **Step 2: Add the rule**

In `web/eslint.config.mjs`, the `no-restricted-syntax` list gains two entries after the AlphaTab
one, and `no-restricted-globals` is added beside it:

```js
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/^@coderline.alphatab/]',
          message:
            'Do not dynamically import @coderline/alphatab. It bundles AlphaTab a second time just as a value import does, and the no-restricted-imports fence cannot see it. Get runtime values from the namespace object returned by loadAlphaTabEngine() in lib/alphatab/engine.ts.',
        },
        // Every catch in web/ reports. A catch clause, or a .catch() callback, calls reportError
        // or noteError from lib/monitoring/report.ts INSIDE it: a call hidden in a helper is
        // invisible to these selectors. Run against ESLint 9.39.4 on 2026-10-03, they flagged
        // exactly `catch { }` and `.catch(() => null)`, and passed every form that calls either.
        // tooling/silent-catch-fence.test.sh proves they still fire.
        {
          selector:
            'CatchClause:not(:has(CallExpression[callee.name=/^(reportError|noteError)$/]))',
          message:
            'This catch reports nothing. Call reportError or noteError from lib/monitoring/report.ts inside it, or mark a deliberate silence: // eslint-disable-next-line no-restricted-syntax -- <reason>',
        },
        {
          selector:
            "CallExpression[callee.property.name='catch'] > :function:not(:has(CallExpression[callee.name=/^(reportError|noteError)$/]))",
          message:
            'This .catch() callback reports nothing. Call reportError or noteError from lib/monitoring/report.ts inside it, or mark a deliberate silence: // eslint-disable-next-line no-restricted-syntax -- <reason>',
        },
      ],
      // The browser has its own global reportError, so a call whose import was forgotten still
      // type-checks — and reaches no one. Banning the global makes that a lint error; the imported
      // function shadows it and stays allowed. Nothing set this rule before.
      'no-restricted-globals': [
        'error',
        { name: 'reportError', message: 'Import reportError from lib/monitoring/report.ts.' },
      ],
```

The `no-restricted-imports` entries below stay as they are. A second block setting
`no-restricted-syntax` would silently replace the AlphaTab fence — never add one.

- [ ] **Step 3: The one deliberate silence**

Run: `pnpm --filter @notation-hero/web run lint`
Expected: FAIL — exactly one error, `web/lib/alphatab/settings-storage.ts:195`. Every other catch
already reports.

In `web/lib/alphatab/settings-storage.ts`, the `JSON.parse` guard becomes:

```ts
let parsed: unknown;
try {
  parsed = JSON.parse(raw);
  // eslint-disable-next-line no-restricted-syntax -- an unreadable document returns reset: true, and both callers turn that into the E603 warning and its report
} catch {
  return { settings: defaults, reset: true, repaired: [] };
}
```

Run: `pnpm --filter @notation-hero/web run lint`
Expected: PASS.

- [ ] **Step 4: Run the canary again, and the existing fence beside it**

```bash
bash tooling/silent-catch-fence.test.sh
bash tooling/alphatab-import-fence.test.sh
```

Expected: both PASS — the AlphaTab fence still fires, so the list was extended, not replaced.

- [ ] **Step 5: The rule, in words, for the next agent**

In `web/AGENTS.md`, under "This package", add after the first bullet:

```markdown
- **Every `catch` reports.** Each `catch` clause and `.catch()` callback in `web/` calls
  `reportError` or `noteError` from `web/lib/monitoring/report.ts` inside the catch itself — a lint
  rule in `web/eslint.config.mjs` enforces it, and `tooling/silent-catch-fence.test.sh` proves the
  rule still fires. A deliberate silence is
  `// eslint-disable-next-line no-restricted-syntax -- <reason>` on the line above the `catch`.
  Storage the browser refuses is the visitor's, not a bug:
  `if (isStorageRefusal(error)) noteError(error, '…'); else reportError(error);`, written in place.
  `reportError` keeps the error's message for every code except E101–E103, and the names filter
  removes names, not a file's contents. A catch around code that reads or parses the visitor's
  file, such as the cached-score path E104 is reserved for, needs a fixed sentence: add its code to
  `FIXED_MESSAGES` in `web/lib/monitoring/report.ts`, and to the fixed-sentence test beside it.
```

- [ ] **Step 6: Lint the shell script, the docs, and commit**

```bash
pnpm run lint:shell
pnpm run lint:md
pnpm run test:tooling
git add tooling/silent-catch-fence.test.sh web/eslint.config.mjs web/lib/alphatab/settings-storage.ts web/AGENTS.md
git commit -m "build(web): fail lint on a catch that reports nothing (NH-124)"
```

---

### Task 16: The documents

**Files:**

- Modify: `web/README.md` (Deploy)
- Modify: `docs/decisions/decision-registry.md` (L11-sentry, L11-srcmap)
- Modify: `docs/decisions/decision-changelog.md` (a new entry at the top)
- Modify: `cspell.json` (only for a genuine word `lint:spell` flags)

**Interfaces:** none.

- [ ] **Step 1: README — the two variables, and what a failed deploy means**

In `web/README.md`, append to the "Deploy" section:

```markdown
**Error monitoring (Sentry).** Two environment variables, both in Vercel's **Production**
environment only — previews, CI and local builds have neither, so they send nothing and upload
nothing:

| Variable                 | What it is                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Where error reports go. Public by design: it ships inside the page.                                                                                                             |
| `SENTRY_AUTH_TOKEN`      | The organization token the production build uses to upload source maps. Marked **Secret** (Vercel's name for what it called Sensitive). Never in chat, never in the repository. |

A production deploy **fails**, and the previous one stays live, when the source-map upload fails —
Sentry is down, or the token was revoked or has expired — when the token is set but
`next.config.ts` names no Sentry `org` and `project`, and when the token's value reaches a file a
browser downloads (`scripts/assert-no-auth-token.mjs`). Redeploy once Sentry answers; replace the
token in Vercel if it was revoked. Only a production build reads the token (`VERCEL_ENV` is
`production`), so a `SENTRY_AUTH_TOKEN` in your own shell — Sentry's command-line tools read that
name — never makes a local build upload. The one-time setup is section 5 of
[the spec](../docs/specs/2026-10-03-nh-124-sentry-error-monitoring-design.md).
```

Prettier realigns the table on commit.

- [ ] **Step 2: The registry rows flip**

In `docs/decisions/decision-registry.md`:

- **L11-sentry:** status `⏳ pending` → `✅ done`; enforcement `📄` → `🤖`. Append to its text:
  "**Shipped (NH-124):** every catch in `web/` reports — a lint rule (`web/eslint.config.mjs`) and
  its canary (`tooling/silent-catch-fence.test.sh`); the reporting and privacy cases in
  `web/e2e/error-reporting.e2e.ts`; the build fails on a token in a browser file."
- **L11-srcmap:** status `⏳ pending` → `✅ done`; enforcement `📄` → `🟡` (the upload and the
  deletion are code; "Hide source content" off is a Sentry setting the owner keeps).
- **F7-sentry** stays `⏳ pending` until the owner confirms setup (Task 17).

Run: `pnpm run check:decision-docs` — Expected: PASS (no dated entry in the registry).

- [ ] **Step 3: The changelog entry**

At the top of `docs/decisions/decision-changelog.md`, above the NH-124 entry of 2026-10-03, add an
entry dated the day this task runs:

```markdown
### <YYYY-MM-DD> — Sentry error monitoring ships in `web/` (NH-124)

The implementation of the 2026-10-03 design, through the plan in
`docs/plans/2026-10-08-nh-124-sentry-error-monitoring-plan.md`.

- **SDK:** `@sentry/nextjs` <version>, pinned exactly. `withSentryConfig` comes from
  `@sentry/nextjs/config` in 11.x.
- **Enforced:** every catch in `web/` reports (lint rule + canary); a token in a browser file fails
  the build; a failed source-map upload fails the production deploy; the reporting and privacy
  promises are end-to-end cases.
- **Choices the plan made**, each <approved in the plan review | as the plan proposed>: <list the
  plan's "Choices this plan makes" as they stood after the plan review>.
- **Page weight:** a cold `/play` load transfers <before> KiB of JavaScript before and <after> KiB
  after.

**Registry:** L11-sentry ✅ 🤖; L11-srcmap ✅ 🟡; F7-sentry flips when the owner confirms setup.
```

Fill every `<…>` from what actually happened; leave no `<` in the committed entry. If the plan
review already recorded decisions in the NH-124 entry, this entry says what shipped and does not
repeat them.

- [ ] **Step 4: Spelling, then commit**

```bash
pnpm run lint:spell
pnpm run lint:md
```

If `lint:spell` flags a genuine word (a header name such as `fbclid`, for example), add it to
`cspell.json` → `words`; change the text instead if it is a typo.

```bash
git add web/README.md docs/decisions/decision-registry.md docs/decisions/decision-changelog.md cspell.json
git commit -m "docs: record that Sentry error monitoring shipped in web/ (NH-124)"
```

---

### Task 17: Before code review

The owner's setup, the slugs, the numbers, and the hand-over to CODE REVIEW.

**Files:**

- Modify: `web/next.config.ts` (`org`, `project` — only if Task 1 left them out)
- Modify: `docs/decisions/decision-registry.md` (F7-sentry, once confirmed)
- Not files: the PR body, Jira NH-124 and NH-298

- [ ] **Step 1: Ask the owner where setup stands**

Ask, with a picker, which of setup section 5's steps are done: the account in **EU (Frankfurt)**;
the Next.js project; the one email alert (new, regressed, escalating; no level filter); "Prevent
Storing of IP Addresses" on; Allowed Domains `*.notationhero.com` and
`notation-hero-web.vercel.app`; the organization token; the two Vercel variables in
**Production only**, the token marked **Secret**. Never ask for the token, never read it, never
print it. While they are there, ask them to look at Settings › Notifications › Spend (the 80% and
100% quota emails).

Then check one thing yourself, without asking: the production site's wordmark tooltip reads
`v0.…`, not `local`. The upload reads the token only when `VERCEL_ENV` is `production` (Choice
12), and `VERCEL_ENV` reaches the build only while Vercel exposes its system environment
variables; `scripts/app-version.mjs` prints `v0` from the same variable, so the tooltip proves it.
If it reads `local`, stop and ask the owner to switch that Vercel setting back on: without it,
production deploys upload nothing and say nothing.

- [ ] **Step 2: The slugs**

If `web/next.config.ts` has no `org` and `project` yet, ask for the two slugs (not secret) and add
them as the first two options of `sentryBuildOptions`. The upload finds the EU region by the `org`
slug, so they must be in place before the token reaches a production build. The build enforces
that order (Choice 2): a production build that has the token without both slugs fails, naming
them, and Vercel keeps the previous deployment live.

```bash
pnpm --filter @notation-hero/web run build
git add web/next.config.ts
git commit -m "build(web): name the Sentry organization and project (NH-124)"
```

Once the owner confirms the token is in Vercel, flip **F7-sentry** to `✅ done` in the registry
and amend the Task 16 changelog entry's Registry line; commit both with
`docs: record the Sentry setup as done (NH-124)`.

- [ ] **Step 3: Measure "after"**

Repeat Task 1 Step 1 exactly — the same script, rebuilt from its text, three runs, the middle
value — on today's build. Put both numbers in the PR body and the changelog entry.

- [ ] **Step 4: The whole gate, locally**

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
pnpm run check:all
pnpm --filter @notation-hero/web exec playwright test --config=playwright.e2e.config.ts --project=e2e
pnpm test:web:docker
```

Expected: all PASS. The Docker run compares all ten shots against the committed baselines.

- [ ] **Step 5: Jira**

- **NH-298:** its Smart Checklist (`customfield_10041`) has two items this changes. "Sentry
  integration" is done by NH-124. "Test the 'Nothing you open leaves this device' claim" becomes:
  the future same-origin test must allow exactly the Sentry ingest host, and only now that this has
  shipped (spec section 7).
- **NH-124:** a comment linking this PR and summarising what shipped.

- [ ] **Step 6: The PR body, then push**

Update the PR body before pushing (a body edit during a CI run cancels that run): the progress
list, the SDK version, both download-size numbers, Task 7's screenshots, the "To verify" results
that remain for after merge (Step 7), and the checklist — each box ticked only where its claim is
true. Then:

```bash
git push
```

Move NH-124 to CODE REVIEW (transition 71) and run `spec-triage-loop:code-review-loop` over the
branch.

- [ ] **Step 7: After merge — for the owner, by hand**

The first production deploy proves what no test here can. Setup step 6, in a browser with **no ad
blocker** (one would block Sentry just as decision D3 accepts for visitors): open the site at a
domain step 3 lists and open a file that is not a score.

- An E103 warning appears in Sentry, with `file_type` and the size rounded up to a power of two,
  and without the name; its alert email arrives.
- The event's User section shows no IP address: "Prevent Storing of IP Addresses" and
  `userInfo: false` both hold.
- Its stack shows our own `PlayerShell.tsx` frame, readable, with the code around it — the source
  maps reached the **EU** region with the token and the `org` slug alone. AlphaTab's frames above
  it stay minified (a known limit).
- Its release equals the version in the wordmark's tooltip.
- The release's details page shows an **Unhandled Session Rate**; 100% minus it is the interim
  health number. The Crash Free Rate stays near 100%, as expected for a browser.

Record the results as a comment on NH-124.

---

## Spec coverage

Every section of the spec, and the task that carries it.

| Spec                                                        | Task                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1 — the dependency, the new and changed files               | 1–16                                                                                                           |
| 2.1 — errors nobody catches                                 | 6 (the global handlers stay; the sentinel cases prove them)                                                    |
| 2.2 — the error pages                                       | 7                                                                                                              |
| 2.3 — the reporting functions                               | 5; callers in 8–14                                                                                             |
| 2.4 — the 16 catches                                        | 8 (six storage), 9 (E201, E205, start, E401 ×2, E602), 10 (E103), 11 (E101/E102/E105 ×2), 15 (the one silence) |
| 2.4 — the 4 failures that never throw                       | 9 (E601/E603, both restore paths), 14 (E202, E203, E204)                                                       |
| 2.4 — read, then open; E105; the opening state              | 11                                                                                                             |
| 2.4 — E204 counts visible time; three events stop the clock | 14                                                                                                             |
| 2.4 — blocked is not corrupt                                | 8                                                                                                              |
| 2.5 — the lint rule                                         | 15                                                                                                             |
| 2.6 — known engine noise                                    | 3, 6                                                                                                           |
| 3.1 — what could leave the device                           | 4, 6, 10, 13                                                                                                   |
| 3.2 — the names filter                                      | 4, 12                                                                                                          |
| 3.3 — SDK settings                                          | 6                                                                                                              |
| 3.4 — the copy                                              | 7                                                                                                              |
| 4 — releases, environments, source maps, the token check    | 1 (production builds only, Choice 12; the slug check, Choice 2), 2, 17                                         |
| 5 — setup by the owner                                      | 17                                                                                                             |
| 6 — unit cases                                              | 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14                                                                           |
| 6 — end-to-end cases 1–8                                    | 13 (1, 4), 10 (2), 12 (3), 8 (5), 6 (6, 7), 9 (8)                                                              |
| 6 — the assertions added to `player.e2e.ts`                 | 9 (E601, E603 ×2 each), 14 (E202, E203)                                                                        |
| 6 — the lint canary, the token check's test                 | 15, 2                                                                                                          |
| 6 — the `/` screenshot, the download size                   | 7; 1 and 17                                                                                                    |
| 7 — documents that change                                   | 11 (error codes), 15 (`web/AGENTS.md`), 16, 17 (NH-298)                                                        |
| To verify at plan time                                      | verified above; the EU upload and the health figure in 17                                                      |
