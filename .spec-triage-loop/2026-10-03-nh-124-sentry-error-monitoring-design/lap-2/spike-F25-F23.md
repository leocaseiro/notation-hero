# Spike — `instruments` tag: tag the sample (F-25) + clear at pick / restore on failure (F-23)

NH-124, lap 2. Throwaway spike, run 2026-10-05 in an isolated worktree at `2f837529` (master, #186).
Nothing committed, nothing pushed; every changed file reverted and every created file deleted by
exact path at the end (`git status` empty afterwards). The patch and tests are kept below.

## Verdict

**Design A works.** Tagging the bundled sample `sample` and clearing the tag at pick/drop, with
restore on every path that ends without a swap, holds in all eleven scenarios — **with one
correction to the API as described: the monitoring module must count pending opens.** With the
plain remember-last semantics, three overlap cases (a second pick while the first open is in
flight) send a failure report about the new file that carries the previous song's instruments,
which is exactly what F-23 forbids. The counter lives inside the module; it adds no call site.

Two simplifications fell out of the run:

- **No `swapped` flag is needed** if the module keeps ONE remembered value that `tagInstruments`
  overwrites at the swap. A restore after the swap then puts back the NEW value. A restore that
  snapshots the value at suspend time is the named hazard, and with restore in `finally` it breaks
  even a plain successful open (mutation M3 below).
- **Every no-swap path is covered by one `finally`** in each of the two callers (pick, drop). No
  restore call is needed in `requestNotation` at all — not at Cancel, E103, E205 or the guard drop.

Design B was not built: Design A passed. Mutation M4 shows that any listener which tags from
the score-loaded event's ARGUMENT fails the late-sample race (it ends on `drums` while Punk is on
screen) — so today's spec wording ("the score-loaded handler … sets the tag", §1; "The tag is set
when a score loads", §2.3) must change whichever design is chosen.

## How it was tested

- **Real code paths:** the REAL `PlayerShell` and `OpenFileControl`, rendered in jsdom with the
  repository's own harness pattern (`web/app/play/PlayerShell.test.tsx`), and the REAL AlphaTab
  1.8.4 importer (`ScoreLoader.loadScoreFromBytes`) parsing the REAL fixtures
  (`web/e2e/fixtures/Punk.gp`, `guitar-no-percussion.gp`, `web/public/notation/1-beat.gp`).
- **Mocked:** the router; the AlphaTab api (none, as the existing harness does — scenarios
  (i)–(viii), (x), (xi)); two steps used only to inject a throw (`toast.success` right after the
  swap; `dropPlaybackSelection` right before it); `globalThis.confirm`.
- **Scenario (ix):** a second file with a FAKE api whose emitters copy AlphaTab's own
  `EventEmitter`/`EventEmitterOfT` (alphaTab.core.mjs:24692-24738, including the replay on
  subscribe) and whose `renderScore` copies `_internalRenderTracks` (alphaTab.core.mjs:45836-45848:
  `api.score` set before `scoreLoaded` fires, and fired only when the score changed). The REAL
  `useAlphaTabEvent` is used, so the four `scoreLoaded` subscriptions land in the app's real order,
  and the REAL NotationSurface re-assert guard runs.
- **Sentry:** stubbed. `web/lib/monitoring/report.ts` (throwaway) keeps a fake scope; each
  captured report records the scope's tags at capture time plus its own `code`.
- **Runner:** `pnpm --filter @notation-hero/web exec vitest run <file>` (Vitest 4.1.11, jsdom).
- **Proof the harness runs and can fail:** every test carries a harness-proof assertion (the tag is
  unset before mount; the success announcement `Opened …`; the injected throw really fired; the
  injection point was called; `pending === 1` at the mid-window read; the race's `renderScore`
  sequence). Four mutations (below) each turned tests red.

Fixture facts (real importer, Node): `1-beat.gp` → one track "Drums", percussion → `drums`;
`Punk.gp` → Drumkit (perc), Distortion Guitar (program 30), Drumkit Left (perc) → `drums,030`;
`guitar-no-percussion.gp` → one track, program 25 → `025`; `notes.txt` bytes → the importer throws.

## Path map (line numbers at `2f837529`)

The spec quotes PlayerShell lines from its base `0dd46b52`; NH-344 (#185) since removed 26 lines
above them, so spec `:805` = here `:779`, spec `:872` = `:846`, spec `:969` = `:943`.

**Sample — first load and draw**

- `web/app/play/PlayerShell.tsx:82` — `SAMPLE_NOTATION = '/notation/1-beat.gp'`; `:74-81` says it
  ALWAYS loads today (NH-303 would change that).
- `PlayerShell.tsx:265` — `engineSettings.core.file = SAMPLE_NOTATION` inside the `useAlphaTab`
  init (`:261-306`); the api is built in an effect (`web/lib/alphatab/useAlphaTab.ts:35-64`).
- AlphaTab fetches it itself: `initialRender` → `ScoreLoader.loadScoreAsync(file, s =>
api.renderScore(s))` (alphaTab.core.mjs:41006-41027) → `_internalRenderTracks` sets the score,
  then `_onScoreLoaded` → `scoreLoaded.trigger` (:45836-45848, :48025-48030). `scoreLoaded` replays
  the current score to a new subscriber (:45531-45534).
- `notation` stays `null` while the sample shows: nothing calls `setNotation` for it
  (`PlayerShell.tsx:798-804`, `NotationSurface.tsx:22-23`).

**Pick** — `web/app/play/OpenFileControl.tsx`

- `:101-109` `onChange` → `void accept(file)`; resets the input.
- `:69-83` `accept`: `:70` `if (!file) return`; `:74` `await onNotation(await readNotation(file))`;
  `:75-82` catch → toast E101/E102 (no report today).
- `:35-43` `readNotation`: `:36-39` the 25 MB check throws (E101); `:40` `arrayBuffer()` (E102).
- `onNotation` is `requestNotation` (`PlayerShell.tsx:1083`).

**Drop** — `PlayerShell.tsx`

- `:1064-1070` `onDrop` → `void acceptDropped(files[0])`.
- `:938-951` `acceptDropped`: `:942` `await requestNotation(await readNotation(file))`; `:943-948`
  catch → toast + announcement.

**`requestNotation`** — `PlayerShell.tsx:914-926` wraps `runRequestNotation` (`:772-900`)

- `:914-917` the one-open-at-a-time guard: `openInFlight` ref; a second call while one is in flight
  returns at `:917` (normally — no throw); `:921-923` `finally` releases it.
- `:774-791` engine wait: `:779` `await loadAlphaTabEngine().catch(() => null)`; `:785-789` E205
  toast, `return` (no swap).
- `:796` `wasPlaying`; `:805-824` the **"Replace …?" prompt** — only when `notation !== null` (a
  score the visitor opened is on screen; replacing the sample asks nothing); `:813`
  `globalThis.confirm`; `:817-823` **Cancel** → `return` (no swap).
- `:836` `flushSync(setOpening(true))`; `:837` `toast.loading`; `:841` `await
loadingToastPainted()` — up to 32 animation frames: the window in which a second pick lands.
- `:843-863` **the parse**: `:845` `loadScoreFromBytes`; `:846-863` the **E103** branch, `return`
  (no swap).
- `:866-885` pre-swap steps — an E105 thrown here is BEFORE the swap: `:866` `api?.pause()`,
  `:871` `playbackRange = null`, `:876` `dropPlaybackSelection(api)`, `:880-882` seek bookkeeping,
  `:885` `setLoadFailed(false)`.
- `:886` **THE SWAP**: `setNotation({ name, score })`.
- `:887-897` post-swap steps — an E105 thrown here is AFTER the swap and the new score still
  renders: `:887` `setOpening(false)`, `:888` `toast.success`, `:892` announcement, `:896`
  `dismissErrors`, `:897` focus Play.

**NotationSurface** — `web/app/play/NotationSurface.tsx`

- `:33-54` `renderOpenNotation` → `:53` `api.renderScore(score, drumIndexes)`.
- `:103` `wantedRef`; `:189-195` the score effect sets `wantedRef` (`:191`) then renders (`:192`).
- `:205-209` **the re-assert guard**: on any `scoreLoaded` whose `api.score` is not the wanted one,
  draw the wanted one again — from INSIDE that event.
- Other `scoreLoaded` listeners: `TracksPopover.tsx:112-128` (guards `api.score !== score` at
  `:113`), `SettingsPopover.tsx:95-102` (no guard), the shell's `PlayerShell.tsx:519-525`.

**Late-sample e2e** — `web/e2e/player.e2e.ts:586-601` delays `**/notation/1-beat.gp` by 4 s,
opens Punk.gp at once, waits 6 s, asserts Punk is still drawn.

**Leaving `/play`** — `PlayerHeader.tsx:105-114` Back (`router.back()` / `router.push('/')`) and
`:143-154` the wordmark `<Link href="/">`. `web/next.config.ts:3-12` sets no `cacheComponents`;
the bundled Next 16 guide `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`
says routes are hidden with `<Activity>` instead of unmounted ONLY when `cacheComponents` is on.
So `/play` unmounts on a client-side navigation to `/`, and `useAlphaTab`'s cleanup destroys the
api (`useAlphaTab.ts:55-63`).

## Design A as built

| #   | Call site (HEAD lines)                                             | Call                                      |
| --- | ------------------------------------------------------------------ | ----------------------------------------- |
| 1   | `Player` mount, a `useEffect(…, [])` beside the settings state     | `tagInstruments('sample')`                |
| 2   | `runRequestNotation`, immediately BEFORE `setNotation` (`:886`)    | `tagInstruments(instrumentsValue(score))` |
| 3   | `OpenFileControl.accept`, after `if (!file) return` (`:70`)        | `suspendInstruments()`                    |
| 4   | `OpenFileControl.accept`, new `finally` after the catch (`:75-82`) | `restoreInstruments()`                    |
| 5   | `acceptDropped`, after `if (!file) return` (`:940`)                | `suspendInstruments()`                    |
| 6   | `acceptDropped`, new `finally` after the catch (`:943-948`)        | `restoreInstruments()`                    |

**Six call sites.** None in the E103 branch, Cancel, E205, the guard drop, or any `scoreLoaded`
listener; no `swapped` flag. (The design as worded — a restore on each no-swap path — would need
restores at `:789`, `:822`, `:862`, `:917` plus the two catches: ten sites, and a flag if the value
were snapshotted.)

The spike also added the reports the scenarios need: E103 in the parse catch (`:846`), and in both
callers' catches the spec's read flag — `const loaded = await readNotation(file); read = true;
await …(loaded)` — E105 once read, else E101/E102. The E205 breadcrumb was not added.

Why the swap tag goes BEFORE `setNotation`: if computing the value threw after `setNotation`, the
new score would render while the remembered value was still the old one, and the `finally` restore
would put the old value over it. Before `setNotation`, such a throw is simply an E105 before the
swap. (Reasoned; not run as its own case.)

## Results

All runs: `pnpm --filter @notation-hero/web exec vitest run <files> --reporter=verbose`.
"counted" = the module counts pending opens (recommended); "plain" = remember-last, no counter.

| #     | Scenario                                                    | Result                        | Observed tag(s) and evidence                                                                                                                                                                                                      |
| ----- | ----------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| i     | `/play` mounts, sample only                                 | **PASS**                      | unset before mount → `sample` after; header `1-beat.gp`; no reports                                                                                                                                                               |
| ii    | open guitar-only `guitar-no-percussion.gp`                  | **PASS**                      | `025`; announcement `Opened guitar-no-percussion.gp`                                                                                                                                                                              |
| iii   | open `Punk.gp`                                              | **PASS**                      | `drums,030` — by pick and by drop                                                                                                                                                                                                 |
| iii-b | open a visitor copy of the sample's bytes (`my-beat.gp`)    | **PASS**                      | `drums` — not `sample`: F-25's split holds                                                                                                                                                                                        |
| iv    | Punk open → pick `notes.txt`                                | **PASS**                      | E103 tags `{"code":"E103"}` — no `instruments`; the tag was OFF while the Replace prompt was up; afterwards `drums,030`; Punk still shown; same by drop                                                                           |
| v     | sample only → pick `notes.txt`                              | **PASS**                      | no prompt; E103 `{"code":"E103"}`; afterwards `sample`. Also E101 (pick, 26 MB) and E102 (drop, unreadable): `{"code":"E101"}`, `{"code":"E102"}`; afterwards `sample`                                                            |
| vi    | Cancel on "Replace …?"                                      | **PASS**                      | the prompt exists (`PlayerShell.tsx:805-823`, only with a visitor's score open); tag off while it was up; no report; afterwards `drums,030`; Punk still shown                                                                     |
| vi-b  | E205 — the engine never loaded                              | **PASS**                      | engine banner shown; returned before any parse; afterwards `sample`                                                                                                                                                               |
| vii   | E105 AFTER the swap (`toast.success` throws, Punk → guitar) | **PASS**                      | header shows the new file (the swap committed); ends `025`, not `drums,030`. The E105 report itself: counted `{"code":"E105"}`, plain `{"instruments":"025","code":"E105"}`                                                       |
| viii  | E105 BEFORE the swap (`dropPlaybackSelection` throws)       | **PASS**                      | E105 `{"code":"E105"}`, message kept; afterwards `drums,030`; Punk still shown                                                                                                                                                    |
| ix-a  | late sample arrives after the visitor's swap                | **PASS**                      | stays `drums,030`; no tag change at all during the race. Race reproduced: `renderScore` calls `Punk, sample, Punk`; a listener subscribed after NotationSurface's saw `arg=Punk api.score=Punk`, then `arg=sample api.score=Punk` |
| ix-b  | sample arrives DURING the visitor's open                    | **PASS**                      | tag stays off through the sample's load; `drums,030` after the swap                                                                                                                                                               |
| ix-c  | sample arrives during an open that then fails E103          | **PASS**                      | E103 `{"code":"E103"}`; afterwards `sample`                                                                                                                                                                                       |
| x-a   | dropped 2nd pick, 1st succeeds                              | **PASS**                      | ends `drums,030` (1st file). Between the drop and the 1st swap: counted `(none)`; plain `sample`                                                                                                                                  |
| x-b   | dropped 2nd pick, 1st fails E103                            | **PASS counted / FAIL plain** | counted E103 `{"code":"E103"}`; plain `{"instruments":"drums,030","code":"E103"}` — the old song on the new file's report. Ends `drums,030`                                                                                       |
| x-c   | overlapping 2nd pick fails to READ (E101)                   | **PASS counted / FAIL plain** | E101 `{"code":"E101"}` both; the 1st's E103: counted no tag, plain `drums,030`. Ends `drums,030`                                                                                                                                  |
| x-d   | 2nd pick still reading when the 1st finishes                | **PASS counted / FAIL plain** | between opens: counted `(none)`, plain `025`; the 2nd's E103: counted no tag, plain `025`. Ends `025`                                                                                                                             |
| xi-a  | leave `/play`, sample only                                  | REPORT                        | `sample` lingers after unmount                                                                                                                                                                                                    |
| xi-b  | leave `/play`, Punk open                                    | REPORT                        | `drums,030` lingers after unmount                                                                                                                                                                                                 |
| xi-c  | leave `/play` MID-open                                      | REPORT                        | `(none)` at unmount; the abandoned open keeps running and sets `drums,030` after the player is gone — a song that never reached a screen                                                                                          |
| xi-d  | come back to `/play`                                        | REPORT                        | `sample` again on remount                                                                                                                                                                                                         |

"The right value" for (x): the dropped pick never opened anything, so the end value is the 1st
open's outcome — the 1st file's value if it swapped, else the value for the score still on screen.
And while the 1st open is pending, the tag must stay off, so the 1st file's own failure report
carries nothing. Only the counted module does both.

(xi) in a real browser: the player unmounts (path map above). Whether Sentry's scope survives a
client-side navigation is **(untested — `@sentry/nextjs` is not installed)**; reasoned: the
browser SDK keeps one scope per page load, so a report sent from `/` after leaving `/play` would
carry `sample` or the last song's value. Not fixed, as asked. A fix would clear the tag in the
mount effect's cleanup AND ignore tag/restore calls from an open that outlived its player (xi-c).

## Mutation runs (the tests can fail)

| Mutation | Change                                                              | Result                                                                                                                                                          |
| -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1       | no `tagInstruments` at the swap                                     | 20 of 24 failed                                                                                                                                                 |
| M2       | no `suspendInstruments` at pick                                     | 15 of 24 failed (the drop path kept its own, so `iv-drop` still passed — as it should)                                                                          |
| M3       | restore puts back a value SNAPSHOTTED at suspend — the named hazard | 20 of 24 failed, including plain success: `expected 'sample' to be 'drums,030'` — the `finally` restore wrote the old value over the new score                  |
| M4       | the shell's `scoreLoaded` handler tags from the event's ARGUMENT    | 2 of 3 race tests failed: log `tag drums,030, scope=drums,030, tag drums, scope=drums` — ends `drums` with Punk on screen; (ix-c) ends `drums`, losing `sample` |

Each mutation was reverted before the next run.

## Totals

- Final run of both spike files: **29 passed (29)**.
- Whole `web/` unit suite WITH the patch (before iii-b and vi-b were added): **16 files, 146 tests
  passed** — 119 existing + 27 spike. The patch breaks no existing test.
- `tsc --noEmit` passed; ESLint passed on the patched `PlayerShell.tsx`, `OpenFileControl.tsx` and
  `report.ts` (after three style fixes in `report.ts`: `toSorted`, no useless `undefined`, no
  callback reference).

## Findings for the spec

1. **Count pending opens inside the module** (F-23). Without it, x-b, x-c and x-d send the
   previous song's instruments on the new file's failure report. Zero extra call sites.
2. **One remembered value, overwritten at the swap; restore in `finally`.** Covers Cancel, E101,
   E102, E103, E205, the guard drop, E105 before and after the swap. No `swapped` flag.
3. **Tag at the swap, before `setNotation`.** And no `scoreLoaded` listener touches the tag. With
   F-21 (`rememberScore` moves into `requestNotation` too), the shell's score-loaded handler gets
   no monitoring code at all — §1's "the score-loaded handler remembers the score's names and sets
   the tag" and §2.3's "The tag is set when a score loads" both need rewording.
4. **What the E105-after-swap report carries** is an owner choice: with the counter it carries no
   `instruments` (the open is still pending when the catch reports); the end state is the new
   value either way.
5. **`sample` at mount means** E201, E203 and E204 during the first load carry `sample`, which
   keeps "errors while only the sample is on screen" findable. (Reasoned from the code; those
   report paths were not built in the spike.)
6. **A hung open** (the engine import awaited at `:779` never settling) keeps the count above 0,
   so the tag stays off for the rest of the visit — never wrong, only absent. (Reasoned, untested.)
7. **Leaving `/play`** leaves the tag set (xi). Out of scope here; worth one line in the spec.
8. **To verify at plan time:** how Sentry 11 removes a tag (`setTag('instruments', undefined)` is
   assumed to drop it from the sent envelope) — untested.
9. Aside, out of scope: `SettingsPopover.tsx:95-102` reads the stylesheet from the score-loaded
   ARGUMENT with no `api.score` guard. It ends right in the race only because it subscribes before
   NotationSurface (reasoned from React's effect order — `actions` renders inside PlayerHeader,
   before NotationSurface; not asserted).

## Untested, and why

- Real Sentry: not installed (stubbed). Tag removal semantics and scope lifetime across
  client-side navigation: untested.
- A real browser: the late-sample race ran against a fake api that copies AlphaTab's emitter and
  `_internalRenderTracks` code, not against the engine itself. The e2e (`player.e2e.ts:586-601`)
  could assert the tag once the Sentry envelope fixture exists.
- Real client-side navigation (xi): unmount simulated with `unmount()`; the claim that Next
  unmounts `/play` rests on `next.config.ts` and the bundled Next doc.
- A throw while computing `instrumentsValue` at the swap: reasoned only.

## Minimal API (POC, 24 lines)

```ts
import * as Sentry from '@sentry/nextjs';
let onScreen: string | undefined; // the value for the score on screen
let pending = 0; // opens picked or dropped and not yet finished
/** The score on screen changed: 'sample' at mount, instrumentsValue(score) at the swap. */
export function tagInstruments(value: string): void {
  onScreen = value;
  if (pending === 0) Sentry.setTag('instruments', value);
}
/** A file was picked or dropped: the tag is off until that open ends. */
export function suspendInstruments(): void {
  pending += 1;
  Sentry.setTag('instruments', undefined); // removal semantics: verify at plan time
}
/** That open ended, whatever the outcome. Call it in `finally`, after any failure report. */
export function restoreInstruments(): void {
  pending -= 1; // always paired with one suspend, in the same function
  if (pending === 0) Sentry.setTag('instruments', onScreen);
}
type Scannable = {
  tracks: readonly {
    playbackInfo: { program: number };
    staves: readonly { isPercussion: boolean }[];
  }[];
};
export function instrumentsValue({ tracks }: Scannable): string {
  const isDrums = (t: Scannable['tracks'][number]) => t.staves.some((s) => s.isPercussion);
  const programs = [
    ...new Set(tracks.filter((t) => !isDrums(t)).map((t) => t.playbackInfo.program)),
  ];
  return [
    ...(tracks.some((t) => isDrums(t)) ? ['drums'] : []),
    ...programs.toSorted((a, b) => a - b).map((p) => String(p).padStart(3, '0')),
  ].join(',');
}
```

(The two long lines would be wrapped by Prettier; the spike's lint-clean version is in the patch.)

## The complete patch

Tracked files, then the three new files. The stub `report.ts` adds a fake scope, a capture log, a
`counted` toggle and test seams around the API above.

### designA-tracked.diff

```diff
diff --git a/web/app/play/OpenFileControl.tsx b/web/app/play/OpenFileControl.tsx
index f538d38e..33598bbb 100644
--- a/web/app/play/OpenFileControl.tsx
+++ b/web/app/play/OpenFileControl.tsx
@@ -4,6 +4,11 @@ import { Button, Tooltip, TooltipContent, TooltipTrigger, toast } from '@notatio
 import { ERROR } from '@notation-hero/shared/error-codes';
 import { useId, useRef } from 'react';

+import {
+  reportError,
+  restoreInstruments,
+  suspendInstruments,
+} from '../../lib/monitoring/report';
 import type { LoadedNotation } from './PlayerShell';

 // Every extension of a format AlphaTab 1.8.4 reads (spec §4): Guitar Pro 3-8, MusicXML plain and
@@ -68,17 +73,27 @@ export function OpenFileControl({ onNotation }: Readonly<OpenFileControlProps>)
   // would produce nothing at all: no toast, no error state, just a control the user keeps pressing.
   const accept = async (file: File | undefined) => {
     if (!file) return;
+    // SPIKE (F-23): off before the file is read; back on in `finally`, after any report.
+    suspendInstruments();
+    let read = false;
     try {
       // AWAIT it: onNotation is async, so an un-awaited call drops any rejection on the floor —
       // the same reason the drag-and-drop twin in PlayerShell awaits requestNotation.
-      await onNotation(await readNotation(file));
-    } catch {
+      const loaded = await readNotation(file);
+      read = true;
+      await onNotation(loaded);
+    } catch (error) {
+      // SPIKE: E105 once the file was read (our own code failed), else E101/E102.
+      if (read) reportError(error, { code: 'E105' });
+      else reportError(error, { code: openFailureCode(file), level: 'warning' });
       // Same id as requestNotation's loading toast, so a throw mid-open REPLACES the "Opening…"
       // spinner instead of stacking a second toast beside one that never resolves.
       // Own id, not the spinner's: see the note in PlayerShell. Same file failing the same way
       // twice refreshes one toast rather than stacking a duplicate.
       toast.dismiss('notation-load');
       toast.error(readFailureMessage(file), { id: `${openFailureCode(file)}:${file.name}` });
+    } finally {
+      restoreInstruments();
     }
   };

diff --git a/web/app/play/PlayerShell.tsx b/web/app/play/PlayerShell.tsx
index 11b91a83..0a438ba7 100644
--- a/web/app/play/PlayerShell.tsx
+++ b/web/app/play/PlayerShell.tsx
@@ -37,6 +37,13 @@ import {
 } from '../../lib/alphatab/settings-storage';
 import { persistTransport, TRANSPORT_LABELS } from '../../lib/alphatab/transport-storage';
 import { setAlphaTabValue, useAlphaTab, useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
+import {
+  instrumentsValue,
+  reportError,
+  restoreInstruments,
+  suspendInstruments,
+  tagInstruments,
+} from '../../lib/monitoring/report';
 import { NotationSurface } from './NotationSurface';
 import {
   OpenFileControl,
@@ -194,6 +201,12 @@ function Player() {
   // initialised read of the stored value can reach it without closing over a const declared later.
   const [settings, setSettings] = useState<PlayerSettingsJson>(restored.settings);

+  // SPIKE (F-25): the bundled sample is the score on screen from the first frame, so a report
+  // made while it is the only score carries `sample`, not the `drums` a visitor's chart would.
+  useEffect(() => {
+    tagInstruments('sample');
+  }, []);
+
   // A toast is not state, so an effect is the right place for it. Without it a drummer watches
   // their colours and fonts revert with no way to tell it from a bug — the same surface the
   // corrupt-file and engine-failure states already use.
@@ -843,7 +856,10 @@ function Player() {
       let score: AlphaTab.model.Score;
       try {
         score = at.importer.ScoreLoader.loadScoreFromBytes(next.bytes);
-      } catch {
+      } catch (error) {
+        // SPIKE: the E103 report. The tag is suspended here (the pick took it off), so this report
+        // carries no `instruments`; the caller's `finally` puts the old value back afterwards.
+        reportError(error, { code: ERROR.notAScore, level: 'warning' });
         setOpening(false);
         // Dismiss the spinner explicitly, then raise the error under its OWN id. Sharing
         // 'notation-load' is what made an error REPLACE the spinner — necessary while toasts
@@ -883,6 +899,11 @@ function Player() {
       // Opening a file is a deliberate new attempt, so a crash reported against the PREVIOUS
       // score must not keep the player marked failed forever — nothing else ever sets this back.
       setLoadFailed(false);
+      // SPIKE (F-23): THE SWAP. The tag follows the score on screen, so it moves here — BEFORE
+      // setNotation, so a throw while computing the value leaves both the old score and the old
+      // value in place. After this line the remembered value is the new score's, so a restore on a
+      // later throw puts the NEW value back, never the old one: no `swapped` flag is needed.
+      tagInstruments(instrumentsValue(score));
       setNotation({ name: next.name, score });
       setOpening(false);
       toast.success(`${next.name} loaded`, { id: 'notation-load' });
@@ -938,13 +959,23 @@ function Player() {
   const acceptDropped = useCallback(
     async (file: File | undefined) => {
       if (!file) return;
+      // SPIKE (F-23): off before the file is read; back on in `finally`, after any report.
+      suspendInstruments();
+      let read = false;
       try {
-        await requestNotation(await readNotation(file));
-      } catch {
+        const loaded = await readNotation(file);
+        read = true;
+        await requestNotation(loaded);
+      } catch (error) {
+        // SPIKE: E105 once the file was read (our own code failed), else E101/E102.
+        if (read) reportError(error, { code: 'E105' });
+        else reportError(error, { code: openFailureCode(file), level: 'warning' });
         // Same id as requestNotation's loading toast — see OpenFileControl's `accept`.
         toast.dismiss('notation-load');
         toast.error(readFailureMessage(file), { id: `${openFailureCode(file)}:${file.name}` });
         setAnnouncement(`${file.name} could not be opened. Error ${openFailureCode(file)}.`);
+      } finally {
+        restoreInstruments();
       }
     },
     [requestNotation],
```

### designA-report-ts.diff

```diff
diff --git a/web/lib/monitoring/report.ts b/web/lib/monitoring/report.ts
new file mode 100644
index 00000000..c774352f
--- /dev/null
+++ b/web/lib/monitoring/report.ts
@@ -0,0 +1,119 @@
+// SPIKE (NH-124, findings F-23 / F-25) — THROWAWAY. A stub of the planned monitoring module.
+// The real one would call @sentry/nextjs, which is not installed; this one keeps a fake scope so a
+// test can read the `instruments` tag and the tags each captured report carried.
+
+type Tags = Record<string, string>;
+
+interface CapturedReport {
+  code: string | undefined;
+  level: 'error' | 'warning';
+  message: string;
+  /** The scope's tags at the moment of capture, plus the report's own `code`. */
+  tags: Tags;
+}
+
+/** The fake Sentry: the scope's tags, every captured report, and every tag change in order. */
+export const fakeSentry = {
+  scope: new Map<string, string>(),
+  reports: [] as CapturedReport[],
+  log: [] as string[],
+};
+
+export function reportError(
+  error: unknown,
+  options: { code?: string; level?: 'error' | 'warning' } = {},
+): void {
+  fakeSentry.reports.push({
+    code: options.code,
+    level: options.level ?? 'error',
+    message: error instanceof Error ? error.message : String(error),
+    tags: {
+      ...Object.fromEntries(fakeSentry.scope),
+      ...(options.code ? { code: options.code } : {}),
+    },
+  });
+}
+
+// ---- The `instruments` tag (Design A) ----------------------------------------------------------
+
+/** The value for the score on screen: what restoreInstruments puts back. */
+let onScreen: string | undefined;
+/** Opens picked or dropped and not yet finished. The tag stays off the scope while any is. */
+let pending = 0;
+/** SPIKE toggle. false = plain remember-last semantics (no counter), kept to show scenario (x). */
+let counted = true;
+let restoreCount = 0;
+
+function applyToScope(value: string | undefined): void {
+  if (value === undefined) fakeSentry.scope.delete('instruments');
+  else fakeSentry.scope.set('instruments', value);
+  fakeSentry.log.push(`scope=${value ?? '(none)'}`);
+}
+
+function clearScope(): void {
+  fakeSentry.scope.delete('instruments');
+  fakeSentry.log.push('scope=(none)');
+}
+
+/** The score on screen changed: remember its value, and show it unless an open is pending. */
+export function tagInstruments(value: string): void {
+  onScreen = value;
+  fakeSentry.log.push(`tag ${value}`);
+  if (!counted || pending === 0) applyToScope(value);
+}
+
+/** A file was picked or dropped: take the tag off until that open ends. */
+export function suspendInstruments(): void {
+  pending += 1;
+  fakeSentry.log.push(`suspend (pending ${pending})`);
+  clearScope();
+}
+
+/** That open ended, whatever the outcome: put back the value for the score now on screen. */
+export function restoreInstruments(): void {
+  pending = Math.max(0, pending - 1);
+  restoreCount += 1;
+  fakeSentry.log.push(`restore (pending ${pending})`);
+  if (!counted || pending === 0) applyToScope(onScreen);
+}
+
+interface InstrumentScannable {
+  tracks: readonly {
+    playbackInfo: { program: number };
+    staves: readonly { isPercussion: boolean }[];
+  }[];
+}
+
+/** `drums` first, then each General MIDI program once, ascending, three digits: `drums,030`. */
+export function instrumentsValue(score: InstrumentScannable): string {
+  const isDrums = (track: InstrumentScannable['tracks'][number]) =>
+    track.staves.some((staff) => staff.isPercussion);
+  const programs = [
+    ...new Set(score.tracks.filter((t) => !isDrums(t)).map((t) => t.playbackInfo.program)),
+  ].toSorted((a, b) => a - b);
+  return [
+    ...(score.tracks.some((t) => isDrums(t)) ? ['drums'] : []),
+    ...programs.map((program) => String(program).padStart(3, '0')),
+  ].join(',');
+}
+
+// ---- Test seams (spike only) -------------------------------------------------------------------
+
+export function instrumentsState(): {
+  scope: string | undefined;
+  onScreen: string | undefined;
+  pending: number;
+  restoreCount: number;
+} {
+  return { scope: fakeSentry.scope.get('instruments'), onScreen, pending, restoreCount };
+}
+
+export function resetMonitoringForTests(options: { counted?: boolean } = {}): void {
+  fakeSentry.scope.clear();
+  fakeSentry.reports.length = 0;
+  fakeSentry.log.length = 0;
+  onScreen = undefined;
+  pending = 0;
+  restoreCount = 0;
+  counted = options.counted ?? true;
+}
```

### designA-spike-test.diff

```diff
diff --git a/web/app/play/PlayerShell.instruments-spike.test.tsx b/web/app/play/PlayerShell.instruments-spike.test.tsx
new file mode 100644
index 00000000..69af1d3e
--- /dev/null
+++ b/web/app/play/PlayerShell.instruments-spike.test.tsx
@@ -0,0 +1,433 @@
+// SPIKE (NH-124, F-23 / F-25) — THROWAWAY. Drives the REAL PlayerShell and OpenFileControl, and
+// the REAL AlphaTab importer parses REAL fixtures. Mocked: the router, the AlphaTab api (none — the
+// same choice PlayerShell.test.tsx makes), and two steps used only to inject a throw.
+// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next
+import * as engine from '@coderline/alphatab';
+import { fireEvent, render, screen, waitFor } from '@testing-library/react';
+import { readFileSync } from 'node:fs';
+import path from 'node:path';
+import { afterEach, beforeEach, expect, test, vi } from 'vitest';
+
+const hoisted = vi.hoisted(() => ({
+  dropSelection: vi.fn((_api: unknown) => false),
+  successThrowsNext: { on: false },
+  loadingCalls: { count: 0 },
+  engineMissing: { on: false },
+}));
+
+vi.mock('next/navigation', () => ({
+  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
+  usePathname: () => '/play',
+  useSearchParams: () => new URLSearchParams(),
+}));
+
+vi.mock('../../lib/alphatab/AlphaTabEngineContext', () => ({
+  AlphaTabEngineProvider: ({ children }: { readonly children: ReactNode }) => children,
+  useAlphaTabEngine: () =>
+    hoisted.engineMissing.on
+      ? { engine: null, error: new Error('injected: engine import failed') }
+      : { engine, error: null },
+}));
+
+// E205: the open path waits on the same memoised import, which has failed for good.
+vi.mock('../../lib/alphatab/engine', async (importOriginal) => ({
+  ...(await importOriginal<typeof import('../../lib/alphatab/engine')>()),
+  loadAlphaTabEngine: () =>
+    hoisted.engineMissing.on
+      ? Promise.reject(new Error('injected: engine import failed'))
+      : Promise.resolve(engine),
+}));
+
+vi.mock('../../lib/alphatab/useAlphaTab', () => ({
+  useAlphaTab: () => [undefined, { current: null }],
+  useAlphaTabEvent: () => {},
+  setAlphaTabValue: () => {},
+}));
+
+// The step just BEFORE the swap (PlayerShell's runRequestNotation calls it after the parse).
+vi.mock('../../lib/alphatab/playback-selection', () => ({
+  dropPlaybackSelection: hoisted.dropSelection,
+}));
+
+// toast.success is the first step AFTER the swap that can throw (setOpening cannot).
+vi.mock('@notation-hero/client', async (importOriginal) => {
+  const real = await importOriginal<typeof import('@notation-hero/client')>();
+  const success = ((...args: Parameters<typeof real.toast.success>) => {
+    if (hoisted.successThrowsNext.on) {
+      hoisted.successThrowsNext.on = false;
+      throw new Error('injected: a step after the swap threw');
+    }
+    return real.toast.success(...args);
+  }) as typeof real.toast.success;
+  const loading = ((...args: Parameters<typeof real.toast.loading>) => {
+    hoisted.loadingCalls.count += 1;
+    return real.toast.loading(...args);
+  }) as typeof real.toast.loading;
+  const toast = Object.assign(
+    (...args: Parameters<typeof real.toast>) => real.toast(...args),
+    real.toast,
+    { success, loading },
+  );
+  return { ...real, toast };
+});
+
+import {
+  fakeSentry,
+  instrumentsState,
+  resetMonitoringForTests,
+} from '../../lib/monitoring/report';
+import { PlayerShell } from './PlayerShell';
+
+import type { ReactNode } from 'react';
+
+// Vitest runs from web/ (the package root); jsdom's URL refuses import.meta.url's scheme here.
+const FIXTURES = path.join(process.cwd(), 'e2e/fixtures/');
+const fileOf = (name: string) => new File([readFileSync(`${FIXTURES}${name}`)], name);
+const notesTxt = () => new File([new TextEncoder().encode('just some notes')], 'notes.txt');
+
+function pick(file: File): void {
+  const input = screen.getByTestId('open-file-input') as HTMLInputElement;
+  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
+  fireEvent.change(input);
+}
+
+function drop(file: File): void {
+  fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files: [file] } });
+}
+
+/** Every open ends in the pick's or the drop's `finally`, which is where the restore runs. */
+const settled = (count: number) =>
+  waitFor(() => expect(instrumentsState().restoreCount).toBe(count), { timeout: 8000 });
+
+/** The first open is past the one-at-a-time guard and waiting on its loading toast. */
+const inFlight = (loadingCalls: number) =>
+  waitFor(() => expect(hoisted.loadingCalls.count).toBe(loadingCalls), { timeout: 4000 });
+
+const shownFile = () => screen.getByTestId('loaded-notation-name').getAttribute('data-file');
+const announced = () => document.querySelector('p[aria-live="polite"]')?.textContent ?? '';
+const scope = () => instrumentsState().scope;
+
+const confirmAsked: (string | undefined)[] = [];
+let confirmAnswer = true;
+
+beforeEach(() => {
+  resetMonitoringForTests();
+  hoisted.dropSelection.mockClear();
+  hoisted.successThrowsNext.on = false;
+  hoisted.loadingCalls.count = 0;
+  hoisted.engineMissing.on = false;
+  confirmAsked.length = 0;
+  confirmAnswer = true;
+  // Records the tag at the moment the "Replace …?" prompt is up.
+  vi.stubGlobal(
+    'confirm',
+    vi.fn(() => {
+      confirmAsked.push(scope());
+      return confirmAnswer;
+    }),
+  );
+});
+
+afterEach(() => {
+  vi.unstubAllGlobals();
+});
+
+async function openPunk(): Promise<void> {
+  pick(fileOf('Punk.gp'));
+  await settled(1);
+  await waitFor(() => expect(shownFile()).toBe('Punk.gp'));
+  expect(scope()).toBe('drums,030');
+}
+
+test('(i) /play mounts with only the sample: the tag is `sample`', async () => {
+  // Harness proof: nothing is set before the shell mounts, so `sample` below is the mount's doing.
+  expect(scope()).toBeUndefined();
+  render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+  expect(shownFile()).toBe('1-beat.gp');
+  expect(fakeSentry.reports).toEqual([]);
+});
+
+test('(ii) a guitar-only file gives `025`', async () => {
+  render(<PlayerShell />);
+  pick(fileOf('guitar-no-percussion.gp'));
+  await settled(1);
+  await waitFor(() => expect(announced()).toBe('Opened guitar-no-percussion.gp'));
+  expect(shownFile()).toBe('guitar-no-percussion.gp');
+  expect(scope()).toBe('025');
+  expect(fakeSentry.reports).toEqual([]);
+});
+
+test('(iii) Punk.gp (percussion + program 30) gives `drums,030`', async () => {
+  render(<PlayerShell />);
+  await openPunk();
+  await waitFor(() => expect(announced()).toBe('Opened Punk.gp'));
+  expect(fakeSentry.reports).toEqual([]);
+});
+
+test('(iii-b) a visitor opening the SAME bytes as the sample gets `drums`, not `sample`', async () => {
+  render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+  const own = new File([readFileSync(path.join(process.cwd(), 'public/notation/1-beat.gp'))], 'my-beat.gp');
+  pick(own);
+  await settled(1);
+  await waitFor(() => expect(shownFile()).toBe('my-beat.gp'));
+  expect(scope()).toBe('drums');
+});
+
+test('(vi-b) E205 — the engine never loaded: the open ends without a swap; back to `sample`', async () => {
+  hoisted.engineMissing.on = true;
+  render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+  expect(screen.getByTestId('engine-error')).toBeInTheDocument(); // proof: the engine is down
+  pick(fileOf('Punk.gp'));
+  await settled(1);
+  expect(hoisted.loadingCalls.count).toBe(0); // returned at the E205 branch, before any parse
+  expect(fakeSentry.reports).toEqual([]); // the spike sends no E205 breadcrumb (spec: noteError)
+  expect(shownFile()).toBe('1-beat.gp');
+  expect(scope()).toBe('sample');
+});
+
+test('(iii-drop) the same file DROPPED also gives `drums,030`', async () => {
+  render(<PlayerShell />);
+  drop(fileOf('Punk.gp'));
+  await settled(1);
+  await waitFor(() => expect(shownFile()).toBe('Punk.gp'));
+  expect(scope()).toBe('drums,030');
+});
+
+test('(iv) Punk open, pick notes.txt: the E103 report has no tag; afterwards `drums,030`', async () => {
+  render(<PlayerShell />);
+  await openPunk();
+  pick(notesTxt());
+  await settled(2);
+  // The Replace prompt appeared (a visitor's score was open), and the tag was off while it was up.
+  expect(confirmAsked).toEqual([undefined]);
+  expect(fakeSentry.reports.map((r) => r.code)).toEqual(['E103']);
+  expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E103' });
+  expect(scope()).toBe('drums,030');
+  expect(shownFile()).toBe('Punk.gp');
+  await waitFor(() => expect(announced()).toBe('notes.txt could not be opened. Error E103.'));
+});
+
+test('(iv-drop) the same through a DROP', async () => {
+  render(<PlayerShell />);
+  await openPunk();
+  drop(notesTxt());
+  await settled(2);
+  expect(fakeSentry.reports.map((r) => r.code)).toEqual(['E103']);
+  expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E103' });
+  expect(scope()).toBe('drums,030');
+});
+
+test('(v) only the sample open, pick notes.txt: the E103 report has no tag; afterwards `sample`', async () => {
+  render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+  pick(notesTxt());
+  await settled(1);
+  expect(confirmAsked).toEqual([]); // replacing the sample asks nothing
+  expect(fakeSentry.reports.map((r) => r.code)).toEqual(['E103']);
+  expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E103' });
+  expect(scope()).toBe('sample');
+  expect(shownFile()).toBe('1-beat.gp');
+});
+
+test('(v-E101/E102) read failures with only the sample open: no tag; afterwards `sample`', async () => {
+  render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+  const huge = fileOf('Punk.gp');
+  Object.defineProperty(huge, 'size', { value: 26 * 1024 * 1024 });
+  pick(huge);
+  await settled(1);
+  const unreadable = fileOf('Punk.gp');
+  unreadable.arrayBuffer = () => Promise.reject(new DOMException('gone', 'NotReadableError'));
+  drop(unreadable);
+  await settled(2);
+  expect(fakeSentry.reports.map((r) => [r.code, r.tags])).toEqual([
+    ['E101', { code: 'E101' }],
+    ['E102', { code: 'E102' }],
+  ]);
+  expect(scope()).toBe('sample');
+});
+
+test('(vi) Cancel on "Replace …?": no report; the tag is back to `drums,030`', async () => {
+  render(<PlayerShell />);
+  await openPunk();
+  confirmAnswer = false;
+  pick(fileOf('guitar-no-percussion.gp'));
+  await settled(2);
+  expect(confirmAsked).toEqual([undefined]); // off while the prompt was up
+  expect(fakeSentry.reports).toEqual([]);
+  expect(scope()).toBe('drums,030');
+  expect(shownFile()).toBe('Punk.gp');
+});
+
+for (const counted of [true, false]) {
+  test(`(vii) E105 AFTER the swap ends on the NEW value [${counted ? 'counted' : 'plain'}]`, async () => {
+    resetMonitoringForTests({ counted });
+    render(<PlayerShell />);
+    await openPunk();
+    hoisted.successThrowsNext.on = true;
+    pick(fileOf('guitar-no-percussion.gp'));
+    await settled(2);
+    expect(hoisted.successThrowsNext.on).toBe(false); // the injected throw really fired
+    expect(fakeSentry.reports.map((r) => r.code)).toEqual(['E105']);
+    expect(fakeSentry.reports[0]?.message).toBe('injected: a step after the swap threw');
+    // The swap committed: the new file is the one on screen …
+    await waitFor(() => expect(shownFile()).toBe('guitar-no-percussion.gp'));
+    // … and the tag is the new file's, not Punk's.
+    expect(scope()).toBe('025');
+    // What the E105 report itself carried: nothing while the open was pending (counted), or the
+    // new file's value, set at the swap (plain). Never Punk's.
+    console.info(
+      `[spike vii ${counted ? 'counted' : 'plain'}] E105 tags`,
+      JSON.stringify(fakeSentry.reports[0]?.tags),
+    );
+    if (counted) expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E105' });
+    else expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E105', instruments: '025' });
+  });
+}
+
+test('(viii) E105 BEFORE the swap: the report has no tag; afterwards `drums,030`', async () => {
+  render(<PlayerShell />);
+  await openPunk();
+  hoisted.dropSelection.mockImplementationOnce(() => {
+    throw new Error('injected: a step before the swap threw');
+  });
+  pick(fileOf('guitar-no-percussion.gp'));
+  await settled(2);
+  expect(hoisted.dropSelection).toHaveBeenCalledTimes(2); // once per open; the second threw
+  expect(fakeSentry.reports.map((r) => [r.code, r.message, r.tags])).toEqual([
+    ['E105', 'injected: a step before the swap threw', { code: 'E105' }],
+  ]);
+  expect(scope()).toBe('drums,030');
+  expect(shownFile()).toBe('Punk.gp');
+});
+
+for (const counted of [true, false]) {
+  const label = counted ? 'counted' : 'plain';
+
+  test(`(x-a) a dropped second pick while the first succeeds [${label}]`, async () => {
+    resetMonitoringForTests({ counted });
+    render(<PlayerShell />);
+    await waitFor(() => expect(scope()).toBe('sample'));
+    pick(fileOf('Punk.gp'));
+    await inFlight(1);
+    pick(fileOf('guitar-no-percussion.gp')); // dropped by the one-open-at-a-time guard
+    await settled(1);
+    const midWindow = scope();
+    expect(instrumentsState().pending).toBe(1); // proof: the first open is still running here
+    await settled(2);
+    expect(hoisted.loadingCalls.count).toBe(1); // the second never started an open
+    await waitFor(() => expect(shownFile()).toBe('Punk.gp'));
+    expect(scope()).toBe('drums,030');
+    console.info(`[spike x-a ${label}] tag between the dropped pick and the first swap:`, midWindow);
+    if (counted) expect(midWindow).toBeUndefined();
+    else expect(midWindow).toBe('sample');
+  });
+
+  test(`(x-b) a dropped second pick while the first FAILS (E103) [${label}]`, async () => {
+    resetMonitoringForTests({ counted });
+    render(<PlayerShell />);
+    await openPunk();
+    pick(notesTxt());
+    await inFlight(2);
+    pick(fileOf('guitar-no-percussion.gp')); // dropped
+    await settled(3);
+    expect(fakeSentry.reports.map((r) => r.code)).toEqual(['E103']);
+    console.info(`[spike x-b ${label}] E103 tags`, JSON.stringify(fakeSentry.reports[0]?.tags));
+    if (counted) expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E103' });
+    else expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E103', instruments: 'drums,030' });
+    expect(scope()).toBe('drums,030');
+    expect(shownFile()).toBe('Punk.gp');
+  });
+
+  test(`(x-c) an overlapping second pick that fails to READ (E101) [${label}]`, async () => {
+    resetMonitoringForTests({ counted });
+    render(<PlayerShell />);
+    await openPunk();
+    pick(notesTxt());
+    await inFlight(2);
+    const huge = fileOf('guitar-no-percussion.gp');
+    Object.defineProperty(huge, 'size', { value: 26 * 1024 * 1024 });
+    pick(huge);
+    await settled(3);
+    expect(fakeSentry.reports.map((r) => r.code)).toEqual(['E101', 'E103']);
+    console.info(
+      `[spike x-c ${label}] E101 then E103 tags`,
+      JSON.stringify(fakeSentry.reports.map((r) => r.tags)),
+    );
+    expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E101' });
+    if (counted) expect(fakeSentry.reports[1]?.tags).toEqual({ code: 'E103' });
+    else expect(fakeSentry.reports[1]?.tags).toEqual({ code: 'E103', instruments: 'drums,030' });
+    expect(scope()).toBe('drums,030');
+  });
+
+  test(`(x-d) a second pick whose READ outlasts the first open [${label}]`, async () => {
+    resetMonitoringForTests({ counted });
+    render(<PlayerShell />);
+    await openPunk();
+    pick(fileOf('guitar-no-percussion.gp')); // will succeed in ~0.5 s
+    const slow = notesTxt();
+    const bytes = new TextEncoder().encode('just some notes');
+    slow.arrayBuffer = () =>
+      new Promise((resolve) => {
+        setTimeout(() => resolve(bytes.buffer), 2000);
+      });
+    pick(slow); // still reading when the first open finishes, so NOT dropped
+    await settled(2);
+    await waitFor(() => expect(shownFile()).toBe('guitar-no-percussion.gp'));
+    const betweenOpens = scope();
+    expect(instrumentsState().pending).toBe(1); // proof: the slow pick is still reading here
+    await settled(3);
+    expect(confirmAsked).toHaveLength(2); // both opens met the Replace prompt
+    expect(fakeSentry.reports.map((r) => r.code)).toEqual(['E103']);
+    console.info(
+      `[spike x-d ${label}] tag between the opens: ${String(betweenOpens)}; E103 tags`,
+      JSON.stringify(fakeSentry.reports[0]?.tags),
+    );
+    if (counted) {
+      expect(betweenOpens).toBeUndefined();
+      expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E103' });
+    } else {
+      expect(betweenOpens).toBe('025');
+      expect(fakeSentry.reports[0]?.tags).toEqual({ code: 'E103', instruments: '025' });
+    }
+    expect(scope()).toBe('025');
+  });
+}
+
+test('(xi-a) leaving /play with only the sample: `sample` lingers after unmount', async () => {
+  const { unmount } = render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+  unmount();
+  expect(scope()).toBe('sample');
+});
+
+test('(xi-b) leaving /play with Punk open: `drums,030` lingers after unmount', async () => {
+  const { unmount } = render(<PlayerShell />);
+  await openPunk();
+  unmount();
+  expect(scope()).toBe('drums,030');
+});
+
+test('(xi-c) leaving /play MID-open: the abandoned open still sets the tag after unmount', async () => {
+  const { unmount } = render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+  pick(fileOf('Punk.gp'));
+  await inFlight(1);
+  unmount();
+  const atUnmount = scope();
+  await settled(1); // the open's promise keeps running after the player is gone
+  console.info('[spike xi-c] tag at unmount:', atUnmount, '; after the open settled:', scope());
+  expect(atUnmount).toBeUndefined();
+  expect(scope()).toBe('drums,030'); // Punk never reached a screen, yet `/` now carries it
+});
+
+test('(xi-d) coming back to /play mounts the sample again: `sample`', async () => {
+  const first = render(<PlayerShell />);
+  await openPunk();
+  first.unmount();
+  render(<PlayerShell />);
+  await waitFor(() => expect(scope()).toBe('sample'));
+});
```

### designA-race-test.diff

```diff
diff --git a/web/app/play/PlayerShell.instruments-race-spike.test.tsx b/web/app/play/PlayerShell.instruments-race-spike.test.tsx
new file mode 100644
index 00000000..c6105440
--- /dev/null
+++ b/web/app/play/PlayerShell.instruments-race-spike.test.tsx
@@ -0,0 +1,273 @@
+// SPIKE (NH-124, F-23 / F-25) — THROWAWAY. Scenario (ix): the late-sample race, through the REAL
+// PlayerShell, NotationSurface (its re-assert guard), TracksPopover and SettingsPopover, with the
+// REAL useAlphaTabEvent — so the four scoreLoaded subscriptions land in the app's real order. Only
+// `useAlphaTab` is replaced: it hands over a fake api whose emitters copy AlphaTab 1.8.4's
+// EventEmitter / EventEmitterOfT (alphaTab.core.mjs:24692-24738) and whose renderScore copies
+// _internalRenderTracks (alphaTab.core.mjs:45836-45848): api.score is set BEFORE scoreLoaded fires,
+// and scoreLoaded fires only when the score actually changed.
+// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next
+import * as engine from '@coderline/alphatab';
+import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
+import { readFileSync } from 'node:fs';
+import path from 'node:path';
+import { beforeEach, expect, test, vi } from 'vitest';
+
+const hoisted = vi.hoisted(() => ({
+  api: null as unknown,
+  loadingCalls: { count: 0 },
+}));
+
+vi.mock('next/navigation', () => ({
+  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
+  usePathname: () => '/play',
+  useSearchParams: () => new URLSearchParams(),
+}));
+
+vi.mock('../../lib/alphatab/AlphaTabEngineContext', () => ({
+  AlphaTabEngineProvider: ({ children }: { readonly children: ReactNode }) => children,
+  useAlphaTabEngine: () => ({ engine, error: null }),
+}));
+
+// The api arrives the way the real hook delivers it: after the first commit, from an effect.
+vi.mock('../../lib/alphatab/useAlphaTab', async (importOriginal) => {
+  const real = await importOriginal<typeof import('../../lib/alphatab/useAlphaTab')>();
+  const React = await import('react');
+  return {
+    ...real,
+    useAlphaTab: () => {
+      const [api, setApi] = React.useState<unknown>();
+      const hostRef = React.useRef<HTMLDivElement | null>(null);
+      React.useEffect(() => {
+        setApi(hoisted.api);
+      }, []);
+      return [api, hostRef];
+    },
+  };
+});
+
+vi.mock('@notation-hero/client', async (importOriginal) => {
+  const real = await importOriginal<typeof import('@notation-hero/client')>();
+  const loading = ((...args: Parameters<typeof real.toast.loading>) => {
+    hoisted.loadingCalls.count += 1;
+    return real.toast.loading(...args);
+  }) as typeof real.toast.loading;
+  const toast = Object.assign(
+    (...args: Parameters<typeof real.toast>) => real.toast(...args),
+    real.toast,
+    { loading },
+  );
+  return { ...real, toast };
+});
+
+import {
+  fakeSentry,
+  instrumentsState,
+  resetMonitoringForTests,
+} from '../../lib/monitoring/report';
+import { PlayerShell } from './PlayerShell';
+
+import type { ReactNode } from 'react';
+
+type Score = InstanceType<typeof engine.model.Score>;
+type Listener = (arg?: unknown) => void;
+
+/** AlphaTab's EventEmitter: no argument; replays on subscribe when fireOnRegister is truthy. */
+class Emitter {
+  listeners: Listener[] = [];
+  constructor(private readonly fireOnRegister?: () => boolean) {}
+  on(listener: Listener) {
+    this.listeners.push(listener);
+    if (this.fireOnRegister?.()) listener();
+    return () => this.off(listener);
+  }
+  off(listener: Listener) {
+    this.listeners = this.listeners.filter((l) => l !== listener);
+  }
+  trigger() {
+    for (const l of this.listeners) l();
+  }
+}
+
+/** AlphaTab's EventEmitterOfT: replays the current value on subscribe unless it is null. */
+class EmitterOfT {
+  listeners: Listener[] = [];
+  constructor(private readonly fireOnRegister?: () => unknown) {}
+  on(listener: Listener) {
+    this.listeners.push(listener);
+    if (this.fireOnRegister) {
+      const arg = this.fireOnRegister();
+      if (arg !== null) listener(arg);
+    }
+    return () => this.off(listener);
+  }
+  off(listener: Listener) {
+    this.listeners = this.listeners.filter((l) => l !== listener);
+  }
+  trigger(arg: unknown) {
+    for (const l of this.listeners) l(arg);
+  }
+}
+
+const SAMPLE = engine.importer.ScoreLoader.loadScoreFromBytes(
+  new Uint8Array(readFileSync(path.join(process.cwd(), 'public/notation/1-beat.gp'))),
+);
+const label = (score: Score | null | undefined): string => {
+  if (!score) return 'none';
+  if (score === SAMPLE) return 'sample';
+  return score.tracks[0]?.name === 'Drumkit' ? 'Punk' : `other(${score.tracks[0]?.name})`;
+};
+
+class FakeApi {
+  score: Score | null = null;
+  tracks: Score['tracks'] = [];
+  settings = {
+    player: { playerMode: engine.PlayerMode.EnabledAutomatic },
+    notation: { transpositionPitches: [] as number[] },
+  };
+  actualPlayerMode = engine.PlayerMode.EnabledSynthesizer;
+  isReadyForPlayback = false;
+  playbackRange = null;
+  isLooping = false;
+  metronomeVolume = 0;
+  countInVolume = 0;
+  masterVolume = 1;
+  playbackSpeed = 1;
+  timePosition = 0;
+  player = null;
+  renderScoreCalls: string[] = [];
+
+  scoreLoaded = new EmitterOfT(() => this.score ?? null);
+  playerReady = new Emitter(() => this.isReadyForPlayback);
+  renderStarted = new Emitter();
+  renderFinished = new Emitter();
+  soundFontLoaded = new Emitter();
+  playerStateChanged = new EmitterOfT();
+  playerPositionChanged = new EmitterOfT();
+  soundFontLoad = new EmitterOfT();
+  error = new EmitterOfT();
+  playbackRangeChanged = new EmitterOfT();
+  beatMouseDown = new EmitterOfT();
+
+  renderScore(score: Score, trackIndexes?: number[]) {
+    this.renderScoreCalls.push(label(score));
+    const tracks =
+      trackIndexes && trackIndexes.length > 0
+        ? trackIndexes.map((index) => score.tracks[index]!)
+        : [score.tracks[0]!];
+    if (score === this.score) {
+      this.tracks = tracks;
+      return;
+    }
+    this.score = score; // set BEFORE the trigger, as _internalRenderTracks does
+    this.tracks = tracks;
+    this.scoreLoaded.trigger(score);
+  }
+
+  /** What AlphaTab's initialRender does when the fetch of settings.core.file finally completes. */
+  sampleArrives() {
+    this.renderScore(SAMPLE);
+  }
+
+  renderTracks() {}
+  pause() {}
+  play() {}
+  playPause() {}
+  render() {}
+  updateSettings() {}
+  highlightPlaybackRange() {}
+  applyPlaybackRangeFromHighlight() {}
+  loadMidiForScore() {}
+  destroy() {}
+}
+
+const FIXTURES = path.join(process.cwd(), 'e2e/fixtures/');
+const fileOf = (name: string) => new File([readFileSync(`${FIXTURES}${name}`)], name);
+const notesTxt = () => new File([new TextEncoder().encode('just some notes')], 'notes.txt');
+
+function pick(file: File): void {
+  const input = screen.getByTestId('open-file-input') as HTMLInputElement;
+  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
+  fireEvent.change(input);
+}
+
+const settled = (count: number) =>
+  waitFor(() => expect(instrumentsState().restoreCount).toBe(count), { timeout: 8000 });
+const inFlight = (count: number) =>
+  waitFor(() => expect(hoisted.loadingCalls.count).toBe(count), { timeout: 4000 });
+const scope = () => instrumentsState().scope;
+const shownFile = () => screen.getByTestId('loaded-notation-name').getAttribute('data-file');
+
+beforeEach(() => {
+  resetMonitoringForTests();
+  hoisted.loadingCalls.count = 0;
+  // jsdom has no FontFaceSet; NotationSurface's font watch needs these two methods once an api exists.
+  Object.defineProperty(document, 'fonts', {
+    configurable: true,
+    value: { addEventListener: () => {}, removeEventListener: () => {} },
+  });
+});
+
+async function mountWithFakeApi(): Promise<FakeApi> {
+  const api = new FakeApi();
+  hoisted.api = api;
+  render(<PlayerShell />);
+  // SettingsPopover, NotationSurface, TracksPopover and the shell itself, in that order.
+  await waitFor(() => expect(api.scoreLoaded.listeners).toHaveLength(4));
+  expect(scope()).toBe('sample');
+  return api;
+}
+
+test('(ix-a) the sample arriving AFTER the visitor swapped leaves the visitor tag', async () => {
+  const api = await mountWithFakeApi();
+  pick(fileOf('Punk.gp'));
+  await settled(1);
+  await waitFor(() => expect(label(api.score)).toBe('Punk'));
+  expect(scope()).toBe('drums,030');
+
+  // A listener that subscribed after NotationSurface's, as the shell's own handler did.
+  const seen: string[] = [];
+  api.scoreLoaded.on((arg) => seen.push(`arg=${label(arg as Score)} api.score=${label(api.score)}`));
+  seen.length = 0; // drop the replay-on-subscribe
+  const logBefore = fakeSentry.log.length;
+
+  act(() => api.sampleArrives());
+
+  // Harness proof that the race really happened: NotationSurface re-drew Punk from INSIDE the
+  // sample's own scoreLoaded, so a late listener sees Punk first and the sample's event last.
+  expect(api.renderScoreCalls).toEqual(['Punk', 'sample', 'Punk']);
+  expect(seen).toEqual(['arg=Punk api.score=Punk', 'arg=sample api.score=Punk']);
+  expect(label(api.score)).toBe('Punk');
+  expect(shownFile()).toBe('Punk.gp');
+
+  // Design A: nothing listens, so nothing changed.
+  expect(fakeSentry.log.slice(logBefore)).toEqual([]);
+  expect(scope()).toBe('drums,030');
+});
+
+test('(ix-b) the sample arriving DURING the visitor open keeps the tag off, then `drums,030`', async () => {
+  const api = await mountWithFakeApi();
+  pick(fileOf('Punk.gp'));
+  await inFlight(1); // suspended, not yet swapped
+  expect(scope()).toBeUndefined();
+
+  act(() => api.sampleArrives());
+  expect(api.renderScoreCalls).toEqual(['sample']); // nothing of the visitor's to re-assert yet
+  expect(scope()).toBeUndefined();
+
+  await settled(1);
+  await waitFor(() => expect(label(api.score)).toBe('Punk'));
+  expect(api.renderScoreCalls).toEqual(['sample', 'Punk']);
+  expect(scope()).toBe('drums,030');
+});
+
+test('(ix-c) the sample arriving DURING an open that then fails (E103): no tag, then `sample`', async () => {
+  const api = await mountWithFakeApi();
+  pick(notesTxt());
+  await inFlight(1);
+  act(() => api.sampleArrives());
+  expect(scope()).toBeUndefined();
+  await settled(1);
+  expect(fakeSentry.reports.map((r) => [r.code, r.tags])).toEqual([['E103', { code: 'E103' }]]);
+  expect(label(api.score)).toBe('sample');
+  expect(scope()).toBe('sample');
+});
```

## Test output excerpts

### Final run — both spike files (29/29)

```text
 ✓ (i) /play mounts with only the sample: the tag is `sample` 63ms
 ✓ (ii) a guitar-only file gives `025` 653ms
 ✓ (ix-a) the sample arriving AFTER the visitor swapped leaves the visitor tag 714ms
 ✓ (iii) Punk.gp (percussion + program 30) gives `drums,030` 628ms
 ✓ (ix-b) the sample arriving DURING the visitor open keeps the tag off, then `drums,030` 635ms
 ✓ (ix-c) the sample arriving DURING an open that then fails (E103): no tag, then `sample` 615ms
 ✓ (iii-b) a visitor opening the SAME bytes as the sample gets `drums`, not `sample` 634ms
 ✓ (vi-b) E205 — the engine never loaded: the open ends without a swap; back to `sample` 67ms
 ✓ (iii-drop) the same file DROPPED also gives `drums,030` 637ms
 ✓ (iv) Punk open, pick notes.txt: the E103 report has no tag; afterwards `drums,030` 1197ms
 ✓ (iv-drop) the same through a DROP 1222ms
 ✓ (v) only the sample open, pick notes.txt: the E103 report has no tag; afterwards `sample` 628ms
 ✓ (v-E101/E102) read failures with only the sample open: no tag; afterwards `sample` 79ms
 ✓ (vi) Cancel on "Replace …?": no report; the tag is back to `drums,030` 668ms
[spike vii counted] E105 tags {"code":"E105"}
 ✓ (vii) E105 AFTER the swap ends on the NEW value [counted] 1228ms
[spike vii plain] E105 tags {"instruments":"025","code":"E105"}
 ✓ (vii) E105 AFTER the swap ends on the NEW value [plain] 1229ms
 ✓ (viii) E105 BEFORE the swap: the report has no tag; afterwards `drums,030` 1228ms
[spike x-a counted] tag between the dropped pick and the first swap: undefined
 ✓ (x-a) a dropped second pick while the first succeeds [counted] 642ms
[spike x-b counted] E103 tags {"code":"E103"}
 ✓ (x-b) a dropped second pick while the first FAILS (E103) [counted] 1214ms
[spike x-c counted] E101 then E103 tags [{"code":"E101"},{"code":"E103"}]
 ✓ (x-c) an overlapping second pick that fails to READ (E101) [counted] 1215ms
[spike x-d counted] tag between the opens: undefined; E103 tags {"code":"E103"}
 ✓ (x-d) a second pick whose READ outlasts the first open [counted] 3230ms
[spike x-a plain] tag between the dropped pick and the first swap: sample
 ✓ (x-a) a dropped second pick while the first succeeds [plain] 629ms
[spike x-b plain] E103 tags {"instruments":"drums,030","code":"E103"}
 ✓ (x-b) a dropped second pick while the first FAILS (E103) [plain] 1206ms
[spike x-c plain] E101 then E103 tags [{"code":"E101"},{"instruments":"drums,030","code":"E103"}]
 ✓ (x-c) an overlapping second pick that fails to READ (E101) [plain] 1208ms
[spike x-d plain] tag between the opens: 025; E103 tags {"instruments":"025","code":"E103"}
 ✓ (x-d) a second pick whose READ outlasts the first open [plain] 3212ms
 ✓ (xi-a) leaving /play with only the sample: `sample` lingers after unmount 16ms
 ✓ (xi-b) leaving /play with Punk open: `drums,030` lingers after unmount 630ms
[spike xi-c] tag at unmount: undefined ; after the open settled: drums,030
 ✓ (xi-c) leaving /play MID-open: the abandoned open still sets the tag after unmount 633ms
 ✓ (xi-d) coming back to /play mounts the sample again: `sample` 649ms
 Test Files  2 passed (2)
      Tests  29 passed (29)
```

### Whole web/ suite with the patch (before iii-b and vi-b were added)

```text
 Test Files  16 passed (16)
      Tests  146 passed (146)
```

### Mutation m1

```text
 ✓ (i) /play mounts with only the sample: the tag is `sample` 56ms
 × (ii) a guitar-only file gives `025` 639ms
 × (iii) Punk.gp (percussion + program 30) gives `drums,030` 630ms
 × (iii-drop) the same file DROPPED also gives `drums,030` 599ms
 × (iv) Punk open, pick notes.txt: the E103 report has no tag; afterwards `drums,030` 611ms
 × (iv-drop) the same through a DROP 597ms
 ✓ (v) only the sample open, pick notes.txt: the E103 report has no tag; afterwards `sample` 597ms
 ✓ (v-E101/E102) read failures with only the sample open: no tag; afterwards `sample` 73ms
 × (vi) Cancel on "Replace …?": no report; the tag is back to `drums,030` 590ms
 × (vii) E105 AFTER the swap ends on the NEW value [counted] 607ms
 × (vii) E105 AFTER the swap ends on the NEW value [plain] 608ms
 × (viii) E105 BEFORE the swap: the report has no tag; afterwards `drums,030` 594ms
 × (x-a) a dropped second pick while the first succeeds [counted] 620ms
 × (x-b) a dropped second pick while the first FAILS (E103) [counted] 593ms
 × (x-c) an overlapping second pick that fails to READ (E101) [counted] 593ms
 × (x-d) a second pick whose READ outlasts the first open [counted] 591ms
 × (x-a) a dropped second pick while the first succeeds [plain] 609ms
 × (x-b) a dropped second pick while the first FAILS (E103) [plain] 596ms
 × (x-c) an overlapping second pick that fails to READ (E101) [plain] 597ms
 × (x-d) a second pick whose READ outlasts the first open [plain] 587ms
 ✓ (xi-a) leaving /play with only the sample: `sample` lingers after unmount 12ms
 × (xi-b) leaving /play with Punk open: `drums,030` lingers after unmount 602ms
 × (xi-c) leaving /play MID-open: the abandoned open still sets the tag after unmount 577ms
 × (xi-d) coming back to /play mounts the sample again: `sample` 616ms
⎯⎯⎯⎯⎯⎯ Failed Tests 20 ⎯⎯⎯⎯⎯⎯⎯
      Tests  20 failed | 4 passed (24)
```

### Mutation m2

```text
 ✓ (i) /play mounts with only the sample: the tag is `sample` 56ms
 ✓ (ii) a guitar-only file gives `025` 648ms
 ✓ (iii) Punk.gp (percussion + program 30) gives `drums,030` 638ms
 ✓ (iii-drop) the same file DROPPED also gives `drums,030` 643ms
 × (iv) Punk open, pick notes.txt: the E103 report has no tag; afterwards `drums,030` 1205ms
 ✓ (iv-drop) the same through a DROP 1214ms
 × (v) only the sample open, pick notes.txt: the E103 report has no tag; afterwards `sample` 617ms
 × (v-E101/E102) read failures with only the sample open: no tag; afterwards `sample` 78ms
 × (vi) Cancel on "Replace …?": no report; the tag is back to `drums,030` 665ms
 × (vii) E105 AFTER the swap ends on the NEW value [counted] 1221ms
 ✓ (vii) E105 AFTER the swap ends on the NEW value [plain] 1232ms
 × (viii) E105 BEFORE the swap: the report has no tag; afterwards `drums,030` 1236ms
 × (x-a) a dropped second pick while the first succeeds [counted] 82ms
 × (x-b) a dropped second pick while the first FAILS (E103) [counted] 615ms
 × (x-c) an overlapping second pick that fails to READ (E101) [counted] 672ms
 × (x-d) a second pick whose READ outlasts the first open [counted] 1192ms
 × (x-a) a dropped second pick while the first succeeds [plain] 76ms
 × (x-b) a dropped second pick while the first FAILS (E103) [plain] 611ms
 × (x-c) an overlapping second pick that fails to READ (E101) [plain] 671ms
 × (x-d) a second pick whose READ outlasts the first open [plain] 1184ms
 ✓ (xi-a) leaving /play with only the sample: `sample` lingers after unmount 15ms
 ✓ (xi-b) leaving /play with Punk open: `drums,030` lingers after unmount 625ms
 × (xi-c) leaving /play MID-open: the abandoned open still sets the tag after unmount 635ms
 ✓ (xi-d) coming back to /play mounts the sample again: `sample` 639ms
⎯⎯⎯⎯⎯⎯ Failed Tests 15 ⎯⎯⎯⎯⎯⎯⎯
      Tests  15 failed | 9 passed (24)
```

### Mutation m3

```text
 ✓ (i) /play mounts with only the sample: the tag is `sample` 57ms
 × (ii) a guitar-only file gives `025` 650ms
 × (iii) Punk.gp (percussion + program 30) gives `drums,030` 642ms
 × (iii-drop) the same file DROPPED also gives `drums,030` 616ms
 × (iv) Punk open, pick notes.txt: the E103 report has no tag; afterwards `drums,030` 629ms
 × (iv-drop) the same through a DROP 614ms
 ✓ (v) only the sample open, pick notes.txt: the E103 report has no tag; afterwards `sample` 619ms
 ✓ (v-E101/E102) read failures with only the sample open: no tag; afterwards `sample` 78ms
 × (vi) Cancel on "Replace …?": no report; the tag is back to `drums,030` 613ms
 × (vii) E105 AFTER the swap ends on the NEW value [counted] 625ms
 × (vii) E105 AFTER the swap ends on the NEW value [plain] 616ms
 × (viii) E105 BEFORE the swap: the report has no tag; afterwards `drums,030` 618ms
 × (x-a) a dropped second pick while the first succeeds [counted] 630ms
 × (x-b) a dropped second pick while the first FAILS (E103) [counted] 612ms
 × (x-c) an overlapping second pick that fails to READ (E101) [counted] 601ms
 × (x-d) a second pick whose READ outlasts the first open [counted] 609ms
 × (x-a) a dropped second pick while the first succeeds [plain] 629ms
 × (x-b) a dropped second pick while the first FAILS (E103) [plain] 608ms
 × (x-c) an overlapping second pick that fails to READ (E101) [plain] 609ms
 × (x-d) a second pick whose READ outlasts the first open [plain] 609ms
 ✓ (xi-a) leaving /play with only the sample: `sample` lingers after unmount 12ms
 × (xi-b) leaving /play with Punk open: `drums,030` lingers after unmount 632ms
 × (xi-c) leaving /play MID-open: the abandoned open still sets the tag after unmount 589ms
 × (xi-d) coming back to /play mounts the sample again: `sample` 634ms
⎯⎯⎯⎯⎯⎯ Failed Tests 20 ⎯⎯⎯⎯⎯⎯⎯
      Tests  20 failed | 4 passed (24)
```

### Mutation m3 — first failure

```text
AssertionError: expected 'sample' to be 'drums,030' // Object.is equality

Expected: "drums,030"
Received: "sample"

 ❯ openPunk app/play/PlayerShell.instruments-spike.test.tsx:125:19
    123|   await settled(1);
```

### Mutation m4 (race file)

```text
 × (ix-a) the sample arriving AFTER the visitor swapped leaves the visitor tag 709ms
 ✓ (ix-b) the sample arriving DURING the visitor open keeps the tag off, then `drums,030` 649ms
 × (ix-c) the sample arriving DURING an open that then fails (E103): no tag, then `sample` 628ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
      Tests  2 failed | 1 passed (3)
- []
+ [
+   "tag drums,030",
+   "scope=drums,030",
+   "tag drums",
+   "scope=drums",
+ ]

 ❯ app/play/PlayerShell.instruments-race-spike.test.tsx:243:43
 × app/play/PlayerShell.instruments-race-spike.test.tsx > (ix-c) the sample arriving DURING an open that then fails (E103): no tag, then `sample` 628ms
   → expected 'drums' to be 'sample' // Object.is equality

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

```
