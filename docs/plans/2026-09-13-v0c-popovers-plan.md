---
# spec-triage-loop state. `lap` is the review lap this document has been through;
# `last_applied` is the highest severity applied on that lap.
lap: 2
last_applied: P1
---

# v0 Plan C — Settings and Tracks Popovers — Implementation Plan

> **⛔ RE-TRIAGED 2026-09-20 against Plan A as merged (PR #159) and Plan B as built (PR #162).** This
> plan was written on 2026-09-13, before either was implemented, and it has not been through a review
> lap yet. Both builds changed what Tasks 4-8 stand on, and the code plus the three 2026-09-18 → 09-20
> entries in [`docs/decisions/decision-registry.md`](../decisions/decision-registry.md) win over any
> older wording. What was corrected here, so a reviewer does not spend a lap on it:
>
> - **The api is React state, not a ref.** `useAlphaTab` returns `[api, hostRef]`; there is no
>   `apiRef` and no `onScoreLoaded` callback. Every subscription goes through `useAlphaTabEvent`.
> - **`/play` always has a score open** (spec D8), so the `load-sample` button the e2e cases clicked
>   never existed. They start on the bundled beat, or open a fixture with `openFirstScore`.
> - **`web/` has Vitest now** (`web/lib/alphatab/drum-tracks.test.ts`), so the `.mjs` files tested
>   through the `tooling` lane are gone: the helpers are `.ts` with a co-located `.test.ts`.
> - **Writes to engine objects live in `web/lib/alphatab/`, never in a component.** React's compiler
>   lint rejects them there. That module is also the `updateSettings()` funnel the fork-parity triage
>   deferred to its first caller (finding F-C3, NH-302) — this plan is that caller.
> - **The speed range is the engine's own 12.5-800 %**, not the spec's 12.5-200 %.
> - **A file that plays its own recording disables the mixer** — solo, mute, volume and, verified in
>   1.8.4's source, Transpose audio too. The plan had no such state at all.
> - **Solo and mute are coupled per MIDI channel, exactly as volume is** — verified in 1.8.4's source.
>   The non-exclusive-solo e2e case soloed two tracks on the SAME channel and proved nothing.
> - **The Export group is two action rows** (Export MIDI, Export Guitar Pro — v0.1 spec §4), and the
>   fork's Player group has **five** rows that are `AlphaTabApi` properties, not one. The schema gains a
>   `source` so both kinds are real rows that v0.1's search can index.
> - **Base UI 1.6's accordion prop is `multiple`**, not `openMultiple` — verified against the
>   installed types.
> - **The 44 px checks are automated** (`expectHitAreas`, from Plan A), and `Input`, `NativeSelect`
>   and `Checkbox` are all under 44 px as built, so the rows pad them.
>
> **Decided by the maintainer on 2026-09-20, after this re-triage: the Settings popover is the same
> as the fork — every row, no exceptions.** His words: _"we should be able to change every single
> setting from alphatab, including enable synth or backing track. 100% do this now. I use this all
> the time!"_ So all five api-property rows ship, and so does the **player-mode row** — which
> supersedes the spec's "a toggle between the recording and the synthesizer is out of v0" (§4) and
> gets its own task (Task 8). He then asked whether the plan really had every fork row. It did not:
> it carried row COUNTS, and a full inventory by setting key (Task 4 Step 1) found that the
> **Stylesheet group is not settings at all** (it lives on the score model, and `fillFromJson`
> ignores it), that **fourteen Player rows only take effect after the MIDI is regenerated**, that
> **`display.padding` is an array** the dot-path helpers could not address, that one count was
> wrong (Display ▸ General is 9, not 8), and that **two fork rows are bound to the wrong key**.

> **🧑 HUMAN GATES.** Two checks in this plan need a person: the mix **by ear**, and a walk through
> every settings group **by eye**. They are collected in Task 10 and handed back **once, at the end** —
> the maintainer's choice for Plan B (registry, 2026-09-20), carried over. An agentic worker never
> self-certifies them and never ticks the success-criteria box they back: this repo's `pr-checklist`
> gate checks that a box is ticked, not that the claim is true.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player its two popovers — Settings (the header gear: eight accordion sections holding **every** row of the reference panel — 90 of them, the switch between a file's own recording and the synthesizer included — which change the rendered score and the sound, and survive a reload) and Tracks (the transport's mixer: one row per track in the score, with solo, mute, volume, render-select, the per-staff display toggles and both transposition sliders).

**Architecture:** Two new presentation-only components in `client/` (`Accordion` and `SettingRow`) plus a `TrackRow`, each gated by a Storybook story with VR and axe baselines. `web/` owns the schema of groups with an accessor per row, one module that holds every write to the live engine's settings, and both popover compositions. Neither popover blocks the player: a drummer can change a setting while the score plays — with one measured exception, the fourteen sound-rebuilding rows (Global Constraints).

**Tech Stack:** `@base-ui/react` 1.6 (`accordion`, `popover`, `slider`), Tailwind 4 tokens, Storybook 10, Playwright 1.61.1 + axe.

**Spec:** [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) — §7 from "Two popovers, not modals" to the end is this plan's brief.

**Reference (read-only):** the `rhythm-game` fork at `/Users/leocaseiro/Sites/alphaTabWebsite`, branch `rhythm-game` — `src/components/AlphaTabRhythmGame/playground-settings.tsx` (1,279 lines) is the settings panel this ports. **Clean-room: read it, copy nothing.** No files, no code blocks, no label strings. Write original code and original label copy. That is decision D4 and the [2026-06-18 licensing spike](../spikes/2026-06-18-file-formats-and-licensing.md); the fork is MPL-2.0 and stays open for reference only.

**Depends on:** [Plan A](2026-09-13-v0a-engine-and-first-sound-plan.md), merged as PR #159 — the engine context, `/play`, `useAlphaTab` / `useAlphaTabEvent`, `setAlphaTabDefaults`, and the Playwright lane with its `expectNoViolations` helper and its `expectHitAreas` hit-area gate (the latter already widened by **Plan B** to cover a Base UI slider's `Control`) — note both are **module-local, unexported** functions inside `web/e2e/a11y.e2e.ts`, so `player.e2e.ts` cannot import them and every axe or hit-area assertion belongs in that file — and [Plan B](2026-09-13-v0b-transport-plan.md), PR #162 — `Slider` (with `onCommit`), `TransportToggle`, the transport row's free `trailing` slot, the header's empty right column, and `PlayerShell`'s `applySpeed` and `hasBackingTrack`. **Branch from `master` only after PR #162 has merged**: Tasks 2, 3, 5 and 7 import what it adds.

**Jira:** epic [NH-291](https://leocaseiro.atlassian.net/browse/NH-291).

**Closes success criteria:** 3 (per-track mute/solo half) and 7 (the Settings rows change the rendered score; the Tracks popover lists every track and its rows work in both directions).

---

## Global Constraints

Every task's requirements implicitly include this section, plus **all of Plan A's and Plan B's Global Constraints**, which still bind.

- **The api is React state, never a ref.** `PlayerShell`'s `Player` owns it — `const [api, hostRef] = useAlphaTab(settingsInit)` — and passes it **down as a prop**, typed `AlphaTabApi | undefined`. There is no `apiRef`, no `onApiReady`, no `onScoreLoaded`. Because `api` is state, it **must** be in every `useCallback` dependency list: an empty list freezes the callback on the `undefined` it held before the engine arrived, and the control then flips its own React state while the engine never hears about it.
- **Every subscription goes through `useAlphaTabEvent(api, 'eventName', handler)`.** No `.on()` by hand. Both popovers mount and unmount while the api stays alive, which is exactly the case that helper exists for.
- **Every edit pushes the WHOLE settings document, not just the key that changed — and that is measured, not inherited.** `applySettingsJson` hands the entire `PlayerSettingsJson` to `fillFromJson` on every row change (Task 4 Step 7). The alternative was available and is **rejected**: the deserializer walks only the keys present in the object it is given, so `fillFromJson({ display: { scale: 1.2 } })` would set that one leaf and touch nothing else. It buys no speed. `api.updateSettings()` does the same fixed work whatever it is handed — backwards-compatibility, the pitch offsets (a loop over TRACKS, not over settings), one assignment into the renderer, and a player rebuild that early-returns unless `player.playerMode` itself changed (`AlphaTabApiBase.ts:549-563` and `:1670-1708`) — and it never redraws. Writing 71 leaves instead of one is microseconds. Meanwhile the same funnel restores the stored document at boot, where the whole document has to go in anyway, so a per-key push would mean two shapes over one engine call. **The cost that IS real is `api.render()`, and every redraw this plan asks for goes through `queueRender` — one per frame, however many reports arrive inside it.** The three guards that exist because of the whole-document push — the engine-sourced defaults test (Task 4), `dropUnknownOptions` (Task 6), and the rule that the four shell-set keys' shipped defaults equal what the shell sets — are its correctness price, and each protects the boot path as well. Read them as that price, not as three unrelated hazards.
- **Every write to an engine object lives in `web/lib/alphatab/`, never in a component or a hook body.** The api reaches components through `useState`, so React's compiler lint (`react-hooks/immutability`, an error under `eslint . --max-warnings 0` in **both `web/` and `client/`** — it arrives from `eslint-plugin-react-hooks` 7.1.1 and is named in neither `eslint.config.base.mjs` nor the package configs, so `eslint --print-config` is the only way to see it) rejects `api.settings.notation.transpositionPitches = …` or `staff.showSlash = …` inside one. Plan B's `setAlphaTabValue` — exported from `web/lib/alphatab/useAlphaTab.ts`, where the only property assignment to an engine object in the app lives — is the precedent; Task 4 adds `live-settings.ts` as a sibling module in the same directory. That module is also the **one `updateSettings()` funnel** — mutate, push, redraw when asked — that the fork-parity triage deferred to its first caller (finding F-C3, tracked in NH-302). Nothing else in the app calls `api.updateSettings()`.
- **Never run an engine side effect inside a `setState` updater.** React may invoke an updater twice (it does in Strict Mode), which would push the settings and redraw the score twice. Compute the next value, call `setState(next)`, then call the engine.
- **Never call `setState` synchronously inside a `useEffect`.** `react-hooks/set-state-in-effect` is an error in `web/`. The stored settings are read in a lazy `useState` initialiser instead (Task 6).
- **Test the engine, not only the app.** A `data-*` attribute or an `aria-pressed` mirrors React state and flips even when the write never reached AlphaTab. Every e2e case that claims an engine change reads the engine through the debug handle `useAlphaTab` parks on the host element (`document.querySelector('[data-testid="notation-surface"] > div').at`), as Plan B's toggle case does.
- **Code comments name the thing, never a plan-local number.** "(Task 4)" or "Plan B's Global Constraints" means nothing to a reader outside this document (registry, 2026-09-18). Prose, steps and tables keep their numbers; the code blocks below do not carry them.
- **Clean-room port.** Read the fork to learn the group list, the row set and the accessor pattern; write everything yourself. No copied code, no copied label strings. If you cannot restate a row's purpose in your own words, you do not understand it well enough to port it.
- **Both popovers, never modals.** Neither blocks the player — that is the single reason v0 chose a popover, and v0.1 keeps it. `Dialog` is not built and is not needed.
- **The non-blocking promise holds on the `render` and `settings` paths. The fourteen `midi` rows are the measured exception.** `api.loadMidiForScore()` calls `AlphaSynth.loadMidiFile()`, whose first act is `stop()` (`alphaTab.core.mjs:40054-40055`) — and `stop()` does not pause in place: it stops the sequencer, sends note-off to every channel, and sets `tickPosition` back to the **start of the song, or of the loop** (`:39987-39995`). Measured on a headless synth with a stub output: `play()` → Playing at tick 1921; one more `loadMidiFile` → **Paused at tick 1**. So changing a vibrato, slide, song-book or triplet-feel row **stops the music and rewinds it** — not something to do mid-take. Say so on those rows; do not widen the promise to cover them.
- **Every `client/` component here is presentation-only**: `value` in, `onChange` out, option lists as plain arrays, and **no import from `@coderline/alphatab`**. A `client/` Storybook story has no engine instance, so a row that read its options off the library would be gated while rendering fabricated options. The schema of accessors and the context carrying the namespace live in `web/`.
- **Each new `client/` component needs all six co-located files** (`X.tsx`, `X.stories.tsx`, `X.story-ids.ts`, `X.test.tsx`, `X.a11y.ts`, `X.vr.ts`) in its own folder. Never `__tests__/` or `stories/`.
- **VR baselines are Linux-only** — `pnpm test:vr:docker:update` with Docker Desktop running (`open -a Docker`), never natively on macOS. Kill any `:6006` Storybook first.
- **Every control's hit area is at least 44 px, and the lane measures it.** Plan A's `expectHitAreas` (`web/e2e/a11y.e2e.ts`) runs with each popover open (Task 9); nothing is checked by eye. Three primitives these rows compose are **under** 44 px as built — `Input` and `NativeSelect` are `h-9` (36 px), `Checkbox` is `size-4` (16 px) — **and so is every `Button` size**: `default` and `icon` are 36 px and even `icon-lg` is only 40 px (`Button.tsx:37-47`). So `SettingRow` passes `h-11` to the first two and puts its checkbox inside a label that is at least 44 × 44; `TrackRow` reaches every toggle through `TransportToggle` at `size-11`, and `MasterRow` puts its two select-all checkboxes inside 44 × 44 labels the same way `SettingRow` does; and every `Button` gets an explicit `size-11` / `min-h-11 min-w-11`, as `PlayerShell` already does.
- **Every control with no visible text has a tooltip that tells its state, always present** (registry, 2026-09-20 — and the maintainer again on this plan: _"make sure every button toggle has tooltip, including the tracks ones, such as solo/mute/etc"_). That is: the Settings gear, the Tracks trigger, and in **every** `TrackRow` the render-select eye toggle, Solo, Mute, **the four per-staff display toggles** and the "more controls" button. The display toggles are on that list because they are now compact icon buttons on the primary row (M-7): icon-only, so nothing tells their state but the tooltip. A control that already shows its own words — an accordion header, a settings row, the two export buttons — needs none. The tooltip says the **state**, not just the name: `Solo: on`, not `Solo`.

  **Two qualifications, both from verification.**

  - **A tooltip is invisible to a screen reader, so the state must ALSO ride on an announced attribute.** Base UI 1.6.0's `Tooltip` sets **no `aria-describedby`** — there is no `useRole` anywhere in `@base-ui/react/tooltip/`, and the rendered attribute is `null` both plain and nested. So `Solo: on` is announced as just "Solo, button". Solo, Mute, the render-select eye toggle and each per-staff display toggle carry `aria-pressed` (all five are toggle BUTTONS now, not checkboxes, so `aria-pressed` is the announced attribute — not `aria-checked`), and the "more controls" button carries `aria-expanded`; those are what a screen reader actually hears, and the unit case in Task 3 asserts them alongside the tooltip text. Axe cannot catch this, which is why it is written down.
  - **The two popover triggers are exempt from the STATE half, not from the tooltip.** Their only state is open or closed, and `aria-expanded` already announces it, so `Settings` and `Tracks` are the right tooltip text — repeating the open state in words would be two more strings to keep in sync with nothing to gain. Every other control in the list still says its state. Never render it conditionally: swapping the wrapped and the bare element remounts the button and drops its focus. **It is enforced, not trusted**: a unit case in `TrackRow` (Task 3) and an e2e case over the open mixer (Task 7) read every one of them.

- **A disabled control is `aria-disabled`, never natively disabled** — the design system's `Button` (NH-304) and `TransportToggle` already do this. A natively disabled button takes no focus and no hover, so the tooltip saying _why_ it is unavailable could never open. Tests assert `aria-disabled="true"`, not `toBeDisabled()`.
- **A file that plays its own recording disables the mixer** (spec §4 and §7). `PlayerShell` already holds `hasBackingTrack`; Task 8 changes where it comes from (AlphaTab's `actualPlayerMode`, because the player-mode row lets the synthesizer play such a file). While it is true, every row's **solo, mute, volume and Transpose audio** render disabled with a tooltip saying the file is playing its own recording. Transpose audio is not in the spec's list; it is here because 1.8.4's `BackingTrackAudioSynthesizer` stubs **six** methods to no-ops (`alphaTab.core.mjs:40427-40432`) — `applyTranspositionPitches`, `setChannelTranspositionPitch`, `channelSetMute`, `channelSetSolo`, `channelSetMixVolume` and `resetChannelStates` itself. `masterVolume` is **not** stubbed (`:40395`, forwarded by `BackingTrackPlayer.updateMasterVolume` at `:40458`), so it keeps working in this mode; and count-in is silent but **not inert** — `play()` still issues a real `seekTo` through `updateTimePosition(0, true)` (`:39955-39958`), which is the stronger reason to disable it, and the spec's rule is that a control must never look live and do nothing. Render-select, the display toggles and Transpose full stay enabled: they change the drawn score, which still works.
- **Solo is not exclusive**, as in AlphaTab and the fork. Soloing a second track does not un-solo the first.
- **Volume is an ABSOLUTE channel level on AlphaTab's own scale — `next / 16`, NOT a ratio against the file's level.** _Spec Delta: this supersedes §7's `changeTrackVolume([track], next / track.playbackInfo.volume)`, which the spec inherited from the reference panel._ Measured in a browser: `changeTrackVolume([track], 0.25)` produces `setChannelVolume(9, 0.25)` verbatim, and there is no scaling anywhere downstream (`alphaTab.core.mjs:46789-46794` → `:40085-40088`). AlphaTab's own resting level for a channel is `track.playbackInfo.volume / 16` (`:45590`), so the ratio form sends `1.0` where the engine sits at `0.75` for a track the file records at 12 — about **33 % hot before the person touches the slider**, and it would fight AlphaTab's own re-assert on every MIDI reload. The row's `next` is still on `playbackInfo.volume`'s **0–16** scale; the writer divides by the constant **16**. No zero-denominator guard is needed — the denominator is a constant. `changeTrackVolume` never writes `playbackInfo.volume`, so the file's level stays available as the row's starting value.
- **Accepted coupling — volume, solo AND mute:** `changeTrackVolume`, `changeTrackSolo` and `changeTrackMute` each act on the track's primary **and secondary** MIDI **channel**, not on the track (`alphaTab.core.mjs:46789-46871`), so tracks sharing a channel move together. `Punk.gp`'s two drum tracks are both on channel 9: muting Drumkit silences Drumkit Left as well, soloing one solos both, and their volume sliders are **not** independent — while each row's own button still shows only what was clicked on it. That is expected v0 behaviour — do not "fix" it, and do not write a test that asserts independence. A test that needs two independent tracks uses Drumkit (row 0) and Distortion Guitar (row 1). **The same collision makes `Punk.gp` useless for a transposition test**: both drum tracks map to channel 9, so the second track's 0 overwrites the first track's offset in the generated MIDI and a leak assertion on that fixture **passes while the bug is present** (measured). Assert on `staff.transpositionPitch`, or use a single-track fixture.
- **None of `changeTrackSolo` / `changeTrackMute` / `changeTrackVolume` writes anything readable on the main thread** — the state lives in the synth worker. So the mixer's React state is the only record of what is soloed or muted, it is rebuilt from the score on every `scoreLoaded`, and an e2e case proves a click reached the engine by wrapping the api method through the debug handle and recording its arguments (Task 7).
- **A new score must start with a clean mix, and AlphaTab does not do that by itself.** The synth keeps its muted and soloed **channels** — and each channel's mix **volume** — until someone acts. `resetChannelStates()` clears mute, solo and the live transposition pitches **only; it does not clear volume** (`alphaTab.core.mjs:38911-38917`, and `mixVolume` is initialised once per channel at `:39222`). Nothing inside 1.8.4 calls the reset on a score change: the identifier has **six** sites — `alphaTab.core.mjs:33711`, `38911`, `40079`, `40431` (a `BackingTrackAudioSynthesizer` no-op stub), `45179`, `50000` (worker-side dispatch) — and none is reached from a score-load path. Drums are channel 9 in every General MIDI file, so without a reset a drummer who muted the drums in one score opens the next one to silent drums beside a row that reads un-muted. `settings.notation.transpositionPitches` has the same shape of problem: it is indexed by track and lives on the api, so a Transpose full of +2 on track 1 would carry into the next score's track 1. Two separate fixes, each **measured in a real browser**, not reasoned about:

  - **The engine reset belongs on `playerReady`, never on `scoreLoaded`.** `_onScoreLoaded` fires the event and only THEN builds the player (`alphaTab.core.mjs:48025-48030`), so on the first score `api.player` is **`null`** and `api.player?.resetChannelStates()` silently does nothing — measured on the app's own api across three page loads, counting calls that actually reached the synth wrapper: **zero**. The same hole reopens on every player swap, which a file with an embedded recording causes on purpose. `playerReady` fires only once the player exists, it re-fires on every swap and every MIDI (re)load with no latch (`:33796-33798`), and its emitter lives on the wrapper (`:48313-48315`) so one subscription survives every swap.
  - **The same handler must re-assert volume, mute, solo AND audio transposition.** AlphaTab re-seeds every DRAWN track's channel volume to `playbackInfo.volume / 16` on each `playerReady` (`:45587-45594`) and restores **none** of the other three — measured after a swap: no mute, solo or transposition calls at all. Without the re-assert a MIDI reload puts a track the person turned down back to **101 % of the default level** (measured by ear through the AudioContext: asked 0.05, got 1.01× baseline; with the re-assert, 0.071×). Ordering is verified, not assumed: AlphaTab registers its listener at construction, so its loop runs first and ours lands last.
  - **The transposition pitches are cleared BEFORE the new score reaches the engine**, in the open-file path ahead of `renderScore` — never after. `applyPitchOffsets` runs at the TOP of `_internalRenderTracks` (`:45837`), so by the time `scoreLoaded` fires the stale pitches are already stamped onto the new score's staves; and clearing to `[]` afterwards un-stamps nothing, because the write is guarded by `i < transpositionPitches.length`. Reproduced end to end: a real `MidiFileGenerator.generate()` emitted `ch0=2 ch1=2` for the following score, and a fret-3 note drew as fret 5. Clearing first means the new score is never stamped, and a file's **own** transposition (GP files carry one, `:17154`) survives — which both after-the-fact scrubs would silently flatten.

  _Every claim in this bullet was measured, not read._

- **The tablature toggle appears only for a stringed staff that has a tuning.** The pinned 1.8.4 cannot render percussion tablature at all: `Staff.finish()` forces `showTablature = false` on any percussion staff, and `TabBarRendererFactory` sets `hideOnPercussionTrack = true` and requires `staff.tuning.length > 0`. `Punk.gp` confirms it — its two drum staves report `showTablature=false, tuningLen=0` while its guitar staff reports `true, 6`. Piano and vocal staves carry no tuning either, so they are ruled out too.
- **Transpose Audio and Transpose Full are two separate controls and must stay separate.** Fusing them drops the notation-transposing path entirely.
- **`Settings` has `fillFromJson` but no INSTANCE `toJson`.** There is no way to ask a live `Settings` for _itself_ as JSON, so the app holds its own `SettingsJson`-shaped object as the edit state and pushes it into the live settings. That object is both the UI state and the persisted value. **There IS a serializer, and Task 4 uses it:** `alphaTab.model.JsonConverter.settingsToJsObject(new Settings())` returns the whole tree — 1817 leaves, ~31 KB, measured against the installed 1.8.4. It is not the edit state (it reports every leaf, not the 90 rows), but it is how the shipped defaults are checked. Two traps: the converter lives under **`model`**, not the `json` namespace, which is **empty at runtime**; and colours come back as packed signed integers (`-16777216`), not `#000000` strings, so a colour assertion reads `settings.display.resources.<key>.rgba` instead.
- **Restore through `Settings.fillFromJson(parsed)`, never by assignment.** `JSON.parse` returns plain objects, but `RenderingResources` holds real `model.Color` and `model.Font` instances — a plain object assigned into the settings tree breaks rendering **without throwing**, so a `try`/`catch` would never fire and the Colors and Fonts groups would silently stop working. `fillFromJson` is public and `@target web` in 1.8.4 and rebuilds both through their `fromJson` helpers.
- **Four kinds of row, and only one of them is a setting.** The fork's panel reads like one list, but its rows write to four different places, and AlphaTab accepts a write to the wrong one **without a word** — the control moves, the number updates, nothing changes. The schema therefore gives every row a `source` (Task 4):
  - `settings` — a key in AlphaTab's settings JSON. Goes through the app's JSON and the funnel. 71 rows.
  - `api` — an `AlphaTabApi` **property**: `masterVolume`, `metronomeVolume`, `countInVolume`, `playbackSpeed`, `isLooping`. None is a key in `SettingsJson`, so `fillFromJson` ignores it. Each is bound to state `PlayerShell` owns and written by the shell's **single writer** for that value — which is what keeps two editors of one value in sync: the header's BPM stepper and the Player group's speed row are one `speed`, one writer; the transport's Metronome button and the Player group's metronome-volume row are one `metronomeVolume`, one writer. **All five ship** (maintainer, 2026-09-20).
  - `stylesheet` — a property of **`api.score.stylesheet`**, on the score MODEL. The whole Stylesheet group (12 rows) is this. It is not in the settings JSON, it belongs to the score that is open, a new score brings its own, and it is never stored. Written directly, then redrawn through `queueRender`.
  - `action` — a command. The Export group's two exports.
- **A `settings` row says how it takes effect, and there are three ways, not two.** `render` — push the settings and redraw (most rows). `settings` — push only; the player-side rows that change nothing drawn (the cursor toggles, the scroll rows, the player mode). **`midi`** — the fourteen rows that shape the GENERATED MIDI (`player.songBook*`, `player.vibrato.*`, `player.slide.*`, `player.playTripletFeel`) change nothing until `api.loadMidiForScore()` regenerates it; `updateSettings()` and `render()` do not. Regenerating **stops playback and rewinds to the start** (see the non-blocking exception above) — the only apply mode that does. A boolean `rerender` flag cannot say that, and a row that gets it wrong is another silent no-op.
- **`display.padding` is an ARRAY** — `[horizontal, vertical]`, two rows. The dot-path helpers address it as `display.padding.0` and `display.padding.1`, a write must leave it an array — `fillFromJson` assigns the value through **unvalidated** (`alphaTab.core.mjs:29586`) and the layout then calls `padding.map(…)` on it (`:57636`), so a spread `{ ...array }` **throws a TypeError and aborts the render**; it does not degrade to no padding, and the storage merge must check it element by element.
- **Do not port the fork's three mis-bound rows.** Its "simple slide duration ratio" row is bound to `player.slide.simpleSlidePitchOffset` — the row above it — when the key is `player.slide.simpleSlideDurationRatio` (`alphaTab.d.ts:15408`). Its Stylesheet group has a thirteenth row bound to `otherSystemsTrackNameOrientation` a second time; the real multi-bar-rest row follows it. And its `otherSystemsTrackNameOrientation` row is offered with the **`TrackNameMode`** enum (`FullName` / `ShortName`) instead of **`TrackNameOrientation`** (`Horizontal` / `Vertical`) — the row above it, `firstSystemTrackNameOrientation`, gets the right one, which is what makes this a slip rather than a convention. The two enums are disjoint, so a `TrackNameMode` name parses to `undefined` and the dropdown changes nothing. Reading the fork for its row set is the brief; copying its bugs is not.
- **The speed range is the engine's own: 12.5 %–800 %** — `SynthConstants` clamps `playbackSpeed` to `0.125`–`8` (registry, 2026-09-20, superseding the spec's 12.5–200 %). The Player group's speed row uses the same range as the header's `TempoControl`.
- **API-property rows are not persisted in v0.** The stored value is AlphaTab's settings JSON and nothing else (spec §7). Whether the playback speed should survive a reload is [NH-295](https://leocaseiro.atlassian.net/browse/NH-295); do not answer it here by widening the stored shape.
- **Keys the shell owns per instance are not rows — and the fork has none of them, so nothing is lost.** `PlayerShell`'s `settingsInit` and `setAlphaTabDefaults` set `core.file`, `core.tracks`, `core.fontDirectory`, `core.logLevel`, `player.soundFont` and `player.scrollElement`. A row over any of them would let a stored value break the page on the next visit (a stale `core.file`, a missing sound bank). The fork's panel has no row for any of the six; this is a guard for later rows, not an exception to "same as the fork". For the keys that **are** rows and that the shell also sets — `player.playerMode` (EnabledAutomatic), `player.enableCursor` (true), `player.scrollMode` (Continuous) and `player.scrollOffsetY` (-10) — the shipped default in Task 4 must equal what the shell sets, because the first edit pushes the **whole** JSON through `fillFromJson`.
- **"Is the file's own recording playing?" is asked of AlphaTab, not worked out from the score.** With the player-mode row, a score that embeds a recording can be played by the synthesizer, so `Boolean(score.backingTrack?.rawAudioFile)` stops being the answer. `api.actualPlayerMode` (`alphaTab.d.ts:377`) is the player AlphaTab really built; the mixer, Metronome and Count-In are unavailable exactly when it is `PlayerMode.EnabledBackingTrack` (Task 8).
- **`web/` has a unit-test runner.** Vitest, `pnpm --filter @notation-hero/web run test`, tests co-located as `X.test.ts` beside `X.ts` and importing `describe` / `expect` / `it` from `'vitest'` explicitly — `web/lib/alphatab/drum-tracks.test.ts` is the pattern. **There is no Vitest config file in `web/`**, so it runs on defaults: `globals: false` (hence the explicit import) and the **node** environment with no DOM. `settings-storage.test.ts` must therefore inject or stub its storage rather than reach for a real `localStorage`.
- `@coderline/alphatab` 1.8.4 facts this plan relies on, each checked against the installed package: `api.settings: Settings`, `api.updateSettings()`, `api.render()`, `api.renderTracks(tracks: Track[])`, `api.tracks` (what is drawn now), `api.changeTrackMute(tracks, mute)`, `api.changeTrackSolo(tracks, solo)`, `api.changeTrackVolume(tracks, absoluteChannelVolume)`, `api.changeTrackTranspositionPitch(tracks, semitones)`, `api.player?.resetChannelStates()`, `api.downloadMidi()`, `exporter.Gp7Exporter#export(score, settings): Uint8Array` (on the namespace object — `export` is inherited from the abstract `ScoreExporter`, `alphaTab.d.ts:15003`, and its `settings` parameter is optional and nullable), `settings.notation.transpositionPitches: number[]` (indexed by track), `track.playbackInfo.volume` (0–16), `staff.showStandardNotation | showSlash | showNumbered | showTablature`, `staff.tuning: number[]` (a **read-only getter**, `alphaTab.d.ts:15590` — read it, never assign to it), `staff.isPercussion` (`:12818`). `fillFromJson` reads an enum from its **name**, case-insensitively, as well as from its number (`JsonHelper.parseEnum`, `alphaTab.core.mjs:25045`).
- **`scoreLoaded` fires ON SUBSCRIBE.** Its emitter carries a fire-on-register producer (`alphaTab.core.mjs:24722` + `:45531`), so a handler runs immediately against the score already open — including React Strict Mode's development double-mount. Everything in the mixer's `scoreLoaded` handler must therefore be idempotent; it rebuilds rows from the score, which is.
- **Two MIDI generations per score load, not one.** `_setupOrDestroyPlayer()` always returns `false` (`alphaTab.core.mjs:46705-46713`) despite its own JSDoc, so `_onScoreLoaded`'s guard always calls `loadMidiForScore()` and `_internalRenderTracks` calls it again at `:45847`. Any assertion that counts MIDI regenerations on a score change must expect **two**. A settings row that regenerates deliberately still counts one.
- **`playerReady` is not once per score.** Measured: twice per `loadMidiForScore()`, four times per `renderScore`, five on one `api.load()`. Only idempotent channel-state re-assertion belongs on it — never a toast, a focus move or anything a person would see repeated.
- **A disabled `Button` is `pointer-events: none`, so its own tooltip cannot open on hover.** `buttonVariants` carries `aria-disabled:pointer-events-none` (`Button.tsx:20`), which is part of the NH-304 guard, not only styling. Any control that is disabled **and** must explain why wraps its `TooltipTrigger` around a `<span className="inline-flex" />` instead of rendering through the `Button` — the shape `TransportToggle` already ships. That covers the Settings gear while the engine loads and the Tracks trigger while no player is coming.
- **`data-popup-open` cannot tell a tooltip from a popover.** Both triggers map their open state to the same attribute (`utils/popupStateMapping.js:45`), so on the stacked trigger it is present on hover as well as when the popover is open. The discriminator is `aria-expanded`; never key a style or an assertion on `data-popup-open` for either trigger.
- **The accordion's state attribute differs by part**: `data-panel-open` on the trigger, `data-open` on item, header and panel. `Accordion.Root` is also **not** a `forwardRef` component (`AccordionRoot.d.ts:11-13`) unlike its four siblings, so the Task 1 wrapper has nowhere to forward a ref to the root.
- **`DEFAULT_PLAYER_SETTINGS.core.engine` is `'svg'`, while AlphaTab's own default is `'default'`** (`alphaTab.core.mjs:65505`) — benign, because `'default'` is registered as an alias of `'svg'` (`:64879`), but it is the one shipped default that does not equal AlphaTab's, so it carries this note rather than looking like an oversight.
- **Do not port the reference's bars-per-row slider offset.** Its control adds one to any non-negative value, so its lowest stop writes 1. Write the value as typed; `-1` still means automatic.
- **The shipped scope is every row of the reference panel — which is a SUBSET of AlphaTab's settings.** The score stylesheet alone has 21 properties and the panel reaches 12; the importer and exporter groups have no row at all. That is the agreed scope, not an oversight — but say it plainly in the PR body and the registry entry so the by-eye gate is walked with the right expectation.
- **Never commit a red test on its own.** `tooling/check-layout.sh` enforces repo-wide that every `X.test.*` has a **tracked** `X.ts`/`X.tsx` sibling, and it runs on `pre-commit`. Each task's Steps 1-4 land as one commit.
- **`PlayerHeader.tsx` imports nothing from `react` today**, so the new `actions?: ReactNode` slot needs `import type { ReactNode } from 'react'` added with it.
- **After any rebase onto `master`, re-run `pnpm run lint:md` before pushing.** `docs/decisions/decision-registry.md` is `merge=union`, so two new entries can be joined with no blank line between them, which fails markdownlint MD022 on the `pre-push` hook after the commit is already made.
- `@base-ui/react` 1.6.0 facts, checked against the installed types: the accordion root's prop is **`multiple`** (`AccordionRoot.d.ts:84`; `openMultiple` was the pre-1.0 name and does not exist), and the trigger's open-state attribute is **`data-panel-open`**.

---

## File Structure

**Created — `client/src/components/ui/`**

| Folder        | Responsibility                                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accordion/`  | Collapsible sections. The third and last of the spec's three new design-system components, and the one v0.1's settings search builds on.                                                                                |
| `SettingRow/` | One settings row: label left, control right. Renders a toggle, a number input, a number-with-slider, a text input, a dropdown or an action button from a plain descriptor.                                              |
| `TrackRow/`   | One mixer row: an always-visible primary cluster plus a disclosure holding the display toggles and both transposition sliders.                                                                                          |
| `MasterRow/`  | The mixer's foot row: master volume plus solo-all and mute-all as "select all" checkboxes over the rows. Composes the same primitives `TrackRow` does; every value is controlled by `PlayerShell`, never its own state. |

**Created — `web/`**

| File                                   | Responsibility                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `web/lib/alphatab/settings-paths.ts`   | Dot-path read and immutable write over the settings JSON. Co-located `settings-paths.test.ts`.                                 |
| `web/lib/alphatab/settings-schema.ts`  | The eight groups and their rows. Each row names its `source`: a settings path, an api value, or an action. No JSX.             |
| `web/lib/alphatab/settings-storage.ts` | Read, merge, validate and write the persisted settings JSON. Co-located `settings-storage.test.ts`.                            |
| `web/lib/alphatab/live-settings.ts`    | Every write to the LIVE engine's settings, score stylesheet, tracks and staves — the one `updateSettings()` funnel. No React.  |
| `web/app/play/SettingsPopover.tsx`     | The gear popover: accordion sections of `SettingRow`s, driven by the schema.                                                   |
| `web/app/play/TracksPopover.tsx`       | The mixer popover: one `TrackRow` per track in the score. Owns the mixer's React state and rebuilds it on every `scoreLoaded`. |

**Modified**

| File                                                  | Change                                                                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/index.ts`                                 | Export `Accordion*`, `SettingRow`, `TrackRow`, `Popover*` and `ScrollArea` — what a `web/` screen imports, and nothing else (spec D3).                      |
| `client/src/components/ui/{Popover,ScrollArea}/*.tsx` | Add `'use client'` — both lack it today. `Field`, `Checkbox`, `Input` and `NativeSelect` are reached only through `SettingRow` / `TrackRow`, which have it. |
| `web/app/play/PlayerHeader.tsx`                       | Gain an `actions` slot for the right column Plan B left empty. The shell passes the Settings popover into it.                                               |
| `web/app/play/PlayerShell.tsx`                        | Hold the settings state; restore it before the api is built; persist on change; pass both popovers into their slots.                                        |
| `web/lib/alphatab/useAlphaTab.ts`                     | Add `'masterVolume'` to the `AlphaTabApiValue` union — the one api value the transport does not already write (Task 5).                                     |
| `web/e2e/player.e2e.ts`, `web/e2e/a11y.e2e.ts`        | Cases for criteria 3 and 7, axe with each popover open, and `expectHitAreas` widened to the new control kinds.                                              |

`web/app/play/TransportRow.tsx` is **not** modified — the row already has a `trailing` slot, left free for this plan's Tracks trigger. `web/app/play/NotationSurface.tsx` gains exactly one line: the transposition clear, above its `api.renderScore(...)` (Task 7, Step 3b). The mixer itself needs nothing from the surface — it learns the score's tracks from `scoreLoaded` and what is drawn from `renderFinished`.

---

### Task 1: `Accordion`

**Files:**

- Create: `client/src/components/ui/Accordion/` (six files)

**Interfaces:**

- Consumes: `@base-ui/react/accordion`, `cn`.
- Produces: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` — a Radix-shaped composite over Base UI's `Root / Item / Header / Trigger / Panel`. `data-slot="accordion"`. Task 5 consumes it. (`TrackRow`'s disclosure is a single collapsible and does not use it.)

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/Accordion/Accordion.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion';

const Sample = () => (
  {/* `multiple`: without it Base UI's Accordion.Root collapses to single-open
      (AccordionRoot.js:71), so a two-item test proves nothing about multi-open. */}
  <Accordion multiple defaultValue={['notation']}>
    <AccordionItem value="notation">
      <AccordionTrigger>Notation</AccordionTrigger>
      <AccordionContent>notation rows</AccordionContent>
    </AccordionItem>
    <AccordionItem value="player">
      <AccordionTrigger>Player</AccordionTrigger>
      <AccordionContent>player rows</AccordionContent>
    </AccordionItem>
  </Accordion>
);

test('each section header is a button that reports its expanded state', () => {
  render(<Sample />);
  expect(screen.getByRole('button', { name: 'Notation' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-expanded', 'false');
});

test('an open section shows its content', () => {
  render(<Sample />);
  expect(screen.getByText('notation rows')).toBeVisible();
});

test('clicking a closed header opens it', async () => {
  const user = userEvent.setup();
  render(<Sample />);

  await user.click(screen.getByRole('button', { name: 'Player' }));
  expect(screen.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('player rows')).toBeVisible();
});

// The settings popover opens several groups at once, so multiple-open is the required default —
// not an option a caller has to remember.
test('opening a second section leaves the first open', async () => {
  const user = userEvent.setup();
  render(<Sample />);

  await user.click(screen.getByRole('button', { name: 'Player' }));
  expect(screen.getByRole('button', { name: 'Notation' })).toHaveAttribute('aria-expanded', 'true');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Accordion`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/Accordion/Accordion.tsx`:

```tsx
'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Collapsible sections over Base UI's Accordion. The parts are re-shaped into the familiar
// Root/Item/Trigger/Content quartet — Base UI splits the header and the trigger, and this folds
// the Header into AccordionTrigger so a caller writes three parts, not four.
//
// Multiple sections stay open by default: the settings popover has eight groups and a drummer
// comparing two of them should not have the first one snap shut.
const Accordion = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) => (
  <AccordionPrimitive.Root
    data-slot="accordion"
    multiple
    className={cn('flex w-full flex-col', className)}
    {...props}
  />
);

const AccordionItem = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) => (
  <AccordionPrimitive.Item
    data-slot="accordion-item"
    className={cn('border-b border-border last:border-b-0', className)}
    {...props}
  />
);

const AccordionTrigger = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      className={cn(
        // min-h-11 = the 44px minimum hit area; the chevron keeps its drawn size.
        'group/accordion-trigger flex min-h-11 w-full items-center justify-between gap-2 px-1 py-2 text-left text-sm font-medium',
        'transition-colors outline-none hover:text-primary',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      {children}
      <span
        className="material-symbols-outlined shrink-0 transition-transform group-data-[panel-open]/accordion-trigger:rotate-180"
        aria-hidden="true"
      >
        expand_more
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);

const AccordionContent = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Panel>) => (
  <AccordionPrimitive.Panel
    data-slot="accordion-content"
    className={cn('overflow-hidden px-1 pb-3 text-sm', className)}
    {...props}
  />
);

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
```

> Both Base UI names above are checked against the installed 1.6.0 types, so neither needs guessing: the root's prop is `multiple` (`node_modules/@base-ui/react/accordion/root/AccordionRoot.d.ts:84`), and the trigger's open-state attribute is `data-panel-open` (`accordion/trigger/AccordionTriggerDataAttributes.d.ts`), which is what the chevron rotation keys off. The fourth test is what proves `multiple` took effect. The trigger is 44 px tall (`min-h-11`) and spans the popover's width, so it passes the hit-area gate as written.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Accordion`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`Accordion.story-ids.ts`: `['default', 'all-closed', 'many-sections']`. Stories under `title: 'UI/Accordion'` with a `w-80` decorator, modelled on `RangeSlider.stories.tsx`. `storyPrefix: 'ui-accordion'`, `snapshotSlug: 'accordion'`, `slotSelector: '[data-slot="accordion"]'`, `iconFontStory: () => true` (every trigger renders the chevron glyph), `states: ['resting', 'focus', 'hover']`.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "Accordion"
open -a Docker
pnpm test:vr:docker:update
pnpm test:vr:docker
```

Expected: a11y PASS; only new `accordion-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/Accordion
git commit -m "feat(client): add the Accordion (NH-291)"
```

---

### Task 2: `SettingRow`

One component for ~90 rows. It takes a plain descriptor — never an AlphaTab enum object — so a Storybook story can render every control kind with fabricated-but-honest data.

**Files:**

- Create: `client/src/components/ui/SettingRow/` (six files)

**Interfaces:**

- Consumes: `Field`, `FieldLabel`, `Checkbox`, `Input`, `NativeSelect`, `Button`, `Slider` (Plan B — its `onCommit` is what the `range` kind relies on), `cn`.
- Produces:

```ts
type SettingControl =
  | { kind: 'toggle' }
  | { kind: 'number'; min?: number; max?: number; step?: number }
  | { kind: 'range'; min: number; max: number; step?: number }
  // Free text, committed on blur or Enter — never per keystroke. See the `color` note below.
  | { kind: 'text'; validate?: (draft: string) => boolean }
  // A real colour control. The six colour rows use this, not `text`: AlphaTab's parser returns a
  // null Color for a half-typed hex and the renderer then throws on it.
  | { kind: 'color' }
  | { kind: 'select'; options: readonly { value: string; label: string }[] }
  // A button that runs a command instead of editing a value — the v0.1 spec's "Action" row (§4).
  | { kind: 'action'; actionLabel: string };

interface SettingRowProps {
  id: string;
  label: string;
  control: SettingControl;
  /** Ignored by an `action` row, which has no value. */
  value: string | number | boolean;
  onChange: (next: string | number | boolean) => void;
  /** Called by an `action` row's button. Every other kind ignores it. */
  onAction?: () => void;
  description?: string;
  disabled?: boolean;
}
```

`data-slot="setting-row"`. Task 5 consumes it.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/SettingRow/SettingRow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingRow } from './SettingRow';

test('a toggle row exposes a named checkbox and reports a boolean', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="cursor"
      label="Show cursors"
      control={{ kind: 'toggle' }}
      value={false}
      onChange={onChange}
    />,
  );

  const box = screen.getByRole('checkbox', { name: 'Show cursors' });
  await user.click(box);
  expect(onChange).toHaveBeenCalledWith(true);
});

test('a select row exposes a named combobox listing every option', () => {
  render(
    <SettingRow
      id="layout"
      label="Layout mode"
      control={{
        kind: 'select',
        options: [
          { value: 'page', label: 'Page' },
          { value: 'horizontal', label: 'Horizontal' },
        ],
      }}
      value="page"
      onChange={() => {}}
    />,
  );

  const select = screen.getByRole('combobox', { name: 'Layout mode' });
  expect(select).toHaveValue('page');
  expect(screen.getAllByRole('option')).toHaveLength(2);
});

test('a number row reports a NUMBER, not the input string', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="scale"
      label="Scale"
      control={{ kind: 'number', step: 0.1 }}
      value={1}
      onChange={onChange}
    />,
  );

  const input = screen.getByRole('spinbutton', { name: 'Scale' });
  await user.clear(input);
  await user.type(input, '2');
  expect(onChange).toHaveBeenLastCalledWith(2);
});

// A blank or half-typed number must not push NaN into the settings tree, where it would break
// rendering silently.
test('a number row ignores an unparseable entry instead of reporting NaN', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="scale"
      label="Scale"
      control={{ kind: 'number' }}
      value={1}
      onChange={onChange}
    />,
  );

  await user.clear(screen.getByRole('spinbutton', { name: 'Scale' }));
  expect(onChange).not.toHaveBeenCalledWith(Number.NaN);
});

// "Numeric values pair a number input in the row with a slider on the line beneath."
test('a range row renders both a number input and a named slider', () => {
  render(
    <SettingRow
      id="speed"
      label="Playback speed (%)"
      control={{ kind: 'range', min: 12.5, max: 800, step: 0.5 }}
      value={100}
      onChange={() => {}}
    />,
  );

  expect(screen.getByRole('spinbutton', { name: 'Playback speed (%)' })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: 'Playback speed (%)' })).toBeInTheDocument();
});

test('a text row reports the raw string', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="staff-color"
      label="Staff line colour"
      control={{ kind: 'text' }}
      value="#2DD4BF"
      onChange={onChange}
    />,
  );

  await user.type(screen.getByRole('textbox', { name: 'Staff line colour' }), '!');
  expect(onChange).toHaveBeenLastCalledWith('#2DD4BF!');
});

// The Export group: a row whose control is a command, not a value.
test('an action row renders a named button and reports the press, never a value', async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="export-midi"
      label="MIDI file"
      control={{ kind: 'action', actionLabel: 'Export MIDI' }}
      value=""
      onChange={onChange}
      onAction={onAction}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Export MIDI' }));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(onChange).not.toHaveBeenCalled();
});

// A settings change re-lays-out the whole score. Base UI reports every pointer move, so a range
// row holds the value it is being dragged through and reports ONCE, when the gesture ends. A
// keystroke is a whole gesture, so each one reports.
test('a range row reports a keyboard step once, as a committed value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="zoom"
      label="Zoom"
      control={{ kind: 'range', min: 0.25, max: 3, step: 0.05 }}
      value={1}
      onChange={onChange}
    />,
  );

  screen.getByRole('slider', { name: 'Zoom' }).focus();
  await user.keyboard('{ArrowRight}');
  expect(onChange).toHaveBeenCalledTimes(1);
  // closeTo, not an exact 1.05: the step arithmetic is floating point.
  expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(1.05, 5));
});
```

> jsdom has no layout, so the 44 px rule cannot be unit-tested here. It is enforced where it can be measured: `expectHitAreas` in the `web` lane, with the popover open (Task 9).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/SettingRow`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/SettingRow/SettingRow.tsx`. Compose the primitives that already exist — `Field` with `orientation="horizontal"` gives the label-left / control-right layout, and none of `Checkbox`, `Input`, `NativeSelect` or `Slider` is new work:

```tsx
'use client';

import { useState } from 'react';

import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { Field, FieldDescription, FieldLabel } from '../Field/Field';
import { Input } from '../Input/Input';
import { NativeSelect } from '../NativeSelect/NativeSelect';
import { Slider } from '../Slider/Slider';

import { cn } from '@/lib/utils';

export type SettingControl =
  | { kind: 'toggle' }
  | { kind: 'number'; min?: number; max?: number; step?: number }
  | { kind: 'range'; min: number; max: number; step?: number }
  | { kind: 'text'; validate?: (draft: string) => boolean }
  | { kind: 'color' }
  | { kind: 'select'; options: readonly { value: string; label: string }[] }
  | { kind: 'action'; actionLabel: string };

export type SettingValue = string | number | boolean;

interface SettingRowProps {
  /** Unique within the popover; ties the label to its control. */
  id: string;
  label: string;
  control: SettingControl;
  /** Ignored by an `action` row, which has no value. */
  value: SettingValue;
  onChange: (next: SettingValue) => void;
  /** Called by an `action` row's button. Every other kind ignores it. */
  onAction?: () => void;
  description?: string;
  disabled?: boolean;
}

// One row of a settings group: label left, control right. It takes a PLAIN descriptor and plain
// option arrays — never an AlphaTab enum object — which is what lets a Storybook story render
// every control kind with honest data and keeps the VR and axe baselines meaningful. The caller
// (in web/) turns an enum into { value, label } pairs before it gets here.
//
// Colours use the `color` kind, NOT `text`. This supersedes the spec's "Colors are plain text
// inputs for now" (§7): AlphaTab's Color.fromJson returns null for a half-typed hex and the canvas
// then throws on `.rgba`, so a text field breaks the score while someone types into it. The
// reference panel uses a swatch picker for the same reason. Text rows (the fonts) commit on blur
// or Enter and validate before reporting.
const SettingRow = ({
  id,
  label,
  control,
  value,
  onChange,
  onAction,
  description,
  disabled = false,
}: Readonly<SettingRowProps>) => {
  const labelId = `${id}-label`;

  // While a slider is being dragged, the row shows the value under the pointer and reports
  // nothing. A settings change re-lays-out the whole score, and Base UI reports every pointer
  // move — so the report waits for the gesture to end. null = not dragging.
  const [draft, setDraft] = useState<number | null>(null);

  // A half-typed or cleared number field yields NaN; pushing that into the settings tree breaks
  // rendering WITHOUT throwing, so drop it and keep the last good value.
  //
  // The declared min/max are NOT enforced per keystroke. They reach the DOM as native attributes,
  // which constrain the stepper and nothing else, so a typed 0 in a row declared min 0.25 is
  // reported, pushed to the engine and persisted — and the next visit restores it before the api
  // exists. But clamping on every keystroke is worse: the field is controlled, so typing "0.5"
  // into that row would rewrite itself to "0.25" at the first character, and "100" into the speed
  // row (min 12.5) would rewrite to "12.5". So the clamp waits for the commit — blur or Enter —
  // the same boundary the text rows already use, and only for rows that declare a bound.
  const clampToControl = (n: number) => {
    const { min, max } = control as { min?: number; max?: number };
    return Math.min(max ?? n, Math.max(min ?? n, n));
  };
  const reportNumber = (raw: string, commit = false) => {
    const parsed = Number(raw);
    if (raw.trim() === '' || Number.isNaN(parsed)) return;
    onChange(commit ? clampToControl(parsed) : parsed);
  };

  // A text row's in-progress string. null = not being edited, so the row shows `value`. Nothing
  // reaches the caller until blur or Enter, and then only if the caller's `validate` accepts it —
  // the engine's parsers throw or return null on almost every partial string, and the settings
  // funnel has no try/catch on the edit path.
  const [textDraft, setTextDraft] = useState<string | null>(null);

  const commitText = () => {
    if (textDraft === null) return;
    const accepted =
      control.kind === 'text' && control.validate ? control.validate(textDraft) : true;
    if (accepted) onChange(textDraft);
    // Rejected or accepted, stop editing: the row falls back to showing `value`, so a bad draft
    // visibly reverts instead of sitting there looking applied.
    setTextDraft(null);
  };

  return (
    <Field
      data-slot="setting-row"
      orientation={control.kind === 'range' ? 'vertical' : 'horizontal'}
      // min-h-11 = the 44px minimum. The row is the floor; each control below reaches it too.
      // A range row is a column (number input, then the slider beneath), so it must not centre.
      className={cn('min-h-11', control.kind !== 'range' && 'items-center justify-between')}
    >
      {/* min-h-11/min-w-11 because a <label for> IS a hit target: pressing it focuses or toggles
          its control, and the lane's hit-area gate measures it. On a toggle row the checkbox sits
          INSIDE the label, so the whole 44px row toggles it — the box itself is 16px and could
          never pass alone. An action row gets NO `for`: a <label for> pointing at a <button>
          replaces the button's accessible name with the label's text, and the button must keep
          saying what it does ("Export MIDI"), not what the row is about. */}
      <FieldLabel
        htmlFor={control.kind === 'action' ? undefined : id}
        id={labelId}
        className="flex min-h-11 min-w-11 flex-1 items-center justify-between gap-3"
      >
        {label}
        {control.kind === 'toggle' ? (
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(next) => onChange(Boolean(next))}
            disabled={disabled}
          />
        ) : null}
      </FieldLabel>

      {control.kind === 'number' ? (
        <Input
          id={id}
          type="number"
          min={control.min}
          max={control.max}
          step={control.step}
          value={String(value)}
          onChange={(event) => reportNumber(event.target.value)}
          onBlur={(event) => reportNumber(event.target.value, true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') reportNumber(event.currentTarget.value, true);
          }}
          disabled={disabled}
          // h-11, not Input's own h-9: 36px is under the 44px minimum.
          className="h-11 w-28"
        />
      ) : null}

      {/* A text row NEVER reports per keystroke. AlphaTab's parsers are hostile to a partial
          value: a half-typed hex gives a null Color and the canvas then throws on `.rgba`, an
          `rgb` prefix throws out of the parser itself, and EVERY partial font string throws — ten
          of the seventeen keystrokes in "bold 12px Georgia". Each of those is also written to
          storage on the same keystroke, so the broken value survives a reload. The draft is held
          locally and reported only on blur or Enter, and only if `validate` accepts it. A
          validator alone is not enough: "#2DD" is legitimate CSS shorthand, so nothing can tell a
          half-typed "#2DD4BF" from a deliberate "#2DD" — deferring the commit is what removes the
          intermediate states. */}
      {control.kind === 'text' ? (
        <Input
          id={id}
          type="text"
          value={textDraft ?? String(value)}
          onChange={(event) => setTextDraft(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitText();
          }}
          disabled={disabled}
          className="h-11 w-40"
        />
      ) : null}

      {/* The colour rows. A native colour control cannot produce a value the engine rejects, which
          is how the reference panel avoids this entirely — it uses a swatch picker and never a
          text field. */}
      {control.kind === 'color' ? (
        <Input
          id={id}
          type="color"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-40 p-1"
        />
      ) : null}

      {control.kind === 'action' ? (
        <Button
          id={id}
          variant="outline"
          onClick={() => onAction?.()}
          disabled={disabled}
          className="h-11"
        >
          {control.actionLabel}
        </Button>
      ) : null}

      {control.kind === 'select' ? (
        <NativeSelect
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-44"
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      ) : null}

      {/* A numeric value pairs a number input in the row with a slider on the line beneath — the
          row grammar both design sources describe. Both carry the SAME accessible name, so a
          screen reader hears one setting with two ways to set it. */}
      {control.kind === 'range' ? (
        <div className="flex w-full flex-col gap-2">
          <Input
            id={id}
            type="number"
            min={control.min}
            max={control.max}
            step={control.step}
            value={String(draft ?? value)}
            onChange={(event) => reportNumber(event.target.value)}
            disabled={disabled}
            className="h-11 w-28 self-end"
          />
          <Slider
            value={draft ?? Number(value)}
            onChange={setDraft}
            onCommit={(next) => {
              setDraft(null);
              onChange(next);
            }}
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            label={label}
            disabled={disabled}
          />
        </div>
      ) : null}

      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
};

export { SettingRow };
```

> `Checkbox` spreads its props onto Base UI's `Checkbox.Root`, whose callback is `onCheckedChange(checked: boolean, details)` — checked against the installed 1.6.0 types (`checkbox/root/CheckboxRoot.d.ts:73`). Base UI puts the `id` on the hidden `<input>` it renders beside the visible `<span role="checkbox">`, which is what makes the surrounding `<label for>` toggle it.
>
> **The `range` kind's number input shows the raw number.** A caller whose value is not a tidy number — the playback speed is `0.8916…` after a BPM step in the header — converts to a display unit before it gets here (Task 5 passes the speed as a percentage, rounded to one decimal).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/SettingRow`
Expected: PASS — 8 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`SettingRow.story-ids.ts`: `['toggle', 'number', 'range', 'text', 'color', 'select', 'action', 'disabled']` — one story per control kind, so every branch carries a VR and axe baseline. `storyPrefix: 'ui-settingrow'`, `snapshotSlug: 'settingrow'`, `slotSelector: '[data-slot="setting-row"]'`, a `w-96` decorator.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "SettingRow"
open -a Docker
pnpm test:vr:docker:update
pnpm test:vr:docker
```

Expected: a11y PASS; only new `settingrow-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/SettingRow
git commit -m "feat(client): add the SettingRow used by every settings group (NH-291)"
```

---

### Task 3: `TrackRow`

Eight controls do not fit on one line, so the row discloses. An always-visible primary cluster carries the track name, render-select, solo, mute, volume **and the four per-staff display toggles as compact icon buttons** (maintainer, 2026-09-21 — they must be visible, not hidden); only the two transposition sliders sit behind a per-row expand control. The four toggles stay **four independent toggles**, not a single-choice control: a track can show standard notation and tablature at once. `Punk.gp` alone is three rows; a band score is more.

**Files:**

- Create: `client/src/components/ui/TrackRow/` (six files)
- Create: `client/src/components/ui/MasterRow/` (six files) — the mixer's foot row: master volume,
  plus solo-all and mute-all as "select all" checkboxes over the rows — ticked when every track is,
  mixed when only some are, and reversible because a ticked box un-ticks every row. It composes the
  same primitives `TrackRow` does and adds none; its volume is a controlled value with no state of
  its own, because `PlayerShell` owns that value and the Settings ▸ Player row is its other editor
  (Task 7's Interfaces says why).

**Interfaces:**

- Consumes: `Accordion` is _not_ used here — the disclosure is a single collapsible, so use `@base-ui/react/collapsible` directly or a plain conditional; `Slider`, `Button`, `Field`, `Tooltip*`, and Plan B's `TransportToggle` for render-select, solo, mute and each per-staff display toggle (no `Checkbox` — they are all `aria-pressed` buttons now). It is an icon-only `aria-pressed` toggle at 44 px that forwards `data-testid`, renders `aria-disabled` rather than the native attribute, and already wraps itself in a tooltip that opens under the mouse even while disabled — every property the two buttons need, so do not rebuild it.
- Produces:

```ts
interface TrackStaffState {
  /** Stable key for React and for the toggle ids. */
  id: string;
  showStandardNotation: boolean;
  showSlash: boolean;
  showNumbered: boolean;
  showTablature: boolean;
  /** False for a percussion, piano or vocal staff — 1.8.4 cannot render tablature on those. */
  tablatureAvailable: boolean;
}

interface TrackRowProps {
  name: string;
  /**
   * Whether the track is DRAWN. Rendered as an eye / eye-with-slash icon toggle, not a checkbox
   * (maintainer, 2026-09-21) — the same `TransportToggle` shape solo and mute already use, so it
   * costs no new primitive. `aria-pressed` carries the state and the always-present tooltip reads
   * `Shown` / `Hidden`.
   */
  rendered: boolean;
  onRenderedChange: (next: boolean) => void;
  /**
   * Set on the LAST drawn track: the reason, as tooltip text. Its render-select then renders
   * disabled. A separate prop from `mixUnavailable` on purpose — render-select stays live while
   * the file plays its own recording, and `mixUnavailable` does not, so the two never coincide.
   */
  renderLockReason?: string;
  solo: boolean;
  onSoloChange: (next: boolean) => void;
  mute: boolean;
  onMuteChange: (next: boolean) => void;
  /**
   * 0-16, AlphaTab's own `playbackInfo.volume` scale. The ROW SHOWS it as a percentage —
   * `Math.round((volume / 16) * 100)` — because 12/16 means nothing to a drummer (maintainer,
   * 2026-09-21). The value here and the writer's `next / 16` to the engine are both unchanged:
   * the percentage is a display unit, not a second scale.
   */
  volume: number;
  onVolumeChange: (next: number) => void;
  staves: readonly TrackStaffState[];
  onStaffChange: (
    staffId: string,
    key: keyof Omit<TrackStaffState, 'id' | 'tablatureAvailable'>,
    next: boolean,
  ) => void;
  transposeAudio: number;
  onTransposeAudioChange: (semitones: number) => void;
  transposeFull: number;
  onTransposeFullChange: (semitones: number) => void;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /**
   * Set while the file plays its own recording: the reason, as tooltip text. Solo, mute, volume
   * and Transpose audio then render disabled — the engine ignores all four in that mode.
   * Render-select, the display toggles and Transpose full stay live: they change the drawn score.
   */
  mixUnavailable?: string;
}
```

`data-slot="track-row"`; the root also spreads `...rest`, so a caller's `data-testid` lands on it. Task 7 consumes it.

```ts
interface MasterRowProps {
  /** The mixer's own master volume, 0-16 — `playbackInfo.volume`'s scale, the same as a track's. */
  volume: number;
  onVolumeChange: (next: number) => void;
  /**
   * Solo-all and mute-all are "select all" CHECKBOXES over the rows, not one-way commands: ticked
   * when every track is, `indeterminate` when only some are — Base UI renders that as
   * `aria-checked="mixed"`. A click on a mixed or unticked box reports `true` and on a ticked box
   * `false`, which is the browser's own select-all behaviour; the row adds NO rule of its own
   * (maintainer, 2026-09-22). The caller writes the reported value onto every track through the
   * same per-row handler a row click uses, so each value keeps exactly one writer.
   */
  soloAll: boolean;
  soloAllIndeterminate: boolean;
  onSoloAllChange: (next: boolean) => void;
  muteAll: boolean;
  muteAllIndeterminate: boolean;
  onMuteAllChange: (next: boolean) => void;
  /**
   * Set while the file plays its own recording: the reason, as tooltip text. Both master
   * checkboxes then render disabled — the engine ignores per-track solo and mute in that mode.
   * Master volume stays LIVE: `masterVolume` is not stubbed for a backing track
   * (`alphaTab.core.mjs:40395`), which is why this flag is not called `mixUnavailable`.
   */
  soloMuteUnavailable?: string;
}
```

`data-slot="master-row"`; this root spreads `...rest` too. Task 7 consumes it and owns the volume value — the row holds no state of its own.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/TrackRow/TrackRow.test.tsx`. Write a `baseProps` object once and spread it, so each test states only what it exercises:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackRow } from './TrackRow';

const drumStaff = {
  id: 'staff-0',
  showStandardNotation: true,
  showSlash: false,
  showNumbered: false,
  showTablature: false,
  // 1.8.4 cannot render tablature on a percussion staff, so the toggle must not appear.
  tablatureAvailable: false,
};

const baseProps = {
  name: 'Drumkit',
  rendered: true,
  onRenderedChange: () => {},
  solo: false,
  onSoloChange: () => {},
  mute: false,
  onMuteChange: () => {},
  volume: 8,
  onVolumeChange: () => {},
  staves: [drumStaff],
  onStaffChange: () => {},
  transposeAudio: 0,
  onTransposeAudioChange: () => {},
  transposeFull: 0,
  onTransposeFullChange: () => {},
  expanded: false,
  onExpandedChange: () => {},
};

test('the primary cluster shows the name, render-select, solo, mute and volume', () => {
  render(<TrackRow {...baseProps} />);
  expect(screen.getByText('Drumkit')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /render/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument();
});

test("the volume slider spans AlphaTab's own 0-16 scale", () => {
  render(<TrackRow {...baseProps} />);
  const volume = screen.getByRole('slider', { name: /volume/i });
  // Base UI renders the thumb as a visually-hidden <input type="range"> carrying ONLY
  // aria-valuenow; the bounds live on the native min/max attributes. Slider.test.tsx and
  // RangeSlider.test.tsx assert them this way, and forbid adding redundant aria-* to the
  // thumb to satisfy a test.
  expect(volume).toHaveAttribute('min', '0');
  expect(volume).toHaveAttribute('max', '16');
  expect(volume).toHaveAttribute('aria-valuenow', '8');
});

test('the display toggles and transposition sliders are hidden until expanded', () => {
  render(<TrackRow {...baseProps} />);
  expect(screen.queryByRole('slider', { name: /transpose audio/i })).not.toBeInTheDocument();
});

test('expanding reveals both transposition sliders as SEPARATE controls', () => {
  render(<TrackRow {...baseProps} expanded />);
  expect(screen.getByRole('slider', { name: /transpose audio/i })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /transpose full/i })).toBeInTheDocument();
});

test('a percussion staff offers no tablature toggle', () => {
  // No `expanded`: the four display toggles are on the always-visible primary row, not behind
  // the disclosure (maintainer, 2026-09-21).
  render(<TrackRow {...baseProps} />);
  expect(screen.getByRole('button', { name: /standard notation/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tablature/i })).not.toBeInTheDocument();
});

test('a stringed staff with a tuning does offer the tablature toggle', () => {
  render(
    <TrackRow
      {...baseProps}
      name="Distortion Guitar"
      staves={[{ ...drumStaff, id: 'staff-1', showTablature: true, tablatureAvailable: true }]}
    />,
  );
  expect(screen.getByRole('button', { name: /tablature/i })).toBeInTheDocument();
});

test('solo and mute report through their callbacks', async () => {
  const user = userEvent.setup();
  const onSoloChange = vi.fn();
  const onMuteChange = vi.fn();
  render(<TrackRow {...baseProps} onSoloChange={onSoloChange} onMuteChange={onMuteChange} />);

  await user.click(screen.getByRole('button', { name: /solo/i }));
  await user.click(screen.getByRole('button', { name: /mute/i }));
  expect(onSoloChange).toHaveBeenCalledWith(true);
  expect(onMuteChange).toHaveBeenCalledWith(true);
});

test('solo is not exclusive — an already-soloed row still reports a toggle OFF', async () => {
  const user = userEvent.setup();
  const onSoloChange = vi.fn();
  render(<TrackRow {...baseProps} solo onSoloChange={onSoloChange} />);

  await user.click(screen.getByRole('button', { name: /solo/i }));
  expect(onSoloChange).toHaveBeenCalledWith(false);
});

// Four controls on the row show no words: the render-select toggle, Solo, Mute and "more controls".
// An icon alone says neither what it is nor what STATE it is in, and the pressed colour means
// nothing to someone meeting the control for the first time. Keyboard focus, as the design
// system's own toggle test does it: jsdom has no pointer geometry.
test('every control without visible text has a tooltip that tells its state', async () => {
  const user = userEvent.setup();
  render(<TrackRow {...baseProps} />);

  await user.tab();
  expect(screen.getByRole('button', { name: /render/i })).toHaveFocus();
  expect(await screen.findByText('Shown in the score')).toBeInTheDocument();

  await user.tab();
  expect(screen.getByRole('button', { name: /solo/i })).toHaveFocus();
  expect(await screen.findByText('Solo: off')).toBeInTheDocument();

  await user.tab();
  expect(screen.getByRole('button', { name: /mute/i })).toHaveFocus();
  expect(await screen.findByText('Mute: off')).toBeInTheDocument();

  await user.tab(); // the volume slider — it carries no tooltip
  await user.tab();
  expect(screen.getByRole('button', { name: /more controls/i })).toHaveFocus();
  expect(await screen.findByText('Show more controls')).toBeInTheDocument();
});

test('each tooltip follows the state it describes', async () => {
  const user = userEvent.setup();
  render(<TrackRow {...baseProps} rendered={false} solo mute expanded />);

  await user.tab();
  expect(await screen.findByText('Hidden from the score')).toBeInTheDocument();
  await user.tab();
  expect(await screen.findByText('Solo: on')).toBeInTheDocument();
  await user.tab();
  expect(await screen.findByText('Mute: on')).toBeInTheDocument();
  await user.tab();
  await user.tab();
  expect(await screen.findByText('Hide more controls')).toBeInTheDocument();
});

// A file that plays its own recording: the engine ignores solo, mute, volume and the audio
// transposition, so they must not look live. `aria-disabled`, never toBeDisabled() — the design
// system keeps a disabled button focusable so the tooltip saying WHY can still open.
const RECORDING = 'Not available while the file plays its own recording';

test('while the file plays its own recording, the mix controls are disabled and say why', async () => {
  const user = userEvent.setup();
  const onSoloChange = vi.fn();
  render(
    <TrackRow {...baseProps} expanded mixUnavailable={RECORDING} onSoloChange={onSoloChange} />,
  );

  const solo = screen.getByRole('button', { name: /solo/i });
  expect(solo).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('button', { name: /mute/i })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('slider', { name: /volume/i })).toBeDisabled();
  expect(screen.getByRole('slider', { name: /transpose audio/i })).toBeDisabled();

  await user.click(solo);
  expect(onSoloChange).not.toHaveBeenCalled();

  // Keyboard focus, not hover: jsdom has no pointer geometry, and the tooltip opens for a
  // keyboard focus, not a scripted one. Tab once to the render-select toggle, once more to Solo.
  await user.tab();
  await user.tab();
  expect(solo).toHaveFocus();
  expect(await screen.findByText(new RegExp(RECORDING, 'i'))).toBeInTheDocument();
});

test('the controls that change the DRAWN score stay live while a recording plays', () => {
  render(<TrackRow {...baseProps} expanded mixUnavailable={RECORDING} />);
  // `aria-disabled`, not toBeDisabled(): `TransportToggle` renders the ARIA attribute and never
  // the native one, so the button keeps its focus — and toBeDisabled() would pass whatever happens.
  expect(screen.getByRole('button', { name: /render/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('button', { name: /standard notation/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('slider', { name: /transpose full/i })).not.toBeDisabled();
});

// The LAST drawn track: AlphaTab cannot draw nothing, so the caller refuses to un-draw it. The
// row must say so instead of swallowing the click — the reason replaces the state text in the
// tooltip, because "Shown in the score" would be true and useless here.
const LOCKED = 'At least one track must stay shown';

test('the last drawn track cannot be hidden, and the row says why', async () => {
  const user = userEvent.setup();
  const onRenderedChange = vi.fn();
  render(<TrackRow {...baseProps} renderLockReason={LOCKED} onRenderedChange={onRenderedChange} />);

  const render_ = screen.getByRole('button', { name: /render/i });
  expect(render_).toHaveAttribute('aria-disabled', 'true');
  await user.click(render_);
  expect(onRenderedChange).not.toHaveBeenCalled();

  // Solo, mute and volume are untouched: this lock is about what is DRAWN, not about the mix.
  expect(screen.getByRole('button', { name: /solo/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('slider', { name: /volume/i })).not.toBeDisabled();

  await user.tab();
  expect(await screen.findByText(LOCKED)).toBeInTheDocument();
});
```

> The two slider assertions use `toBeDisabled()` on purpose: Base UI's slider thumb is a real `<input type="range">`, and a disabled slider has no tooltip to keep reachable — the reason is carried by the solo and mute buttons beside it, and by the note Task 7 puts at the top of the popover.

Create `client/src/components/ui/MasterRow/MasterRow.test.tsx` beside it — same shape, five tests:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MasterRow } from './MasterRow';

const baseProps = {
  volume: 8,
  onVolumeChange: () => {},
  soloAll: false,
  soloAllIndeterminate: false,
  onSoloAllChange: () => {},
  muteAll: false,
  muteAllIndeterminate: false,
  onMuteAllChange: () => {},
};

const RECORDING = 'Not available while the file plays its own recording';

test('the foot row shows master volume, solo all and mute all', () => {
  render(<MasterRow {...baseProps} />);
  expect(screen.getByRole('slider', { name: /master volume/i })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /solo all/i })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /mute all/i })).toBeInTheDocument();
});

test('some tracks muted reads as mixed, not as unticked', () => {
  render(<MasterRow {...baseProps} muteAllIndeterminate />);
  expect(screen.getByRole('checkbox', { name: /mute all/i })).toHaveAttribute(
    'aria-checked',
    'mixed',
  );
});

test('a mixed box reports true, so one press takes every row with it', async () => {
  const onMuteAllChange = vi.fn();
  render(<MasterRow {...baseProps} muteAllIndeterminate onMuteAllChange={onMuteAllChange} />);
  await userEvent.click(screen.getByRole('checkbox', { name: /mute all/i }));
  expect(onMuteAllChange).toHaveBeenCalledWith(true);
});

test('a ticked box reports false, so the same press is the way back out', async () => {
  const onMuteAllChange = vi.fn();
  render(<MasterRow {...baseProps} muteAll onMuteAllChange={onMuteAllChange} />);
  await userEvent.click(screen.getByRole('checkbox', { name: /mute all/i }));
  expect(onMuteAllChange).toHaveBeenCalledWith(false);
});

test('a recording disables both master boxes and leaves the volume live', () => {
  render(<MasterRow {...baseProps} soloMuteUnavailable={RECORDING} />);
  // `data-disabled`, not toBeDisabled(): the design system's Checkbox renders a <span>, and
  // toBeDisabled() only understands native form elements — on a span it passes whatever happens.
  expect(screen.getByRole('checkbox', { name: /solo all/i })).toHaveAttribute('data-disabled');
  expect(screen.getByRole('checkbox', { name: /mute all/i })).toHaveAttribute('data-disabled');
  expect(screen.getByRole('slider', { name: /master volume/i })).not.toBeDisabled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TrackRow src/components/ui/MasterRow`
Expected: FAIL — module not found, both of them.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/TrackRow/TrackRow.tsx`. Keep it presentation-only: no AlphaTab import, no ratio arithmetic (the caller does that), no knowledge of MIDI channels.

Requirements the tests encode, all of which must be visible in the code:

- The props extend `Omit<ComponentProps<'div'>, 'children'>` and the root spreads `...rest`, so the caller's `data-testid` lands on the row. `TrackStaffState` is **exported** — the mixer in `web/` builds that shape from the score.
- The primary cluster is one flex line: name, a render-select **eye toggle** (eye when shown, eye-with-slash when hidden; `aria-pressed={rendered}`, tooltip `Shown` / `Hidden`), a solo toggle, a mute toggle, a `Slider` for volume with `min={0} max={16} step={1}` and an accessible name that includes the track (`label={`${name} volume`}`), **the four per-staff display toggles as compact icon buttons**, and the expand control.
- Solo and mute are Plan B's `TransportToggle` — `pressed`, `onPressedChange`, `label` (`Solo ${name}`, `Mute ${name}`), `icon`, `tooltip`, `disabled`. Base UI's `Toggle` reports the NEXT state, which is what makes solo non-exclusive: the row never looks at any other row. Each `tooltip` tells the control's **state**, and is always present: `Solo: on` / `Solo: off`, `Mute: on` / `Mute: off`, or the `mixUnavailable` text when that is set.
- `mixUnavailable` disables solo, mute, the volume `Slider` and the "Transpose audio" `Slider`, and nothing else. `disabled={Boolean(mixUnavailable)}` on each — `TransportToggle` turns that into `aria-disabled` by itself.
- `renderLockReason` disables the render-select toggle and nothing else, and its text REPLACES the normal state text in that control's tooltip — the row is the only place the rule "at least one track must stay shown" is ever explained. Without it the caller's guard swallows the click in silence: `applyRendered` returns early on an empty list (Task 7), so the control would look live and do nothing, which Global Constraints forbid. `mixUnavailable` and `renderLockReason` never coincide — render-select stays live while a recording plays.
- The volume `Slider` reports through **`onCommit`**, and tracks the pointer in local state while it is dragged — the same shape `SettingRow`'s range kind uses. One message to the synth worker per gesture is enough. Both transposition sliders do the same; Transpose full re-lays-out the whole score.
- The render-select toggle shows no words on the row — there is no room for them — so it gets a tooltip too, telling its state: `Shown in the score` / `Hidden from the score`. It is a `TransportToggle` like solo and mute, so the 44 px button IS the tooltip trigger and it already opens on hover and on focus; its accessible name is `Render {name}`.
- The expand control is an icon `Button` (`size="icon"`, `size-11`) with `aria-expanded={expanded}`, `aria-controls` pointing at the disclosure panel's id, an `aria-label` of `More controls for ${name}`, and its own always-present tooltip (`Show more controls` / `Hide more controls`) — `TooltipTrigger render={<Button … />}`, the shape `PlayerShell`'s Play button already uses.
- Each per-staff display toggle is a `TransportToggle` at `size-11`, on the always-visible primary row — not a `Checkbox`, and not behind the disclosure. `aria-pressed` carries the state and the always-present tooltip names the staff and the state.
- The primary row renders per staff: a toggle for `showStandardNotation`, one for `showSlash`, one for `showNumbered`, and one for `showTablature` **only when `staff.tablatureAvailable`**.
- Below the staff toggles, two `Slider`s with distinct names — "Transpose audio" and "Transpose full" — each `min={-12} max={12} step={1}`, wired to their own callbacks. They are separate controls in the fork and must stay separate; fusing them drops the notation-transposing path entirely.
- Every control's hit area is at least 44 px. Task 9 measures it in the browser.

Add this comment above the volume slider, because it is the behaviour a future reader will otherwise file as a bug:

```tsx
{
  /* 0-16 is playbackInfo.volume's own scale. The caller divides by 16, because
            changeTrackVolume takes an ABSOLUTE channel level on that same scale — not a ratio
            against the file's level, which would sit about a third hot from the start. Note the coupling v0 accepts: AlphaTab applies volume, solo
            AND mute to the track's primary and secondary MIDI CHANNELS, not to the track, so
            tracks sharing a channel move together. Punk.gp's two drum tracks are both on channel
            9: their volume sliders are not independent, and muting or soloing one does the same
            to the other while this row's own button still shows only what was pressed on it.
            That is expected, not a defect. */
}
```

Then create `client/src/components/ui/MasterRow/MasterRow.tsx`. It adds no primitive `TrackRow` does not already use:

- The props extend `Omit<ComponentProps<'div'>, 'children'>` and the root spreads `...rest`, so Task 7's `data-testid` lands on it. `data-slot="master-row"`.
- One flex line: a label reading **Master**, a `Slider` named `Master volume` with `min={0} max={16} step={1}` reporting through **`onCommit`** (the same drag-then-commit shape the track volume uses), then the two select-all `Checkbox`es named `Solo all` and `Mute all`.
- Each master box is a plain `Checkbox` with `checked` and `indeterminate` passed straight through, reporting through `onCheckedChange`. **Add no direction rule of your own**: Base UI puts `aria-checked="mixed"` on an indeterminate box and reports the hidden input's value after the click, so a mixed or unticked box already reports `true` and a ticked box `false` — the browser's own select-all behaviour, and the only behaviour this row has (maintainer, 2026-09-22).
- The row never inspects the tracks and holds no state: `soloAll` / `muteAll` and their `…Indeterminate` twins are computed by the caller, which also writes the reported value onto every track through its own per-row handler. A master box is a shortcut for pressing every row's button, never a second owner of the value.
- Each `Checkbox` sits **inside** its `<label>`, and that label is at least 44 × 44 (`min-h-11 min-w-11`): the box is 16 px and is never the hit target on its own — the same construction `SettingRow`'s toggle kind uses.
- `soloMuteUnavailable` sets `disabled` on both boxes and becomes their tooltip text. It never touches the volume `Slider` — master volume is live during a recording, which is the whole reason the flag is not called `mixUnavailable`.
- Every hit area is at least 44 px, same as `TrackRow`. Task 9 measures it in the browser.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TrackRow src/components/ui/MasterRow`
Expected: PASS — 13 `TrackRow` tests and 5 `MasterRow` tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`TrackRow.story-ids.ts`: `['collapsed', 'expanded', 'stringed-expanded', 'muted', 'soloed', 'recording']`. The `stringed-expanded` story is what proves the tablature toggle renders for a tuned staff, so it earns its own baseline; `recording` is the expanded row with `mixUnavailable` set, so the disabled look of all four controls has a baseline in both themes (VR `statesForStory`: `['resting', 'focus']` — a disabled toggle still takes focus, and that is the state its tooltip opens in). `storyPrefix: 'ui-trackrow'`, `snapshotSlug: 'trackrow'`, `slotSelector: '[data-slot="track-row"]'`, `iconFontStory: () => true`, a `w-[30rem]` decorator.

`MasterRow.story-ids.ts`: `['resting', 'mixed', 'ticked', 'recording']` — `mixed` is the row with both `…Indeterminate` flags set, because the indeterminate dash is the one master state that is easy to draw wrong and impossible to catch in a unit test; `ticked` is both boxes checked; `recording` is the row with `soloMuteUnavailable` set, so the disabled look of solo-all and mute-all has a baseline in both themes. `storyPrefix: 'ui-masterrow'`, `snapshotSlug: 'masterrow'`, `slotSelector: '[data-slot="master-row"]'`, `iconFontStory: () => true`, a `w-[30rem]` decorator.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "TrackRow|MasterRow"
open -a Docker
pnpm test:vr:docker:update
pnpm test:vr:docker
```

Expected: a11y PASS; only new `trackrow-*-linux.png` and `masterrow-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/TrackRow client/src/components/ui/MasterRow
git commit -m "feat(client): add the TrackRow with its disclosure and the MasterRow (NH-291)"
```

---

### Task 4: The settings schema and its accessors

The schema is what keeps a value edited in two places — the header tempo control and the Player group, say — in sync. It lives in `web/` because that is where the AlphaTab namespace exists.

Every row names its **`source`**, because the fork's panel holds four kinds of row and only one of them is a setting:

| `source`     | What it is                                                        | How it is written                                                                                                             |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `settings`   | A key in AlphaTab's settings JSON — almost every row              | Into the app's JSON, then through the funnel: `fillFromJson`, `updateSettings()`, `render()` when the row asks for it         |
| `api`        | An `AlphaTabApi` property — `playbackSpeed` and its neighbours    | By `PlayerShell`'s single writer for that value. Never through the JSON: `fillFromJson` ignores it without a word             |
| `stylesheet` | A property of `api.score.stylesheet` — the whole Stylesheet group | Onto the open score's model, then redrawn through `queueRender`. Belongs to the score, re-read on `scoreLoaded`, never stored |
| `action`     | A command — the Export group's two exports                        | It runs; there is no value                                                                                                    |

An `api`, `stylesheet` or `action` row is still a **schema row**, not a special case in the popover's JSX. v0.1's search is "a flat projection of the per-row accessor schema v0 already builds" and indexes the speed row "like every other row" (v0.1 spec §3 and §8), so a row that lived outside the schema would be a row search could never find.

**Files:**

- Create: `web/lib/alphatab/settings-paths.ts`, `web/lib/alphatab/settings-paths.test.ts`
- Create: `web/lib/alphatab/settings-schema.ts`, `web/lib/alphatab/settings-defaults.test.ts`
- Create: `web/lib/alphatab/live-settings.ts`
- Modify: `client/src/index.ts`, `client/src/components/ui/Popover/Popover.tsx`, `client/src/components/ui/ScrollArea/ScrollArea.tsx`

**Interfaces:**

- Consumes: `AlphaTabEngine` (Plan A); `SettingControl` (Task 2).
- Produces:

```ts
/** The persisted edit state: a partial of AlphaTab's own SettingsJson shape. */
export type PlayerSettingsJson = Record<string, unknown>;

/** The AlphaTabApi properties the Player group edits. PlayerShell owns a single writer for each. */
export type ApiValueKey =
  | 'playbackSpeed'
  | 'masterVolume'
  | 'metronomeVolume'
  | 'countInVolume'
  | 'isLooping';

export type SettingAction = 'export-midi' | 'export-guitar-pro';

/**
 * How a settings row takes effect. 'render' pushes the settings and redraws. 'settings' pushes
 * only — the player-side rows that change nothing drawn. 'midi' regenerates the MIDI, which is the
 * ONLY thing that makes the vibrato, slide, song-book and triplet-feel rows audible.
 */
export type SettingApply = 'render' | 'settings' | 'midi';

/**
 * The score-stylesheet properties the Stylesheet group edits. AlphaTab's runtime type is
 * `RenderStylesheet` and it is NOT exported (there is no `AlphaTab.model.Stylesheet`), which is why
 * this union is hand-written. 'multiBarRests' is a composite this app defines: one toggle that writes
 * `multiTrackMultiBarRest`, and sets `perTrackMultiBarRest` to every track's index when on, null when off.
 */
export type StylesheetKey =
  | 'hideDynamics'
  | 'bracketExtendMode'
  | 'useSystemSignSeparator'
  | 'globalDisplayTuning'
  | 'globalDisplayChordDiagramsOnTop'
  | 'singleTrackTrackNamePolicy'
  | 'multiTrackTrackNamePolicy'
  | 'firstSystemTrackNameMode'
  | 'firstSystemTrackNameOrientation'
  | 'otherSystemsTrackNameMode'
  | 'otherSystemsTrackNameOrientation'
  | 'multiBarRests';

interface SettingRowBase {
  /** Unique across ALL eight groups — it becomes a DOM id. */
  id: string;
  label: string;
  control: SettingControl;
  /** Rendered under the label by `SettingRow`'s `FieldDescription`. Every `stylesheet` row carries
   *  one, because those twelve are the exception to the panel's "survives a reload" promise. */
  description?: string;
}

export type SettingDescriptor =
  | (SettingRowBase & {
      source: 'settings';
      /** Dot path into the settings JSON, e.g. 'display.scale' — or 'display.padding.0' for an array. */
      path: string;
      apply: SettingApply;
    })
  | (SettingRowBase & { source: 'api'; key: ApiValueKey })
  | (SettingRowBase & { source: 'stylesheet'; key: StylesheetKey })
  | (SettingRowBase & { source: 'action'; action: SettingAction });

export interface SettingGroup {
  id: string;
  title: string;
  settings: SettingDescriptor[];
}

export function buildSettingGroups(engine: AlphaTabEngine): SettingGroup[];
export function readSettingValue(json: PlayerSettingsJson, path: string): SettingValue | undefined;
export function writeSettingValue(
  json: PlayerSettingsJson,
  path: string,
  value: SettingValue,
): PlayerSettingsJson;
export const DEFAULT_PLAYER_SETTINGS: PlayerSettingsJson;
/**
 * Every option-bearing row's allowed VALUES, by dot-path. Task 6 gates the stored document on it
 * before the restore push: an enum name AlphaTab does not know does not fail, it WIPES the key.
 *
 * A PLAIN module constant of enum NAMES as string literals — it cannot be built from
 * buildSettingGroups(engine), because PlayerShell reads it in a lazy useState initialiser on its
 * FIRST render, when the engine context is still { engine: null } (it resolves the dynamic import
 * inside an effect). Names are strings, so this touches no runtime AlphaTab value and stays inside
 * the type-imports-only fence. Drift is caught by a case in settings-defaults.test.ts, not by
 * sharing the descriptors: it asserts this map equals every option list buildSettingGroups(engine)
 * produces, so a row and its option list still cannot separate.
 */
export const SETTING_OPTION_VALUES: Readonly<Record<string, readonly string[]>>;

// live-settings.ts — every write to the live engine's settings, tracks and staves.
export function applySettingsJson(
  api: AlphaTabApi,
  json: PlayerSettingsJson,
  apply: SettingApply,
): void;
export function readStylesheetValues(
  score: Score,
  enumName: (key: StylesheetKey, value: number) => string,
): Record<StylesheetKey, SettingValue>;
export function setStylesheetValue(
  api: AlphaTabApi,
  key: StylesheetKey,
  value: boolean | number,
): void;
export function setTrackTransposition(
  api: AlphaTabApi,
  trackIndex: number,
  semitones: number,
): void;
export function clearTrackTranspositions(api: AlphaTabApi): void;
export type StaffDisplayKey =
  | 'showStandardNotation'
  | 'showSlash'
  | 'showNumbered'
  | 'showTablature';
export function setStaffDisplay(
  api: AlphaTabApi,
  trackIndex: number,
  staffIndex: number,
  key: StaffDisplayKey,
  next: boolean,
): void;
```

Tasks 5, 6 and 7 consume all of it.

- [ ] **Step 1: Read the fork, with the row inventory beside you**

Open the reference panel and work through it:

```bash
sed -n '266,760p' /Users/leocaseiro/Sites/alphaTabWebsite/src/components/AlphaTabRhythmGame/playground-settings.tsx
```

It defines seven groups plus a separate Export block. **The Settings popover ships every row of it** — the maintainer's decision (2026-09-20): _"we should be able to change every single setting from alphatab."_ The inventory below is the complete list, taken from the fork on 2026-09-20 and keyed by **AlphaTab's own setting names** — which are facts about the library's API, not the fork's expression, so listing them copies nothing. A row missing from the build is a defect, not a deferral. **The labels are yours to write**: do not reuse the fork's strings, and do not borrow strings from any reference product.

| Group              | Rows | `source`     | Keys                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ---- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player             | 5    | `api`        | `masterVolume`, `metronomeVolume`, `countInVolume`, `playbackSpeed`, `isLooping`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Player             | 8    | `settings`   | apply `settings` (nothing is redrawn): `player.playerMode` (Task 8), `player.enableCursor`, `player.enableAnimatedBeatCursor`, `player.enableElementHighlighting`, `player.enableUserInteraction`, `player.scrollOffsetX`, `player.scrollOffsetY`, `player.scrollMode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Player             | 14   | `settings`   | apply **`midi`**: `player.songBookBendDuration`, `player.songBookDipDuration`; `player.vibrato.` + `noteWideLength`, `noteWideAmplitude`, `noteSlightLength`, `noteSlightAmplitude`, `beatWideLength`, `beatWideAmplitude`, `beatSlightLength`, `beatSlightAmplitude`; `player.slide.` + `simpleSlidePitchOffset`, **`simpleSlideDurationRatio`**, `shiftSlideDurationRatio`; `player.playTripletFeel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Display ▸ General  | 9    | `settings`   | `core.engine` (`svg` / `html5` — a two-option select), `display.scale`, `display.stretchForce`, `display.layoutMode`, `display.barsPerRow` (−1 = automatic), `display.startBar`, `display.barCount` (−1 = all), `display.justifyLastSystem`, `display.systemsLayoutMode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Display ▸ Colors   | 6    | `settings`   | `display.resources.` + `staffLineColor`, `barSeparatorColor`, `barNumberColor`, `mainGlyphColor`, `secondaryGlyphColor`, `scoreInfoColor` — **`color` rows, not `text`** (a half-typed hex parses to a null `Color` that the renderer throws on; the reference panel uses a swatch picker for the same reason)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Display ▸ Fonts    | 12   | `settings`   | `display.resources.elementFonts.` + `ScoreCopyright`, `ScoreTitle`, `ScoreSubTitle`, `ScoreWords`, `EffectBeatTimer`, `EffectDirections`, `ChordDiagramFretboardNumbers`, `EffectMarker`, `BarNumber`; then `display.resources.` + `numberedNotationFont`, `tablatureFont`, `graceFont` — `text` rows holding a CSS font string (`bold 12px Georgia`), which `Font.fromJson` parses. **Not the fork's property names.** Nine of the fork's font rows write to deprecated aliases (`titleFont`, `markerFont`, …) that have **no case** in 1.8.4's `RenderingResourcesSerializer` (`alphaTab.core.mjs:29464-29508`), so a row bound to one moves and changes nothing — verified by running `fillFromJson` against a real `Settings()`: 11 of 14 were silent no-ops. `elementFonts` is the only font route the JSON serializer implements. `effectFont` and `inlineFingeringFont` are **dropped**: they are `@json_ignore` and unread by the renderer, so no write path makes them do anything |
| Display ▸ Paddings | 15   | `settings`   | `display.padding.0` (horizontal) and `display.padding.1` (vertical) — **an array**; then `display.` + `firstSystemPaddingTop`, `systemPaddingTop`, `lastSystemPaddingBottom`, `systemPaddingBottom`, `systemLabelPaddingLeft`, `systemLabelPaddingRight`, `accoladeBarPaddingRight`, `notationStaffPaddingTop`, `notationStaffPaddingBottom`, `effectStaffPaddingTop`, `effectStaffPaddingBottom`, `firstStaffPaddingLeft`, `staffPaddingLeft`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Notation           | 7    | `settings`   | `notation.` + `fingeringMode`, `rhythmMode`, `rhythmHeight`, `smallGraceTabNotes`, `extendBendArrowsOnTiedNotes`, `extendLineEffectsToBeatEnd`, `slurHeight`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Stylesheet         | 12   | `stylesheet` | `hideDynamics`, `bracketExtendMode`, `useSystemSignSeparator`, `globalDisplayTuning`, `globalDisplayChordDiagramsOnTop`, `singleTrackTrackNamePolicy`, `multiTrackTrackNamePolicy`, `firstSystemTrackNameMode`, `firstSystemTrackNameOrientation`, `otherSystemsTrackNameMode`, `otherSystemsTrackNameOrientation`, and the multi-bar-rest toggle (`multiTrackMultiBarRest`, which also sets `perTrackMultiBarRest` to every track's index when on and to `null` when off)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Export             | 2    | `action`     | Export MIDI (`api.downloadMidi()`), Export Guitar Pro (the namespace's `exporter.Gp7Exporter`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

**90 rows: 71 `settings`, 5 `api`, 12 `stylesheet`, 2 `action`.** The fork shows 93, because its Stylesheet group binds `otherSystemsTrackNameOrientation` twice — a copy-and-paste slip, with the real multi-bar-rest row straight after it. Its "simple slide duration ratio" row has the same kind of slip: it is bound to `simpleSlidePitchOffset`, the row above it. The inventory carries the right key, `player.slide.simpleSlideDurationRatio` (`alphaTab.d.ts:15408`). Two of the fork's fourteen font rows are dropped (see the Fonts row above), which is why this is 90 and not 92. The fork also regenerates the MIDI for twelve of the fourteen `midi` rows and forgets `beatWideLength` and `simpleSlidePitchOffset`; all fourteen shape the generated MIDI, so all fourteen regenerate it here.

**The groups stay exactly these** — v0.1 is search plus tabs over rows that already exist, not a re-grouping.

Four things the fork's panel does that a careless port gets wrong — each checked by reading it:

1. **Five of the Player group's 27 rows are `AlphaTabApi` properties, not settings.** They are `source: 'api'` rows. Give one a `path` instead and its slider moves, its number updates, and nothing audible changes. Three of them — metronome volume, count-in volume, loop — are **also** on Plan B's transport row as on/off buttons. Same value, second editor: `PlayerShell`'s `metronome` and `countIn` state becomes a **volume** (a number, 0-1), the transport button reads `> 0` and writes `1` or `0`, and the row writes any level between (Task 5).
2. **The whole Stylesheet group writes to `api.score.stylesheet`, not to the settings.** `source: 'stylesheet'`. Its values belong to the open score: they are re-read on every `scoreLoaded`, and they are never stored.
3. **Fourteen Player rows do nothing until the MIDI is regenerated** — `apply: 'midi'`.
4. **The Export block is two commands**, not settings. The v0.1 spec's row grammar already names them as its two "Action" rows (§4).

- [ ] **Step 2: Write the failing test for the path helpers**

The schema itself is data, but the two path helpers are logic and they are where a silent settings corruption would start. Create `web/lib/alphatab/settings-paths.test.ts`, beside the module it covers:

```ts
import { describe, expect, it } from 'vitest';

import { readSettingValue, writeSettingValue } from './settings-paths';

describe('readSettingValue', () => {
  it('reads a nested value by dot path', () => {
    expect(readSettingValue({ display: { scale: 1.4 } }, 'display.scale')).toBe(1.4);
  });

  it('returns undefined for a missing path instead of throwing', () => {
    expect(readSettingValue({}, 'display.scale')).toBeUndefined();
    expect(readSettingValue({ display: {} }, 'display.resources.staffLineColor')).toBeUndefined();
  });
});

describe('writeSettingValue', () => {
  it('writes a nested value without mutating the input', () => {
    const before = { display: { scale: 1 } };
    const after = writeSettingValue(before, 'display.scale', 2);

    expect(readSettingValue(after, 'display.scale')).toBe(2);
    // The original must not be mutated: React state holds it.
    expect(before.display.scale).toBe(1);
  });

  it('creates missing intermediate objects', () => {
    const after = writeSettingValue({}, 'display.resources.staffLineColor', '#2DD4BF');
    expect(readSettingValue(after, 'display.resources.staffLineColor')).toBe('#2DD4BF');
  });

  it('leaves sibling keys intact', () => {
    const after = writeSettingValue({ display: { scale: 1, stretchForce: 1 } }, 'display.scale', 2);
    expect(readSettingValue(after, 'display.stretchForce')).toBe(1);
  });

  // display.padding is [horizontal, vertical]. Spreading an array into an object literal yields
  // { 0: …, 1: … }, which fillFromJson does not read as a padding at all.
  it('reads and writes an array element, and the array stays an array', () => {
    const before = { display: { padding: [35, 35] } };
    expect(readSettingValue(before, 'display.padding.1')).toBe(35);

    const after = writeSettingValue(before, 'display.padding.1', 10);
    expect((after.display as { padding: unknown }).padding).toEqual([35, 10]);
    expect(before.display.padding).toEqual([35, 35]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/settings-paths`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the path helpers**

Create `web/lib/alphatab/settings-paths.ts`:

```ts
import type { SettingValue } from '@notation-hero/client';

export type PlayerSettingsJson = Record<string, unknown>;

/** A plain object OR an array: both are walked by key, and an array's keys are its indexes. */
const isContainer = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

/**
 * Dot-path read over the settings JSON. Returns undefined for a path that is not there, and for
 * one that lands on a container rather than a value. An array element is addressed by its index:
 * 'display.padding.0'.
 */
export function readSettingValue(json: PlayerSettingsJson, path: string): SettingValue | undefined {
  let current: unknown = json;
  for (const part of path.split('.')) {
    if (!isContainer(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? current
    : undefined;
}

function writeInto(container: unknown, parts: readonly string[], value: SettingValue): unknown {
  const [head, ...rest] = parts;
  if (head === undefined) return value;
  // An array must STAY an array: spreading it into an object literal would turn [35, 35] into
  // { 0: 35, 1: 35 }, which AlphaTab does not read as a padding at all.
  if (Array.isArray(container)) {
    const copy = [...(container as unknown[])];
    copy[Number(head)] = writeInto(copy[Number(head)], rest, value);
    return copy;
  }
  const base = isContainer(container) ? container : {};
  return { ...base, [head]: writeInto(base[head], rest, value) };
}

/**
 * Dot-path write. Immutable: React state holds this object, and mutating it in place would leave
 * the popover showing a stale value while the engine had the new one.
 */
export function writeSettingValue(
  json: PlayerSettingsJson,
  path: string,
  value: SettingValue,
): PlayerSettingsJson {
  return writeInto(json, path.split('.'), value) as PlayerSettingsJson;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/settings-paths`
Expected: PASS — 6 tests.

- [ ] **Step 6: Write the schema**

Create `web/lib/alphatab/settings-schema.ts`. It takes the engine so it can turn an AlphaTab enum into plain `{ value, label }` pairs before handing them to a `client/` row:

```ts
import type { SettingControl } from '@notation-hero/client';

import type { AlphaTabEngine } from './engine';
import type { PlayerSettingsJson } from './settings-paths';

export { readSettingValue, writeSettingValue } from './settings-paths';
export type { PlayerSettingsJson } from './settings-paths';

/** The AlphaTabApi properties the Player group edits. PlayerShell owns a single writer for each. */
export type ApiValueKey =
  | 'playbackSpeed'
  | 'masterVolume'
  | 'metronomeVolume'
  | 'countInVolume'
  | 'isLooping';

export type SettingAction = 'export-midi' | 'export-guitar-pro';

/**
 * How a settings row takes effect. 'render' pushes the settings and redraws. 'settings' pushes
 * only — the player-side rows that change nothing drawn. 'midi' regenerates the MIDI, which is the
 * ONLY thing that makes the vibrato, slide, song-book and triplet-feel rows audible.
 */
export type SettingApply = 'render' | 'settings' | 'midi';

/**
 * The score-stylesheet properties the Stylesheet group edits. AlphaTab's runtime type is
 * `RenderStylesheet` and it is NOT exported (there is no `AlphaTab.model.Stylesheet`), which is why
 * this union is hand-written. 'multiBarRests' is a composite this app defines: one toggle that writes
 * `multiTrackMultiBarRest`, and sets `perTrackMultiBarRest` to every track's index when on, null when off.
 */
export type StylesheetKey =
  | 'hideDynamics'
  | 'bracketExtendMode'
  | 'useSystemSignSeparator'
  | 'globalDisplayTuning'
  | 'globalDisplayChordDiagramsOnTop'
  | 'singleTrackTrackNamePolicy'
  | 'multiTrackTrackNamePolicy'
  | 'firstSystemTrackNameMode'
  | 'firstSystemTrackNameOrientation'
  | 'otherSystemsTrackNameMode'
  | 'otherSystemsTrackNameOrientation'
  | 'multiBarRests';

interface SettingRowBase {
  /** Unique across ALL eight groups — it becomes a DOM id, and axe fails a duplicate. */
  id: string;
  label: string;
  control: SettingControl;
  /** Rendered under the label by `SettingRow`'s `FieldDescription`. Every `stylesheet` row carries
   *  one, because those twelve are the exception to the panel's "survives a reload" promise. */
  description?: string;
}

export type SettingDescriptor =
  | (SettingRowBase & {
      source: 'settings';
      /** Dot path into the settings JSON, e.g. 'display.scale' — or 'display.padding.0' for an array. */
      path: string;
      apply: SettingApply;
    })
  // An AlphaTabApi PROPERTY, not a settings key. It must never get a `path`: fillFromJson ignores
  // a key it does not know, so the row would move and nothing would change.
  | (SettingRowBase & { source: 'api'; key: ApiValueKey })
  // A property of the OPEN SCORE's stylesheet, on the score model. Not in the settings JSON
  // either, and never stored: a new score brings its own.
  | (SettingRowBase & { source: 'stylesheet'; key: StylesheetKey })
  | (SettingRowBase & { source: 'action'; action: SettingAction });

export interface SettingGroup {
  id: string;
  title: string;
  settings: SettingDescriptor[];
}

/** The twelve Stylesheet rows are the open score's own values, not settings — say so on each row. */
const STYLESHEET_NOTE =
  'Belongs to the score that is open. Another score brings its own, and this is never saved.';

/**
 * Turns an AlphaTab enum object into the plain option array a client/ row takes.
 *
 * TypeScript's numeric enums are bidirectional, so Object.keys yields both the names and the
 * numbers; keeping only the non-numeric keys drops the reverse half.
 *
 * The option VALUE is the enum's NAME, not its number. fillFromJson reads an enum from either
 * (case-insensitively, for a name), and a name keeps the stored JSON readable and lets the shipped
 * defaults below be a module constant — a number would need the runtime enum, which no module-scope
 * constant may touch.
 */
function enumOptions(
  enumObject: Record<string, string | number>,
): { value: string; label: string }[] {
  return Object.keys(enumObject)
    .filter((key) => Number.isNaN(Number(key)))
    .map((key) => ({ value: key, label: key }));
}

/**
 * The eight groups, in the order the popover shows them. They stay exactly these: v0.1 layers
 * search and tabs over the same rows, so a re-grouping now would be re-done then.
 *
 * Built from the engine rather than as a module constant, because every enum here is a RUNTIME
 * AlphaTab value and no module-scope constant may reference one — that needs the value import the
 * ESLint guard forbids.
 */
export function buildSettingGroups(engine: AlphaTabEngine): SettingGroup[] {
  return [
    {
      id: 'player',
      title: 'Player',
      settings: [
        // First in the group: it is the control a drummer reaches for most. A PERCENTAGE, not the
        // raw multiplier — the header's BPM stepper leaves the multiplier at values like 0.8916…,
        // which nobody can read in a number field. The shell converts at its own boundary. The
        // range is the engine's own clamp (0.125-8), the same one the header's tempo control uses.
        {
          id: 'player-speed',
          source: 'api',
          key: 'playbackSpeed',
          label: 'Playback speed (%)',
          control: { kind: 'range', min: 12.5, max: 800, step: 0.5 },
        },
        {
          id: 'player-master-volume',
          source: 'api',
          key: 'masterVolume',
          label: 'Master volume',
          control: { kind: 'range', min: 0, max: 1, step: 0.05 },
        },
        {
          id: 'player-show-cursor',
          source: 'settings',
          label: 'Show the playback cursor',
          path: 'player.enableCursor',
          control: { kind: 'toggle' },
          // Nothing is redrawn: the cursor is the player's, not the score's.
          apply: 'settings',
        },
        {
          id: 'player-metronome-volume',
          source: 'api',
          key: 'metronomeVolume',
          label: 'Metronome volume',
          control: { kind: 'range', min: 0, max: 1, step: 0.05 },
          // This row and the count-in-volume row beside it disable on `mixUnavailable` while the
          // file plays its own recording — the same rule, and the same reason string, as the
          // transport's Metronome and Count-In buttons. They are the only two Player rows that do.
        },
        {
          id: 'player-loop',
          source: 'api',
          key: 'isLooping',
          label: 'Loop',
          control: { kind: 'toggle' },
        },
        {
          id: 'player-vibrato-note-wide-length',
          source: 'settings',
          label: 'Wide note vibrato: length',
          path: 'player.vibrato.noteWideLength',
          control: { kind: 'number', min: 0 },
          // Read when the MIDI is BUILT, and only then. 'render' here would be a silent no-op.
          apply: 'midi',
        },
        // …the remaining Player rows — twenty-seven in all. `player.playerMode` has its own task.
      ],
    },
    {
      id: 'display-general',
      title: 'Display: general',
      settings: [
        {
          id: 'display-scale',
          source: 'settings',
          label: 'Zoom',
          path: 'display.scale',
          control: { kind: 'range', min: 0.25, max: 3, step: 0.05 },
          apply: 'render',
        },
        {
          id: 'display-layout-mode',
          source: 'settings',
          label: 'Layout',
          path: 'display.layoutMode',
          control: { kind: 'select', options: enumOptions(engine.LayoutMode) },
          apply: 'render',
        },
        // …the remaining seven rows of this group — nine in all.
      ],
    },
    // …Display: colours, Display: fonts, Display: paddings, Notation.
    {
      id: 'stylesheet',
      title: 'Stylesheet',
      settings: [
        // Every row in this group is exempt from the panel's "survives a reload" promise, and the
        // exemption has to be ON SCREEN: someone who turns one on and opens the next chart finds it
        // back off, with nothing to distinguish that from a bug. One sentence, the same on all
        // twelve — they are all the open score's own value.
        {
          id: 'stylesheet-hide-dynamics',
          source: 'stylesheet',
          key: 'hideDynamics',
          label: 'Hide dynamics',
          description: STYLESHEET_NOTE,
          control: { kind: 'toggle' },
        },
        {
          id: 'stylesheet-bracket-extend',
          source: 'stylesheet',
          key: 'bracketExtendMode',
          label: 'Brackets and braces',
          description: STYLESHEET_NOTE,
          control: { kind: 'select', options: enumOptions(engine.model.BracketExtendMode) },
        },
        // …the remaining ten Stylesheet rows — twelve in all.
      ],
    },
    {
      id: 'export',
      title: 'Export',
      settings: [
        {
          id: 'export-midi-row',
          source: 'action',
          action: 'export-midi',
          label: 'MIDI file',
          control: { kind: 'action', actionLabel: 'Export MIDI' },
        },
        {
          id: 'export-guitar-pro-row',
          source: 'action',
          action: 'export-guitar-pro',
          label: 'Guitar Pro file',
          control: { kind: 'action', actionLabel: 'Export Guitar Pro' },
        },
      ],
    },
  ];
}

/**
 * The values the app ships with, for every `settings` row. This is the fallback a corrupt stored
 * value is merged against, so a key missing from it can never be restored — and it is what the
 * FIRST edit pushes into the engine, whole, so every value here must be the one the player really
 * starts with: AlphaTab's own default, or what the player's settings callback sets.
 *
 * Enums are written by NAME — see enumOptions.
 */
export const DEFAULT_PLAYER_SETTINGS: PlayerSettingsJson = {
  core: { engine: 'svg' },
  // padding is an ARRAY — [horizontal, vertical] — and must stay one.
  display: { scale: 1, layoutMode: 'Page', padding: [35, 35] },
  player: {
    // All four are set by the player at construction. Only TWO of them differ from a fresh
    // Settings() — playerMode (engine default Disabled) and scrollOffsetY (engine default 0); those
    // two are the ones settings-defaults.test.ts skips. enableCursor (true) and scrollMode
    // (Continuous) happen to equal the engine's own defaults and stay under the guard.
    playerMode: 'EnabledAutomatic',
    enableCursor: true,
    scrollMode: 'Continuous',
    scrollOffsetY: -10,
  },
  // …one entry per `settings` row, matching its path.
};
```

**Fill in every row before moving on.** The rows shown are the pattern; the list comes from Step 1's reading, and a group left as a comment is an unfinished task, not a deferral. Cross-check as you go: every `source: 'settings'` row's `path` must have a matching entry in `DEFAULT_PLAYER_SETTINGS`, every entry there must correspond to a row, and no `api`, `stylesheet` or `action` row has an entry at all. Count the rows against Step 1's inventory when you finish: 71, 5, 12 and 2.

**Get each default from the engine, not from memory — and do not transcribe them by hand.** A wrong default here silently changes the score on the first edit of an unrelated row, because the whole JSON is pushed each time. Ship the values, then assert them in a co-located `settings-defaults.test.ts` against the engine's own serializer, so the table fails the day AlphaTab's defaults move under a version bump rather than drifting unnoticed:

```ts
import * as engine from '@coderline/alphatab';
import { expect, it } from 'vitest';

import { DEFAULT_PLAYER_SETTINGS, SETTING_ENUMS } from './settings-schema';
import { readSettingValue } from './settings-paths';

// The engine is the source of truth for every default, but the serializer does not hand back the
// shape `readSettingValue` walks. THREE conversions stand between them:
//  1. settingsToJsObject returns nested Maps (SettingsSerializer.toJson), and `part in current` —
//     how readSettingValue steps a path — never sees a Map entry, so every path would miss on its
//     first segment. Convert the Map tree to plain objects first.
//  2. Every key comes back LOWERCASED ('scrolloffsety', 'playermode'), so lowercase each segment.
//  3. Enums come back as NUMBERS; the shipped table stores their NAMES. Resolve the name.
// Colours come back as PACKED SIGNED INTEGERS (-16777216), not '#000000', so a colour row is read
// through `.rgba` on the live Settings instead. The converter is on `model`; the `json` namespace
// is empty at runtime.
const plain = (value: unknown): unknown =>
  value instanceof Map ? Object.fromEntries([...value].map(([k, v]) => [k, plain(v)])) : value;

// Set by the player at construction or by this app's own choice, so they are NOT what a fresh
// Settings() reports and never can be. Every OTHER key stays under the guard — including
// player.enableCursor (engine default true) and player.scrollMode (engine default Continuous),
// which DO match and would be silently un-checked if this list were widened to all four.
const NOT_ALPHATAB_DEFAULTS = new Set([
  'core.engine', // engine default 'default'; this app ships the SVG renderer
  'player.playerMode', // engine default Disabled; PlayerShell sets EnabledAutomatic
  'player.scrollOffsetY', // engine default 0; PlayerShell sets -10
]);

it('every shipped default is what a fresh Settings() reports', () => {
  const fresh = new engine.Settings();
  const serialised = plain(engine.model.JsonConverter.settingsToJsObject(fresh));

  for (const [path, shipped] of eachLeaf(DEFAULT_PLAYER_SETTINGS)) {
    if (NOT_ALPHATAB_DEFAULTS.has(path)) continue;
    const actual = readSettingValue(serialised, path.toLowerCase());
    // An enum row ships its NAME; the serializer reports the number.
    const expected = SETTING_ENUMS[path]?.[shipped as string] ?? shipped;
    expect(actual, path).toEqual(expected);
  }
});
```

`new engine.Settings()` in the browser console (`$0.at.settings` on the notation box is the live one) is still the quick way to eyeball a single key while writing the table.

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/settings-defaults`
Expected: PASS — every shipped default equals what a fresh `Settings()` reports. A failure here is
the engine's defaults having moved, not the test being wrong: take the engine's value.

- [ ] **Step 7: Write the live-settings funnel**

Create `web/lib/alphatab/live-settings.ts`. Every write to a live engine object goes through this file — React's compiler lint rejects such a write inside a component — and it holds the only `api.updateSettings()` call in the app:

```ts
import type { PlayerSettingsJson } from './settings-paths';
import type { SettingApply, StylesheetKey } from './settings-schema';
import type * as AlphaTab from '@coderline/alphatab';
import type { SettingValue } from '@notation-hero/client';

/**
 * The ONE place the live engine's settings change: write, push to the workers, redraw when asked.
 *
 * These live here, not in a component, for the same reason setAlphaTabValue does: the api reaches
 * components through useState, and the compiler lint treats anything reached through a hook as
 * immutable. It is right about React data and wrong about a handle to an engine outside React.
 */
function pushSettings(api: AlphaTab.AlphaTabApi, apply: SettingApply): void {
  // The rows that shape the GENERATED MIDI — vibrato, slides, song-book timings, triplet feel —
  // are read when the MIDI is built, and only then. Pushing the settings or redrawing the score
  // changes nothing audible; regenerating the MIDI does.
  //
  // This is the ONE path that interrupts the player: loadMidiForScore -> loadMidiFile -> stop(),
  // which pauses AND rewinds tickPosition to the start of the song or loop. It is deliberate and
  // unavoidable in 1.8.4 — do not try to restore the playhead here, and do not widen the "neither
  // popover blocks the player" promise to cover it.
  if (apply === 'midi') {
    api.loadMidiForScore();
    return;
  }
  api.updateSettings();
  if (apply === 'render') queueRender(api);
}

// ONE redraw per frame, not one per keystroke. A number row reports on every keystroke
// (`SettingRow`'s `onChange`), so typing "100" into Zoom asks for three full relayouts — and a
// relayout is the most expensive thing on this page, felt as a stutter while the player runs.
//
// It is render() that is worth coalescing, and ONLY render(). updateSettings() does the same fixed
// work whatever it is handed: backwards-compatibility, the pitch offsets (a loop over TRACKS, not
// over settings), one assignment into the renderer, and a player rebuild that early-returns unless
// `player.playerMode` itself changed — and it never redraws, because there is no render() inside it
// (AlphaTabApiBase.ts:549-563 and :1670-1708).
let renderQueued = false;
function queueRender(api: AlphaTab.AlphaTabApi): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    api.render();
  });
}

/**
 * fillFromJson, NEVER assignment. The JSON holds plain objects, but RenderingResources holds real
 * model.Color and model.Font instances, and a plain object assigned into the settings tree breaks
 * rendering WITHOUT throwing — the colour and font groups would silently stop working.
 */
export function applySettingsJson(
  api: AlphaTab.AlphaTabApi,
  json: PlayerSettingsJson,
  apply: SettingApply,
): void {
  api.settings.fillFromJson(json as AlphaTab.json.SettingsJson);
  pushSettings(api, apply);
}

/** Notation AND audio for one track. The other transposition — audio only — is an api method. */
export function setTrackTransposition(
  api: AlphaTab.AlphaTabApi,
  trackIndex: number,
  semitones: number,
): void {
  const pitches = [...api.settings.notation.transpositionPitches];
  pitches[trackIndex] = semitones;
  api.settings.notation.transpositionPitches = pitches;
  pushSettings(api, 'render');
}

/**
 * Call this BEFORE the new score reaches the engine — in the open-file path, ahead of
 * renderScore. The pitches are indexed by track and live on the api, so a +2 on one score's second
 * track would otherwise transpose the next score's second track. Clearing AFTER the load does not
 * work: applyPitchOffsets runs at the top of the engine's render path and has already stamped the
 * new score's staves, and its write is guarded by `i < transpositionPitches.length`, so an empty
 * array reaches no track and un-stamps nothing. Clearing first means the new score is never
 * stamped, which also preserves a transposition the FILE itself carries. No redraw: a new score is
 * about to be drawn anyway.
 */
export function clearTrackTranspositions(api: AlphaTab.AlphaTabApi): void {
  if (api.settings.notation.transpositionPitches.length === 0) return;
  api.settings.notation.transpositionPitches = [];
  pushSettings(api, 'settings');
}

/**
 * The Stylesheet group. These live on the SCORE's own stylesheet, not in the settings: a new score
 * brings its own, so the popover re-reads them on every scoreLoaded and nothing here is stored.
 * Enums are reported by NAME, like every other enum row.
 */
export function readStylesheetValues(
  score: AlphaTab.model.Score,
  enumName: (key: StylesheetKey, value: number) => string,
): Record<StylesheetKey, SettingValue> {
  const sheet = score.stylesheet;
  return {
    hideDynamics: sheet.hideDynamics,
    bracketExtendMode: enumName('bracketExtendMode', sheet.bracketExtendMode),
    useSystemSignSeparator: sheet.useSystemSignSeparator,
    globalDisplayTuning: sheet.globalDisplayTuning,
    globalDisplayChordDiagramsOnTop: sheet.globalDisplayChordDiagramsOnTop,
    singleTrackTrackNamePolicy: enumName(
      'singleTrackTrackNamePolicy',
      sheet.singleTrackTrackNamePolicy,
    ),
    multiTrackTrackNamePolicy: enumName(
      'multiTrackTrackNamePolicy',
      sheet.multiTrackTrackNamePolicy,
    ),
    firstSystemTrackNameMode: enumName('firstSystemTrackNameMode', sheet.firstSystemTrackNameMode),
    firstSystemTrackNameOrientation: enumName(
      'firstSystemTrackNameOrientation',
      sheet.firstSystemTrackNameOrientation,
    ),
    otherSystemsTrackNameMode: enumName(
      'otherSystemsTrackNameMode',
      sheet.otherSystemsTrackNameMode,
    ),
    otherSystemsTrackNameOrientation: enumName(
      'otherSystemsTrackNameOrientation',
      sheet.otherSystemsTrackNameOrientation,
    ),
    multiBarRests: sheet.multiTrackMultiBarRest,
  };
}

/**
 * `value` arrives already converted: a boolean, or the enum's NUMBER (the caller holds the
 * namespace and turns the row's name back into it — this file has no runtime AlphaTab).
 */
export function setStylesheetValue(
  api: AlphaTab.AlphaTabApi,
  key: StylesheetKey,
  value: boolean | number,
): void {
  const score = api.score;
  if (!score) return;
  if (key === 'multiBarRests') {
    // The one composite row: the flag alone draws nothing. AlphaTab also wants the set of tracks
    // it applies to — every track when on, none when off.
    const on = Boolean(value);
    score.stylesheet.multiTrackMultiBarRest = on;
    score.stylesheet.perTrackMultiBarRest = on
      ? new Set(score.tracks.map((track) => track.index))
      : null;
  } else {
    // One assignment for eleven keys: the row's control kind already guarantees the type.
    (score.stylesheet as unknown as Record<string, boolean | number>)[key] = value;
  }
  queueRender(api);
}

export type StaffDisplayKey =
  | 'showStandardNotation'
  | 'showSlash'
  | 'showNumbered'
  | 'showTablature';

/** A staff flag lives on the score model, not in the settings, so only a redraw is needed. */
export function setStaffDisplay(
  api: AlphaTab.AlphaTabApi,
  trackIndex: number,
  staffIndex: number,
  key: StaffDisplayKey,
  next: boolean,
): void {
  const staff = api.score?.tracks[trackIndex]?.staves[staffIndex];
  if (!staff) return;
  staff[key] = next;
  queueRender(api);
}
```

> The cast on `fillFromJson`'s argument names AlphaTab's own JSON type. If the installed 1.8.4 does not export it under `json.SettingsJson`, find the parameter type of `Settings.fillFromJson` in `alphaTab.d.ts` (line 15262) and use that name — never `as never`, which would also accept a wrong-shaped value.
>
> This file closes the fork-parity triage's finding F-C3 ("no `updateSettings()` funnel"), which was deferred to its first caller and is an item on [NH-302](https://leocaseiro.atlassian.net/browse/NH-302)'s checklist. Tick it when this step lands.

- [ ] **Step 8: Export the row components and the primitives the popovers need**

Append to `client/src/index.ts`, in the file's own voice — each block there says which screen pulled the components across:

```ts
// Pulled across by the v0 popovers:
// - Accordion holds the settings groups; SettingRow and TrackRow are the rows inside each popover.
// - Popover and ScrollArea are the two popover shells. Both were built for the catalog.
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './components/ui/Accordion/Accordion';
export { SettingRow } from './components/ui/SettingRow/SettingRow';
export type { SettingControl, SettingValue } from './components/ui/SettingRow/SettingRow';
export { TrackRow } from './components/ui/TrackRow/TrackRow';
export type { TrackStaffState } from './components/ui/TrackRow/TrackRow';
export { MasterRow } from './components/ui/MasterRow/MasterRow';
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from './components/ui/Popover/Popover';
export { ScrollArea } from './components/ui/ScrollArea/ScrollArea';
```

The export names above are the real ones (`Popover.tsx` and `ScrollArea.tsx` were read). Add `'use client'` as the first line of `Popover.tsx` and `ScrollArea.tsx` — neither has it, and the spec's rule (§7) is that a component gets it when the barrel starts exporting it. `Field`, `Checkbox`, `Input` and `NativeSelect` are **not** exported and need nothing: no `web/` screen imports them, and they are reached only through `SettingRow` and `TrackRow`, which are client components already. `Separator` is not exported either — nothing in this plan renders one. `Tooltip*` is already exported (Plan A).

Re-run the two components' own gates after the edit — the directive must not change a pixel:

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "Popover|ScrollArea"
pnpm test:vr:docker
```

- [ ] **Step 9: Verify the packages are clean**

```bash
pnpm --filter @notation-hero/client run lint
pnpm --filter @notation-hero/client run typecheck
pnpm --filter @notation-hero/web run lint
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run test
```

Expected: all PASS. `web`'s lint is the one that matters most here: it is what proves `live-settings.ts` is where the compiler lint allows these writes.

- [ ] **Step 10: Commit**

```bash
git add web/lib/alphatab/settings-paths.ts web/lib/alphatab/settings-paths.test.ts \
  web/lib/alphatab/settings-schema.ts web/lib/alphatab/live-settings.ts \
  client/src/index.ts client/src/components/ui/Popover client/src/components/ui/ScrollArea
git commit -m "feat(web): add the settings group schema and the live-settings funnel (NH-291)"
```

---

### Task 5: The Settings popover

**Files:**

- Create: `web/app/play/SettingsPopover.tsx`
- Modify: `web/app/play/PlayerHeader.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `buildSettingGroups`, `readSettingValue`, `writeSettingValue`, `applySettingsJson` (Task 4); `Accordion`, `SettingRow`, `Popover*`, `ScrollArea`, `Tooltip*` (Tasks 1, 2, 4); `useAlphaTabEngine`, the `api` state (Plan A); `applySpeed` and `speed` (Plan B).
- Produces: test hooks `data-testid="settings-trigger"`, `data-testid="settings-popover"`. No new `data-*` state mirror: the cases below read the engine instead.

- [ ] **Step 1: Write the failing tests**

Add to `web/e2e/player.e2e.ts`. There is no button to press first: `/play` opens on the bundled beat (spec D8), so a case starts by waiting for Play to enable, exactly as Plan B's cases do.

```ts
// What AlphaTab itself holds, through the debug handle `useAlphaTab` parks on the host element.
// The popover's own number field mirrors React state and would show 2 even if the write never
// reached the engine.
const engineState = (page: Page) =>
  page.evaluate(() => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: {
          playbackSpeed: number;
          metronomeVolume: number;
          // The playhead, in MIDI ticks. Read to prove the sound-rebuilding rows rewind it.
          tickPosition: number;
          settings: { display: { scale: number } };
          score: { stylesheet: { hideDynamics: boolean } } | null;
        };
      } | null
    )?.at;
    return at
      ? {
          speed: at.playbackSpeed,
          metronomeVolume: at.metronomeVolume,
          tick: at.tickPosition,
          scale: at.settings.display.scale,
          hideDynamics: at.score?.stylesheet.hideDynamics ?? null,
        }
      : null;
  });

// Record every call the page makes to one AlphaTabApi method. The synth keeps solo, mute and
// volume in its WORKER, so nothing on the main thread can be read back afterwards — and the row's
// aria-pressed mirrors React state, so it flips even when the call never reached the engine
// (exactly what a callback frozen on the pre-engine `undefined` api does). Wrapping the method
// through the debug handle is test-side only: nothing ships for it.
// `method` may be a dotted path: 'changeTrackVolume' is on the api itself, but
// 'player.resetChannelStates' is on the synth wrapper. Without the path form the mixer's reset
// could not be observed at all, and a test would be asserting the absence of something instead of
// the presence of the call.
async function recordApiCalls(page: Page, method: string): Promise<() => Promise<unknown[][]>> {
  await page.evaluate((name) => {
    const root = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: Record<string, unknown>;
      } | null
    )?.at;
    if (!root) throw new Error('no engine');
    const parts = name.split('.');
    const leaf = parts.pop() as string;
    let at = root;
    for (const part of parts) {
      at = (at as Record<string, Record<string, unknown>>)[part];
      if (!at) throw new Error(`no ${part}`);
    }
    const original = (at[leaf] as (...args: unknown[]) => unknown).bind(at);
    const calls: unknown[][] = [];
    const store = ((globalThis as { nhCalls?: Record<string, unknown[][]> }).nhCalls ??= {});
    store[name] = calls;
    at[leaf] = (...args: unknown[]) => {
      // Tracks are live objects; keep what identifies them.
      calls.push(
        args.map((arg) =>
          Array.isArray(arg) ? arg.map((track) => (track as { index: number }).index) : arg,
        ),
      );
      return original(...args);
    };
  }, method);
  return () =>
    page.evaluate(
      (name) => (globalThis as { nhCalls?: Record<string, unknown[][]> }).nhCalls?.[name] ?? [],
      method,
    );
}

// Every settings group starts expanded (SettingsPopover's defaultValue lists them all), and Base
// UI's Accordion.Panel does not keepMounted — so clicking an open header removes its rows from the
// DOM and the next fill() times out. Same idiom as a11y.e2e.ts's "open every group" loop.
const openGroup = async (page: Page, name: string) => {
  const header = page.getByRole('button', { name });
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
};

test('a settings row changes the rendered score without stopping playback', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');

  const surface = page.getByTestId('notation-surface');
  const widthBefore = (await surface.locator('svg').first().boundingBox())?.width ?? 0;

  await page.getByTestId('settings-trigger').click();
  await expect(page.getByTestId('settings-popover')).toBeVisible();

  // Change the zoom — a setting whose effect is measurable in the DOM. Through the NUMBER field:
  // it shares the slider's name. The popover opens with every group EXPANDED, so a bare click
  // would CLOSE the group and unmount the row: open only if shut.
  //
  // pressSequentially, not fill(): the row reports on EVERY keystroke, so this is also the case
  // that proves the redraw is coalesced. Three characters, three settings pushes, ONE render —
  // without the coalescer this is three full relayouts while the player runs.
  const renders = await recordApiCalls(page, 'render');
  await openGroup(page, 'Display: general');
  await page.getByRole('spinbutton', { name: 'Zoom' }).pressSequentially('2.5');

  await expect.poll(async () => (await engineState(page))?.scale).toBe(2.5);
  expect((await renders()).length).toBe(1);
  await expect
    .poll(async () => (await surface.locator('svg').first().boundingBox())?.width ?? 0, {
      timeout: 20_000,
    })
    .toBeGreaterThan(widthBefore);

  // The popover never blocks the player: that is the whole reason v0 chose a popover. This case
  // uses a `render` row (zoom); the `midi` rows are the measured exception, pinned by the case
  // below so the difference is a decision on record rather than a bug someone later "fixes".
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

// The ONE exception to the promise above, and the only path that reaches it. loadMidiForScore ->
// loadMidiFile -> stop() pauses AND rewinds (alphaTab.core.mjs:40054 and :39987-39995), so a
// sound-rebuilding row is not something to change mid-take. The case above cannot catch this: zoom
// takes the redraw path and never regenerates the MIDI.
test('a sound-rebuilding row stops the player and rewinds it', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
  // Let the playhead actually leave the start, or the rewind assertion proves nothing.
  await expect.poll(async () => (await engineState(page))?.tick ?? 0).toBeGreaterThan(0);

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('spinbutton', { name: 'Wide note vibrato: length' }).fill('5');

  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'false');
  await expect.poll(async () => (await engineState(page))?.tick ?? -1).toBeLessThanOrEqual(1);
});

// Two editors, one value, one writer. The header's stepper and this row must never disagree, and
// the ENGINE must hear about it — a row that wrote the speed into the settings JSON would move,
// show its new number, and change nothing.
test('the Player group speed row and the header tempo control are one value', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('spinbutton', { name: 'Playback speed (%)' }).fill('50');

  await expect(page.getByTestId('player-status')).toHaveAttribute('data-speed', '0.5');
  await expect.poll(async () => (await engineState(page))?.speed).toBe(0.5);
});

// The same rule for the metronome: the transport's button and this row are one volume.
test('the metronome volume row and the transport button are one value', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('toggle-metronome').click();
  await expect.poll(async () => (await engineState(page))?.metronomeVolume).toBe(1);

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('spinbutton', { name: 'Metronome volume' }).fill('0.4');
  await expect.poll(async () => (await engineState(page))?.metronomeVolume).toBe(0.4);
  // Still on: the button reads "volume > 0".
  await expect(page.getByTestId('toggle-metronome')).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('spinbutton', { name: 'Metronome volume' }).fill('0');
  await expect(page.getByTestId('toggle-metronome')).toHaveAttribute('aria-pressed', 'false');
});

// The Stylesheet group is NOT settings: it lives on the open score's model. A row wired like its
// neighbours would write a JSON key AlphaTab ignores — for the whole group, in silence.
test('a Stylesheet row changes the open score, not the settings', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  const before = (await engineState(page))?.hideDynamics;

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Stylesheet');
  await page.getByRole('checkbox', { name: 'Hide dynamics' }).click();

  await expect.poll(async () => (await engineState(page))?.hideDynamics).toBe(!before);
});

// Vibrato, slides, song-book timings and triplet feel are read when the MIDI is BUILT. Pushing
// the settings or redrawing changes nothing audible, so the row must regenerate the MIDI.
test('a playback-shaping row regenerates the MIDI', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  const midiLoads = await recordApiCalls(page, 'loadMidiForScore');

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('checkbox', { name: /triplet feel/i }).click();

  await expect.poll(async () => (await midiLoads()).length).toBe(1);
});

test('the Settings icon trigger has a tooltip', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').hover();
  await expect(openTooltip(page)).toHaveText('Settings');
});
```

`openTooltip` is the helper Plan B's tooltip cases already use in this file. The Tracks trigger's tooltip is asserted in Task 7's first case. `openGroup` is new here and every later case reuses it — including Task 6's reload case and Task 8's `setPlayerMode`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "settings row|one value|Stylesheet row|regenerates the MIDI|icon trigger"`
Expected: FAIL — no `settings-trigger`.

- [ ] **Step 3: Write the popover**

Create `web/app/play/SettingsPopover.tsx`:

```tsx
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  SettingRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@notation-hero/client';
import type { SettingValue } from '@notation-hero/client';

import { useState } from 'react';

import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';
import { readStylesheetValues, setStylesheetValue } from '../../lib/alphatab/live-settings';
import { buildSettingGroups, readSettingValue } from '../../lib/alphatab/settings-schema';
import { useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import type {
  ApiValueKey,
  PlayerSettingsJson,
  SettingAction,
  SettingApply,
  SettingDescriptor,
  StylesheetKey,
} from '../../lib/alphatab/settings-schema';
import type * as AlphaTab from '@coderline/alphatab';

interface SettingsPopoverProps {
  /** The live api, or undefined until the engine has loaded. The Stylesheet group reads the open
   *  score through it. */
  api: AlphaTab.AlphaTabApi | undefined;
  settings: PlayerSettingsJson;
  onSettingChange: (path: string, value: SettingValue, apply: SettingApply) => void;
  /**
   * The AlphaTabApi properties the Player group edits, in the unit each row shows. The shell owns
   * every one of them, because each has a second editor elsewhere in the player — the speed is
   * also the header's tempo control.
   */
  apiValues: Readonly<Partial<Record<ApiValueKey, SettingValue>>>;
  /** Routed by the shell to its single writer for that value. Never to the settings JSON. */
  onApiValueChange: (key: ApiValueKey, value: SettingValue) => void;
  onAction: (action: SettingAction) => void;
  /**
   * Set while the file plays its own recording: the reason, as tooltip text. The Player group's
   * metronome-volume and count-in-volume rows then render disabled — the backing-track
   * synthesizer ignores both, exactly as the transport's two buttons already know (Global
   * Constraints, and `TransportRow`'s `disabled={disabled || hasBackingTrack}`). Every other
   * Player row stays live: master volume is not stubbed, and speed and loop are the sequencer's.
   */
  mixUnavailable?: string;
}

// The header gear. A POPOVER, not a modal — it never blocks the player, so a drummer can change a
// setting while the score plays. (The fourteen sound-rebuilding rows are the exception: applying
// one stops playback and rewinds. Global Constraints says why, and an e2e case pins it.) That is the single reason v0 chose this shape, and the settings
// search that comes later is layered over these same rows.
//
// The playback-speed slider lives in this popover's Player group, not in the header pill: neither
// design source draws a slider there, and "two popovers, not modals" leaves no third surface.
//
// FOUR KINDS OF ROW, ONE LOOP. A row's `source` decides where its value comes from and where a
// change goes — a settings key, an api property, the open score's stylesheet, or a command. The
// panel reads like one list, but AlphaTab takes a write to the wrong place without a word. It
// matters most for the `api` rows: `playbackSpeed` and its neighbours are
// AlphaTabApi PROPERTIES, not keys in AlphaTab's settings JSON, so a row that wrote one into the
// JSON would move, show its new number, and change nothing audible — a silent failure, not an
// error. They go to the shell's single writer for that value instead, which is also what keeps
// this slider and the header's tempo control showing the same speed.
export function SettingsPopover({
  api,
  settings,
  onSettingChange,
  apiValues,
  onApiValueChange,
  onAction,
  mixUnavailable,
}: Readonly<SettingsPopoverProps>) {
  const { engine } = useAlphaTabEngine();
  // The enum options come off the loaded namespace, so the groups cannot exist before it does.
  const groups = engine ? buildSettingGroups(engine) : [];

  // The Stylesheet group belongs to the OPEN SCORE, not to the app: every score brings its own
  // stylesheet, so the values are re-read each time one loads, and they are never stored.
  // STYLESHEET_ENUMS maps each enum-valued key to its AlphaTab enum, so a value can cross the
  // boundary by NAME like every other enum row (see the note under this block).
  const [stylesheet, setStylesheet] = useState<Partial<Record<StylesheetKey, SettingValue>>>({});
  useAlphaTabEvent(api, 'scoreLoaded', (score) => {
    if (!engine) return;
    setStylesheet(
      readStylesheetValues(score, (key, value) => STYLESHEET_ENUMS(engine)[key]?.[value] ?? ''),
    );
  });

  const valueOf = (setting: SettingDescriptor): SettingValue => {
    if (setting.source === 'settings') return readSettingValue(settings, setting.path) ?? '';
    if (setting.source === 'api') return apiValues[setting.key] ?? '';
    if (setting.source === 'stylesheet') return stylesheet[setting.key] ?? '';
    return ''; // an action row has no value
  };

  const change = (setting: SettingDescriptor, next: SettingValue) => {
    if (setting.source === 'settings') onSettingChange(setting.path, next, setting.apply);
    else if (setting.source === 'api') onApiValueChange(setting.key, next);
    else if (setting.source === 'stylesheet' && api && engine) {
      // A select row reports the enum's NAME; the score model wants its number.
      const enumObject = STYLESHEET_ENUMS(engine)[setting.key];
      const raw = enumObject && typeof next === 'string' ? enumObject[next] : next;
      if (typeof raw !== 'boolean' && typeof raw !== 'number') return;
      setStylesheetValue(api, setting.key, raw);
      setStylesheet((current) => ({ ...current, [setting.key]: next }));
    }
  };

  return (
    <Popover>
      {/* The tooltip is ALWAYS present, never conditional: swapping the wrapped and the bare
          element remounts the button and drops its focus. The TooltipTrigger renders a SPAN
          around the PopoverTrigger — the shape TransportToggle ships — because the gear is
          disabled while the engine loads, and a disabled Button is pointer-events:none, so as
          its own tooltip trigger it would never see the mouse (Global Constraints). The span
          takes the hover; focus still opens it, because focus events bubble. Still one <button>. */}
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <PopoverTrigger
            render={
              <Button
                data-testid="settings-trigger"
                variant="ghost"
                size="icon"
                aria-label="Settings"
                disabled={!engine}
                className="size-11 rounded-xl"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  settings
                </span>
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <PopoverContent
        data-testid="settings-popover"
        align="end"
        className="w-96 p-0"
        aria-label="Settings"
      >
        <ScrollArea className="max-h-[70vh]">
          {/* Every group OPEN by default (maintainer, 2026-09-21): browsing is the only way to
              find a row until search lands, and a panel that opens closed hides all 90 of them.
              The trigger is sticky so the group a row belongs to stays readable while it scrolls. */}
          <Accordion className="px-3 py-2" defaultValue={groups.map((group) => group.id)}>
            {groups.map((group) => (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger className="sticky top-0 z-10 bg-popover">
                  {group.title}
                </AccordionTrigger>
                <AccordionContent>
                  {group.settings.map((setting) => (
                    <SettingRow
                      key={setting.id}
                      id={setting.id}
                      label={setting.label}
                      control={setting.control}
                      description={setting.description}
                      value={valueOf(setting)}
                      onChange={(next) => change(setting, next)}
                      onAction={
                        setting.source === 'action' ? () => onAction(setting.action) : undefined
                      }
                      // The only two rows the backing-track synthesizer ignores. A control must
                      // never look live and do nothing (Global Constraints).
                      disabled={
                        Boolean(mixUnavailable) &&
                        (setting.id === 'player-metronome-volume' ||
                          setting.id === 'player-count-in-volume')
                      }
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

> `STYLESHEET_ENUMS(engine)` is a small function in this file returning `Partial<Record<StylesheetKey, Record<string | number, string | number>>>` — `bracketExtendMode → engine.model.BracketExtendMode`, the two `…TrackNamePolicy` keys `→ engine.model.TrackNamePolicy`, the two `…TrackNameMode` keys `→ engine.model.TrackNameMode`, the two `…TrackNameOrientation` keys `→ engine.model.TrackNameOrientation`. A TypeScript numeric enum maps both ways, so one object turns a number into its name and a name into its number. A function, not a module constant: every enum is a runtime value off the loaded namespace. Check each enum's real name against `alphaTab.d.ts` (`RenderStylesheet`, line 14731 onward) as you write it — the fork binds its orientation rows to the `TrackNameMode` enum, which is one more slip not to copy.
>
> `render={…}` is Base UI's composition prop, and `TooltipTrigger render={<Button … />}` is the working precedent in this repo — `PlayerShell`'s Play button. Here the `TooltipTrigger` renders a `<span className="inline-flex" />` **around** the `PopoverTrigger` — the shape `TransportToggle` already ships — chosen, not a fallback, because the gear is disabled while the engine loads and a disabled `Button` is `pointer-events: none`, so as its own tooltip trigger it would never see the mouse. The span takes the hover; focus still opens the tooltip, because focus events bubble up from the button inside, and it is still one `<button>`. Verify in the browser before moving on: hover opens the tooltip **while the gear is still disabled**, a click opens the popover once it is enabled, Tab reaches the button once, and `Escape` closes the popover and leaves focus on the gear.

- [ ] **Step 4: Apply a changed setting to the live engine**

In `PlayerShell.tsx`, inside `Player`. `api` is **state**, so it is in every dependency list below:

```tsx
const [settings, setSettings] = useState<PlayerSettingsJson>(DEFAULT_PLAYER_SETTINGS);

const applySetting = useCallback(
  (path: string, value: SettingValue, apply: SettingApply) => {
    // Compute, set, THEN call the engine — never call the engine inside the setState updater.
    // React may run an updater twice, which would push the settings and redraw the score twice.
    const next = writeSettingValue(settings, path, value);
    setSettings(next);
    if (api) applySettingsJson(api, next, apply);
  },
  [api, settings],
);

// Master volume is the one api value the transport does not already own.
const [masterVolume, setMasterVolume] = useState(1);
const applyMasterVolume = useCallback(
  (next: number) => {
    setMasterVolume(next);
    if (api) setAlphaTabValue(api, 'masterVolume', next);
  },
  [api],
);

// The Player group's api rows, in the unit each row shows. The speed is a multiplier everywhere
// else in the player; the row shows a percentage, rounded to one decimal, because the header's BPM
// stepper leaves the multiplier at values like 0.8916….
const apiValues = {
  playbackSpeed: Math.round(speed * 1000) / 10,
  masterVolume,
  metronomeVolume,
  countInVolume,
  isLooping: looping,
};

const applyApiValue = useCallback(
  (key: ApiValueKey, value: SettingValue) => {
    // Every branch goes to the value's ONE writer. The speed row and the header's tempo control
    // are two editors of one value; so are the metronome row and the transport's Metronome button.
    if (key === 'playbackSpeed') applySpeed(Number(value) / 100);
    else if (key === 'masterVolume') applyMasterVolume(Number(value));
    else if (key === 'metronomeVolume') applyMetronomeVolume(Number(value));
    else if (key === 'countInVolume') applyCountInVolume(Number(value));
    else applyLooping(Boolean(value));
  },
  [applySpeed, applyMasterVolume, applyMetronomeVolume, applyCountInVolume, applyLooping],
);

const runAction = useCallback(
  (action: SettingAction) => {
    if (!api?.score || !engine) return;
    if (action === 'export-midi') {
      try {
        api.downloadMidi();
      } catch {
        toast.error('That file could not be exported.');
      }
      return;
    }
    // Guitar Pro 7 bytes from AlphaTab's own exporter, handed to the browser as a download. The
    // exporter is a runtime value, so it comes off the loaded namespace, never an import.
    //
    // The SUCCESS path needs no signal — the browser's own download is the signal. A failure has
    // none at all, and every step here can throw: the export itself, the Blob, the object URL.
    // Same surface the corrupt-stored-settings path uses (Task 6).
    try {
      const bytes = new engine.exporter.Gp7Exporter().export(api.score, api.settings);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${api.score.title || 'score'}.gp`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('That file could not be exported.');
    }
  },
  [api, engine],
);
```

Add `'masterVolume'` to `AlphaTabApiValue` in `web/lib/alphatab/useAlphaTab.ts` — that union is what `setAlphaTabValue` accepts, and it lists the transport's values only.

**Metronome and Count-In become volumes.** Plan B holds them as booleans (`metronome`, `countIn`) and writes `1` or `0`. AlphaTab's values are volumes, the fork's rows are 0-1 sliders, and one value must have one writer — so the state becomes the number, and the transport button is derived from it:

```diff
- const [metronome, setMetronome] = useState(false);
+ const [metronomeVolume, setMetronomeVolume] = useState(0);

- const applyMetronome = useCallback(
-   (next: boolean) => {
-     setMetronome(next);
-     if (api) setAlphaTabValue(api, 'metronomeVolume', next ? 1 : 0);
-   },
-   [api],
- );
+ // The ONE writer of api.metronomeVolume. The transport button and the Settings row both call it.
+ const applyMetronomeVolume = useCallback(
+   (next: number) => {
+     setMetronomeVolume(next);
+     if (api) setAlphaTabValue(api, 'metronomeVolume', next);
+   },
+   [api],
+ );
```

and on `<TransportRow>`: `metronome={metronomeVolume > 0}` and `onMetronomeChange={(on) => applyMetronomeVolume(on ? 1 : 0)}`. Count-In is the same change. `data-metronome={metronomeVolume > 0}` and `data-countin={countInVolume > 0}` keep the `player-status` attributes the booleans they were, so Plan B's cases stay green untouched — run them to prove it. The Loop row needs no state change: it is `looping` / `applyLooping` as they are.

`PlayerHeader` stays free of settings knowledge, the same way `TransportRow` holds no AlphaTab knowledge: it gains **one** slot for the right column Plan B left empty (`<div />` today), and the shell fills it.

```tsx
// PlayerHeader.tsx — one new optional prop, rendered in the third grid column.
/** The header's right column. The shell passes the Settings trigger; the header knows nothing about it. */
actions?: ReactNode;
// …
<div className="flex items-center justify-end">{actions}</div>
```

```tsx
// PlayerShell.tsx
// The one reason string both popovers and TrackRow show. Export it from a shared module rather
// than re-declaring it here, in TracksPopover.tsx and in TrackRow.test.tsx.
const RECORDING = 'Not available while the file plays its own recording';

<PlayerHeader
  scoreTitle={notation?.score.title ?? ''}
  fileName={openFileName}
  scoreTempo={scoreTempo}
  speed={speed}
  onSpeedChange={applySpeed}
  disabled={!playerReady}
  actions={
    <SettingsPopover
      api={api}
      settings={settings}
      onSettingChange={applySetting}
      apiValues={apiValues}
      onApiValueChange={applyApiValue}
      onAction={runAction}
      mixUnavailable={hasBackingTrack ? RECORDING : undefined}
    />
  }
/>;
```

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS. The lint run is not a formality here: it is what catches an engine write that slipped into a component instead of `live-settings.ts`.

- [ ] **Step 6: Prove every `settings` row reaches the engine**

Criterion 7 says the Settings popover's rows change the rendered score, not that the popover opens — and a row with a wrong `path` does nothing, without an error. ~70 settings rows are too many to trust to one zoom case, and a machine can check most of it. Add to `web/e2e/player.e2e.ts`:

```ts
// Every path the schema names must exist on the LIVE settings object. fillFromJson ignores a key
// it does not know, so a misspelled path is a row that moves and changes nothing, in silence.
test('every settings row names a key the engine really has', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('settings-trigger').click();

  // Open every group, so every row is in the DOM.
  const headers = page.getByTestId('settings-popover').locator('[data-slot="accordion-trigger"]');
  for (const header of await headers.all()) {
    if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  }

  const missing = await page.evaluate(() => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: { settings: Record<string, unknown> };
      } | null
    )?.at;
    if (!at) return ['no engine'];
    return [...document.querySelectorAll<HTMLElement>('[data-setting-path]')]
      .map((row) => row.dataset.settingPath ?? '')
      .filter((path) => {
        let current: unknown = at.settings;
        for (const part of path.split('.')) {
          // NOT `part in current`: `in` walks the PROTOTYPE CHAIN, so a deprecated getter such as
          // the old font aliases satisfies it while fillFromJson ignores the key entirely — which
          // is exactly how eleven dead font rows passed this gate. Own properties only.
          if (
            current === null ||
            typeof current !== 'object' ||
            !Object.prototype.hasOwnProperty.call(current, part)
          )
            return true;
          current = (current as Record<string, unknown>)[part];
        }
        return false;
      });
  });
  expect(missing, 'settings rows whose path is not a real AlphaTab key').toEqual([]);
});
```

For it to find the rows, `SettingsPopover` passes `data-setting-path={setting.path}` on each `source: 'settings'` row, and `SettingRow` spreads `...rest` onto its root the way `TrackRow` does (widen its props to `Omit<ComponentProps<'div'>, 'onChange' | 'children' | 'id'>` when you add it). It is a static attribute with no runtime cost — the same kind of hook as the `data-testid`s this player already ships, not a state mirror.

What this cannot tell is whether a row chose the wrong `apply` (the value changes, and the score or the sound does not), or whether the change looks right. That needs eyes, and it is one of the two checks handed back in Task 10.

- [ ] **Step 7: Commit**

```bash
git add web/app/play/SettingsPopover.tsx web/app/play/PlayerHeader.tsx \
  web/app/play/PlayerShell.tsx web/lib/alphatab/useAlphaTab.ts web/e2e/player.e2e.ts
git commit -m "feat(web): add the Settings popover (NH-291)"
```

---

### Task 6: Persist the settings

One `localStorage` key holding AlphaTab's own settings JSON alongside a `version` integer. Score files and playback history are never stored — the no-recent-files rule is about scores, not preferences. Only the `settings` rows are stored: an `api` row's value (the speed, the master volume) is not part of AlphaTab's settings JSON, and whether it should survive a reload is [NH-295](https://leocaseiro.atlassian.net/browse/NH-295), not this task.

**Files:**

- Create: `web/lib/alphatab/settings-storage.ts`
- Create: `web/lib/alphatab/settings-storage.test.ts`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `DEFAULT_PLAYER_SETTINGS`, `PlayerSettingsJson`, `SETTING_OPTION_VALUES` (Task 4).
- Produces: `loadStoredSettings(raw: string | null, defaults: PlayerSettingsJson, optionValues: Readonly<Record<string, readonly string[]>>): { settings: PlayerSettingsJson; reset: boolean }` and `serializeSettings(settings: PlayerSettingsJson): string`, plus `SETTINGS_STORAGE_KEY` and `SETTINGS_VERSION`.

- [ ] **Step 1: Write the failing test**

Create `web/lib/alphatab/settings-storage.test.ts`, beside the module it covers:

```ts
import { describe, expect, it } from 'vitest';

import { loadStoredSettings, serializeSettings } from './settings-storage';

const DEFAULTS = { display: { scale: 1 }, player: { enableCursor: true } };
// Every option-bearing row's allowed VALUES, by dot-path — what the schema offers (Task 4).
const OPTIONS = { 'display.layoutMode': ['Page', 'Horizontal'] } as const;

describe('loadStoredSettings', () => {
  it('round-trips every stored value', () => {
    const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: false } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: false } });
    expect(reset).toBe(false);
  });

  it('yields the defaults for a first visit, and does NOT call that a reset', () => {
    const { settings, reset } = loadStoredSettings(null, DEFAULTS, OPTIONS);
    expect(settings).toEqual(DEFAULTS);
    // A first visit is not a corruption.
    expect(reset).toBe(false);
  });

  // A bad stored value must never break the player, and must not vanish quietly.
  it('falls back to the defaults and reports a reset on unparseable JSON', () => {
    const { settings, reset } = loadStoredSettings('{not json', DEFAULTS, OPTIONS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  it('falls back and reports a reset on a wrong-shaped value', () => {
    const { settings, reset } = loadStoredSettings('"a string"', DEFAULTS, OPTIONS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  // Merge PER KEY rather than discarding the whole object — the settings search layers over
  // these same settings, so the stored shape changes soon after v0 ships.
  it('keeps the keys an older version has and fills the rest from the defaults', () => {
    const stored = JSON.stringify({ version: 0, settings: { display: { scale: 1.4 } } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: true } });
    // A partial merge is not a reset.
    expect(reset).toBe(false);
  });

  // A stored enum NAME the engine does not know is not inert: fillFromJson assigns parseEnum's
  // `undefined` straight through and reports success, so the good value is gone and stays gone for
  // the session. The same-type check cannot see it: a name the engine knows and one it does not
  // are both strings. The measured case was `Horizontal` with a letter dropped.
  it('drops an option value the row does not offer, back to its default', () => {
    const defaults = { display: { layoutMode: 'Page' } };
    const stored = JSON.stringify({
      version: 1,
      settings: { display: { layoutMode: 'NotAMode' } },
    });
    const { settings, reset } = loadStoredSettings(stored, defaults, OPTIONS);

    expect(settings).toEqual({ display: { layoutMode: 'Page' } });
    // A typo in storage is a corruption the person should be told about.
    expect(reset).toBe(true);
  });

  it('drops a key the defaults do not declare', () => {
    const stored = JSON.stringify({
      version: 1,
      settings: { display: { scale: 1.4 }, bogus: { nope: 1 } },
    });
    const { settings } = loadStoredSettings(stored, DEFAULTS, OPTIONS);
    expect(settings).not.toHaveProperty('bogus');
  });

  // display.padding is an array. It must come back as one, element by element, and a stored
  // array of the wrong length or with a non-number in it is dropped whole.
  it('merges an array element by element, and drops a malformed one', () => {
    const defaults = { display: { padding: [35, 35] } };
    const good = JSON.stringify({ version: 1, settings: { display: { padding: [10, 20] } } });
    expect(loadStoredSettings(good, defaults, OPTIONS).settings).toEqual({
      display: { padding: [10, 20] },
    });

    for (const bad of [[10], [10, 'wide'], { 0: 10, 1: 20 }, null]) {
      const stored = JSON.stringify({ version: 1, settings: { display: { padding: bad } } });
      expect(loadStoredSettings(stored, defaults, OPTIONS).settings).toEqual(defaults);
    }
  });

  // A stored value of the wrong TYPE would reach fillFromJson as-is. A string where a number
  // belongs breaks the layout without throwing, so the default wins.
  it('drops a stored value whose type differs from the default', () => {
    const stored = JSON.stringify({ version: 1, settings: { display: { scale: 'huge' } } });
    const { settings } = loadStoredSettings(stored, DEFAULTS, OPTIONS);
    expect(settings).toEqual(DEFAULTS);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/settings-storage`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the storage module**

Create `web/lib/alphatab/settings-storage.ts`:

```ts
import type { PlayerSettingsJson } from './settings-paths';

export const SETTINGS_STORAGE_KEY = 'notation-hero.player-settings';
// Stored beside the settings so a future shape change can migrate rather than discard. v0 writes
// it and does not branch on it: the per-key merge against the shipped defaults already handles the
// only change v0.1 makes (new keys appearing). The first migration that needs it reads it here.
export const SETTINGS_VERSION = 1;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Deep merge per key, keeping only keys the defaults declare — and only a stored value of the
 * SAME TYPE as its default. The stored JSON goes to the engine through fillFromJson, which takes
 * what it is given: a string where a number belongs breaks the layout without throwing.
 */
function mergeAgainstDefaults(
  stored: Record<string, unknown>,
  defaults: PlayerSettingsJson,
): PlayerSettingsJson {
  const merged: PlayerSettingsJson = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = stored[key];
    if (isPlainObject(fallback)) {
      merged[key] = mergeAgainstDefaults(isPlainObject(value) ? value : {}, fallback);
    } else if (Array.isArray(fallback)) {
      // `typeof` calls an array, an object and null all 'object', so an array gets its own check:
      // the same length, and every element the same type as the default's.
      const sameShape =
        Array.isArray(value) &&
        value.length === fallback.length &&
        value.every((item, index) => typeof item === typeof fallback[index]);
      merged[key] = sameShape ? value : fallback;
    } else {
      merged[key] = typeof value === typeof fallback ? value : fallback;
    }
  }
  return merged;
}

export function serializeSettings(settings: PlayerSettingsJson): string {
  return JSON.stringify({ version: SETTINGS_VERSION, settings });
}

/**
 * Read the stored settings, merging per key against the shipped defaults.
 *
 * `reset` is true only when something was actually WRONG — unparseable, the wrong shape, or a
 * value its row does not offer. A
 * first visit (null) and an older version that merges cleanly are both normal, and raising a
 * "settings were reset" toast for either would cry wolf.
 *
 * Merging per key rather than discarding the whole object matters because the settings search
 * layers over these same settings, so the stored shape changes soon after v0 ships — a drummer
 * who upgrades should keep the colours they chose, not start over.
 */
export function loadStoredSettings(
  raw: string | null,
  defaults: PlayerSettingsJson,
  // Every option-bearing row's allowed VALUES, by dot-path (Task 4). The same-type check below
  // cannot see a bad enum name: the good one and the typo are both strings.
  optionValues: Readonly<Record<string, readonly string[]>>,
): { settings: PlayerSettingsJson; reset: boolean } {
  if (raw === null) return { settings: defaults, reset: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { settings: defaults, reset: true };
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.settings)) {
    return { settings: defaults, reset: true };
  }

  const merged = mergeAgainstDefaults(parsed.settings, defaults);
  // A value no row offers is a corruption, not an older shape: say so, so the toast fires.
  const { settings, dropped } = dropUnknownOptions(merged, defaults, optionValues);
  return { settings, reset: dropped };
}
```

> An enum is stored by **name** (Task 4), so its default is a string and a stored name passes the same-type check — which is exactly why the type check alone is not enough. **A stored name AlphaTab does not know is NOT harmless: it WIPES the key.** `JsonHelper.parseEnum` returns `undefined` for an unrecognised name (`alphaTab.core.mjs:25045-25055`) and the serializer assigns that straight through, **returning `true` as though it had handled it** (`:29566`). Measured against a real `Settings`: `display.layoutMode` went from `0` (Page) to `undefined` when the stored name was `Horizontal` with one letter missing — `fillFromJson` threw nothing, logged nothing, kept nothing, and the `undefined` survived a `settingsToJsObject` / `jsObjectToSettings` round-trip. Because the whole document is pushed on every edit, one bad key then re-applies for the rest of the session. Neither existing guard catches it: the merge compares string to string, and the row gate walks names, not values. So the stored **document** is gated on the option lists before it is ever pushed:

```ts
/**
 * Drop any stored value its row does not offer, back to the shipped default. Runs ONCE on the
 * whole stored document, before the restore push — not per edit, which sees a single key and
 * cannot tell a poisoned session from a fresh one.
 */
function dropUnknownOptions(
  merged: PlayerSettingsJson,
  defaults: PlayerSettingsJson,
  optionValues: Readonly<Record<string, readonly string[]>>,
): { settings: PlayerSettingsJson; dropped: boolean };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/settings-storage`
Expected: PASS — 9 tests.

- [ ] **Step 5: Write the failing e2e cases**

The by-hand reload check is a machine's job. Add to `web/e2e/player.e2e.ts`:

```ts
test('a changed setting survives a reload', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Display: general');
  await page.getByRole('spinbutton', { name: 'Zoom' }).fill('2');
  await expect.poll(async () => (await engineState(page))?.scale).toBe(2);

  await page.reload();
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  // Read the ENGINE, before the popover is ever opened: the stored zoom must be in the api the
  // page built, not merely in the popover's own state.
  await expect.poll(async () => (await engineState(page))?.scale).toBe(2);
});

// A bad stored value must never stop the player mounting — the one thing v0 exists to do — and
// must not vanish quietly either.
test('a corrupt stored value resets with a toast, and the player still starts', async ({
  page,
}) => {
  await page.addInitScript(() => {
    globalThis.localStorage.setItem('notation-hero.player-settings', '{broken');
  });
  await page.goto('/play');

  await expect(page.locator('[data-sonner-toast]')).toContainText('reset to the defaults');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await expect.poll(async () => (await engineState(page))?.scale).toBe(1);
});
```

Run: `pnpm --filter @notation-hero/web run test:e2e -g "survives a reload|corrupt stored value"`
Expected: FAIL — nothing is stored yet.

- [ ] **Step 6: Restore before the api is built, and persist on change**

Two lint rules shape this, and both are errors in `web/`: `react-hooks/set-state-in-effect` forbids reading storage in an effect and then calling `setSettings`, and `react-hooks/immutability` is why the engine write is not written here at all. So the stored value is read **once, in a lazy `useState` initialiser**, and it reaches the engine through the `settingsInit` callback `useAlphaTab` already takes — which runs on the client, inside the hook's effect, **before** `new AlphaTabApi(...)`. The score is drawn once, with the person's settings, instead of once with the defaults and again with theirs.

In `PlayerShell.tsx`, replace Task 5's `useState<PlayerSettingsJson>(DEFAULT_PLAYER_SETTINGS)`:

```tsx
// Read ONCE per page visit. The initialiser also runs for the server render, where there is no
// storage: it yields the defaults there, and the HTML is identical either way because nothing on
// the page renders a setting until the popover is opened.
const [restored] = useState(() =>
  typeof window === 'undefined'
    ? { settings: DEFAULT_PLAYER_SETTINGS, reset: false }
    : loadStoredSettings(
        window.localStorage.getItem(SETTINGS_STORAGE_KEY),
        DEFAULT_PLAYER_SETTINGS,
        SETTING_OPTION_VALUES,
      ),
);
const [settings, setSettings] = useState<PlayerSettingsJson>(restored.settings);

// A toast is not state, so an effect is the right place for it. Without it a drummer watches
// their colours and fonts revert with no way to tell it from a bug. Same surface the corrupt-file
// and engine-failure states use.
useEffect(() => {
  if (restored.reset) {
    toast.warning('Your player settings could not be read, so they were reset to the defaults.');
  }
}, [restored]);
```

Inside the existing `useAlphaTab((settings, alphaTab) => { … })` callback, **after** the shell's own assignments — name the callback's parameter `engineSettings` so it stops shadowing the state above:

```tsx
// The person's stored settings, applied BEFORE the api exists, so the first draw already has
// them. After the player's own assignments on purpose: for a key both set (the cursor, the scroll
// mode), the person's choice is the one that must win.
//
// fillFromJson, never assignment — a plain object assigned into the settings tree breaks
// rendering without throwing. And inside try/catch: an uncaught throw here would stop the player
// mounting at all, which is the one thing this page exists to do.
try {
  engineSettings.fillFromJson(settings as AlphaTab.json.SettingsJson);
} catch {
  // Keep the defaults already on `engineSettings`. The merge above makes this unreachable in
  // practice; it is here because the cost of being wrong is a page with no player.
}
```

> `fillFromJson` is a method call on the callback's own parameter, not an assignment to a value that came out of a hook, so the compiler lint has nothing to object to. If it objects anyway, move the three lines into `live-settings.ts` as `fillSettings(target, json)` — do not disable the rule.

And persist inside `applySetting`, right after computing `next`:

```tsx
try {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, serializeSettings(next));
} catch {
  // Private browsing and a full quota both throw here. Losing persistence is survivable;
  // losing the player is not, so swallow it rather than breaking the edit.
}
```

- [ ] **Step 7: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test:e2e -g "survives a reload|corrupt stored value"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/lib/alphatab/settings-storage.ts web/lib/alphatab/settings-storage.test.ts \
  web/app/play/PlayerShell.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): persist player settings across reloads (NH-291)"
```

---

### Task 7: The Tracks popover

One row for **every track in the score**, not only the rendered drum staves — every track stays audible, so all of them are controllable.

**Files:**

- Create: `web/app/play/TracksPopover.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/app/play/NotationSurface.tsx` (one line: the transposition clear, Step 3b)
- Modify: `web/e2e/player.e2e.ts`

`TransportRow.tsx` is not touched: the row's `trailing` slot is already there and free, and the mixer reads the score from the api's own events.

**Interfaces:**

- Consumes: `TrackRow`, `MasterRow`, `TrackStaffState` (Task 3); `Popover*`, `ScrollArea`, `Button`, `Tooltip*`; `setTrackTransposition`, `clearTrackTranspositions`, `setStaffDisplay` (Task 4); `useAlphaTabEvent` and the `api` state (Plan A); `hasBackingTrack` (Plan B).
- Produces: `<TracksPopover api={api} hasBackingTrack={hasBackingTrack} disabled={!engine} masterVolume={apiValues.masterVolume} onMasterVolumeChange={applyMasterVolume} />`; test hooks `data-testid="tracks-trigger"`, `data-testid="tracks-popover"`, `data-testid="track-row-<index>"` per row, and `data-testid="master-row"`.
- **Master volume has ONE owner and ONE writer, and they are already built.** `PlayerShell` holds the state; `applyMasterVolume` is the writer; the Settings ▸ Player `masterVolume` row is its first editor. The mixer's Master row is its **second editor**, so it takes the value and that writer as props — never its own `useState`, and no React context (both popovers are rendered by `PlayerShell` one level down, so props reach them without drilling; context would buy nothing for two shallow consumers). An e2e case moves the Settings row and reads the Master row, then the reverse.

- [ ] **Step 1: Write the failing tests**

Add to `web/e2e/player.e2e.ts`. Each opens the fixture with `openFirstScore` — the helper this file already has, which proves the file really opened by its `data-file` attribute; the bundled beat is on screen from the first paint, so "a track rendered" is true before anything is picked.

```ts
// `recordApiCalls` is the helper the Settings cases added to this file.

// Punk.gp parses to three tracks — 0:Drumkit (percussion), 1:Distortion Guitar, 2:Drumkit Left
// (percussion) — so the popover has three rows to audit, not one, even though only two render.
test('the Tracks popover lists every track in the score, not only the rendered ones', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').hover();
  await expect(openTooltip(page)).toHaveText('Tracks');

  await page.getByTestId('tracks-trigger').click();
  await expect(page.getByTestId('tracks-popover')).toBeVisible();
  await expect(page.getByTestId('track-row-0')).toBeVisible();
  await expect(page.getByTestId('track-row-1')).toBeVisible();
  await expect(page.getByTestId('track-row-2')).toBeVisible();

  // The two drum tracks are drawn, so their render-select toggles start pressed; the guitar's does not.
  const drawn = (row: number) =>
    page.getByTestId(`track-row-${row}`).getByRole('button', { name: /render/i });
  await expect(drawn(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(drawn(1)).toHaveAttribute('aria-pressed', 'false');
  await expect(drawn(2)).toHaveAttribute('aria-pressed', 'true');
});

test('render-select changes which tracks are drawn', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  // Draw the guitar too. `rendered-track-count` is what AlphaTab actually drew (api.tracks), not
  // an echo of the request.
  await page
    .getByTestId('track-row-1')
    .getByRole('button', { name: /render/i })
    .click();

  await expect(page.getByTestId('rendered-track-count')).toHaveText('3', { timeout: 30_000 });
});

// The mixer's version of the transport's tooltip case: every control on a row that shows no
// words says what it is AND what state it is in — on hover, where a person's pointer goes. EVERY
// row is walked, not one checked by hand: a row is built in a loop, but a tooltip that depends on
// a track's own state (drawn or not) is exactly what goes wrong on one row and not the next.
test('every mixer control without visible text has a tooltip that tells its state', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('tracks-trigger').click();

  // Punk.gp draws its two drum tracks (rows 0 and 2) and not the guitar (row 1).
  const drawn = ['Shown in the score', 'Hidden from the score', 'Shown in the score'];
  for (const [index, renderTip] of drawn.entries()) {
    const row = page.getByTestId(`track-row-${index}`);
    // The toggle is the 44 px target itself now — no label wrapper to aim at.
    await row.getByRole('button', { name: /render/i }).hover();
    await expect(openTooltip(page)).toHaveText(renderTip);
    await row.getByRole('button', { name: /solo/i }).hover();
    await expect(openTooltip(page)).toHaveText('Solo: off');
    await row.getByRole('button', { name: /mute/i }).hover();
    await expect(openTooltip(page)).toHaveText('Mute: off');
    await row.getByRole('button', { name: /more controls/i }).hover();
    await expect(openTooltip(page)).toHaveText('Show more controls');
  }

  // And each one follows its state. A click closes the tooltip; leave and come back to read it.
  const guitar = page.getByTestId('track-row-1');
  for (const [name, after] of [
    [/solo/i, 'Solo: on'],
    [/mute/i, 'Mute: on'],
    [/more controls/i, 'Hide more controls'],
  ] as const) {
    const control = guitar.getByRole('button', { name });
    await control.click();
    await page.getByTestId('notation-surface').hover();
    await control.hover();
    await expect(openTooltip(page)).toHaveText(after);
  }
});

// Rows 0 and 1, NOT 0 and 2. AlphaTab solos a MIDI CHANNEL, and Punk.gp's two drum tracks share
// channel 9 — soloing both would be one channel soloed twice and would prove nothing.
test('solo is not exclusive — two tracks can be soloed at once', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  const soloCalls = await recordApiCalls(page, 'changeTrackSolo');

  await page.getByTestId('tracks-trigger').click();
  await page.getByTestId('track-row-0').getByRole('button', { name: /solo/i }).click();
  await page.getByTestId('track-row-1').getByRole('button', { name: /solo/i }).click();

  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /solo/i }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByTestId('track-row-1').getByRole('button', { name: /solo/i }),
  ).toHaveAttribute('aria-pressed', 'true');

  // The ENGINE heard both, and neither click un-soloed the other.
  expect(await soloCalls()).toEqual([
    [[0], true],
    [[1], true],
  ]);
});

test('mute and volume reach the engine, the volume as an absolute channel level', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  const muteCalls = await recordApiCalls(page, 'changeTrackMute');
  const volumeCalls = await recordApiCalls(page, 'changeTrackVolume');

  await page.getByTestId('tracks-trigger').click();
  const guitar = page.getByTestId('track-row-1');
  await guitar.getByRole('button', { name: /mute/i }).click();
  expect(await muteCalls()).toEqual([[[1], true]]);

  const volume = guitar.getByRole('slider', { name: /volume/i });
  const before = Number(await volume.getAttribute('aria-valuenow'));
  await volume.focus();
  await volume.press('ArrowLeft');

  // One step down on the 0-16 scale, sent on AlphaTab's OWN scale as next / 16 — the engine takes
  // an absolute channel level, not a ratio against the file's (measured: :46789-46794 forwards it
  // unscaled, and the engine's own resting level is playbackInfo.volume / 16 at :45590).
  const [[tracks, level]] = (await volumeCalls()) as [[number[], number]];
  expect(tracks).toEqual([1]);
  expect(level).toBeCloseTo((before - 1) / 16, 5);
});

// AlphaTab keeps its muted and soloed CHANNELS across a score change, and drums are channel 9 in
// every file — so without a reset, muting the drums in one score silences them in the next, beside
// a row that reads un-muted.
//
// This case asserts the reset POSITIVELY — that the call reached the synth — not merely that no
// stale mute was replayed. The distinction is the whole point: measured in a browser, the reset
// placed on `scoreLoaded` reached the synth ZERO times, because api.player is still null there,
// and an "expect no replayed mutes" assertion passes happily against that. `player.resetChannelStates`
// is a DOTTED path because it lives on the synth wrapper, not on the api.
test('opening another score starts from a clean mix', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('tracks-trigger').click();
  await page.getByTestId('track-row-0').getByRole('button', { name: /mute/i }).click();
  await page.keyboard.press('Escape');

  const mutesAfterOpen = await recordApiCalls(page, 'changeTrackMute');
  const resetCalls = await recordApiCalls(page, 'player.resetChannelStates');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/guitar-no-percussion.gp');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    'guitar-no-percussion.gp',
    { timeout: 30_000 },
  );

  await page.getByTestId('tracks-trigger').click();
  await expect(page.getByTestId('track-row-1')).toHaveCount(0); // one track now, not three
  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /mute/i }),
  ).toHaveAttribute('aria-pressed', 'false');
  // The reset REACHED the synth. This is the assertion that fails if the handler is moved back to
  // scoreLoaded, where api.player is null.
  await expect.poll(async () => (await resetCalls()).length).toBeGreaterThan(0);
  // …and the mixer does not replay the old score's mutes on top of it.
  expect(await mutesAfterOpen()).toEqual([]);
});

test('only a stringed staff with a tuning offers the tablature toggle', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();

  // The guitar staff reports tuningLen=6, so its row has the toggle. No disclosure to open:
  // the display toggles sit on the always-visible primary row.
  await expect(
    page.getByTestId('track-row-1').getByRole('button', { name: /tablature/i }),
  ).toBeVisible();

  // Both drum staves report showTablature=false, tuningLen=0 — 1.8.4 cannot render percussion
  // tablature at all, so the toggle must be absent rather than present-and-broken.
  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /tablature/i }),
  ).toHaveCount(0);
});
```

> The "clean mix" case cannot read the synth worker's channel map — nothing can, from the page. What it pins is the visible half (the rebuilt row reads un-muted, and the old score's rows are gone); the audible half is on the by-ear list in Task 10. `api.player` is a separate object from the api, so to also assert the reset call, wrap `at.player.resetChannelStates` the same way.
>
> No fixture carries an embedded recording, so the disabled-mixer state is covered by `TrackRow`'s own test, story and baselines (Task 3), and the wiring here is one prop. If a small Guitar Pro file with an audio track turns up, add the case then — do not fabricate one.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "Tracks popover|render-select|mixer control|solo is not exclusive|mute and volume|clean mix|tablature toggle"`
Expected: FAIL — no `tracks-trigger`.

- [ ] **Step 3: Write the popover**

Create `web/app/play/TracksPopover.tsx`. It owns the mixer's React state — which, for solo and mute, is the **only** record there is, because AlphaTab keeps those in the synth worker. The component itself stays mounted for the life of the page (only `PopoverContent` comes and goes), so closing the popover does not lose the mix.

The score arrives through the api's own events — there is no callback from the notation surface:

```tsx
interface MixerTrack {
  index: number;
  name: string;
  /** The level the FILE gives this track, 0-16 — the row's starting value. AlphaTab never writes
   *  playbackInfo.volume, so this stays the file's own level for the life of the score. It is NOT
   *  a denominator: the writer divides by the constant 16 (AlphaTab's own channel scale). */
  fileVolume: number;
  volume: number;
  solo: boolean;
  mute: boolean;
  transposeAudio: number;
  transposeFull: number;
  expanded: boolean;
  staves: TrackStaffState[];
}

// Plain data at the boundary, so nothing downstream holds an AlphaTab object in React state.
const toMixerTrack = (track: AlphaTab.model.Track): MixerTrack => ({
  index: track.index,
  name: track.name,
  fileVolume: track.playbackInfo.volume,
  volume: track.playbackInfo.volume,
  solo: false,
  mute: false,
  transposeAudio: 0,
  transposeFull: 0,
  expanded: false,
  staves: track.staves.map((staff, staffIndex) => ({
    id: `${track.index}-${staffIndex}`,
    showStandardNotation: staff.showStandardNotation,
    showSlash: staff.showSlash,
    showNumbered: staff.showNumbered,
    showTablature: staff.showTablature,
    // The pinned AlphaTab forces showTablature=false on any percussion staff and requires a
    // tuning, so the toggle is offered only where it can actually do something.
    tablatureAvailable: !staff.isPercussion && staff.tuning.length > 0,
  })),
});

const [tracks, setTracks] = useState<MixerTrack[]>([]);
const [renderedIndexes, setRenderedIndexes] = useState<number[]>([]);

// A new score starts from a clean mix — and AlphaTab does not do that by itself. The synth keeps
// its muted and soloed CHANNELS until told otherwise, and drums are channel 9 in every file, so a
// drummer who muted the drums would open the next score to silent drums beside an un-muted row.
// The transposition pitches have the same problem: indexed by track, held on the api.
// Rows are rebuilt from the score. No engine call here: api.player is null at this point on the
// first score and after every player swap, so a reset placed here provably never runs.
useAlphaTabEvent(api, 'scoreLoaded', (score) => {
  setTracks(score.tracks.map(toMixerTrack));
});

// NOTE — the transposition clear does NOT live here. It runs in PlayerShell's open-file handler,
// immediately before api.renderScore(...), because the engine stamps the pitches onto the new
// score's staves at the top of its own render path. See Task 7 Step 3b.

// The ENGINE side. playerReady is the first moment the player exists, and it re-fires on every
// MIDI reload and every player swap — which is exactly when AlphaTab re-seeds each drawn track's
// channel volume to playbackInfo.volume / 16 and restores nothing else. So this handler both
// clears the synth's stale mute/solo and re-asserts every row, and it must stay idempotent:
// playerReady is NOT once per score (measured: twice per loadMidiForScore, four times per
// renderScore). AlphaTab's own listener registers at construction, so ours runs after it.
useAlphaTabEvent(api, 'playerReady', () => {
  api?.player?.resetChannelStates();
  for (const row of tracks) {
    applyVolume(row.index, row.volume);
    if (row.mute) applyMute(row.index, true);
    if (row.solo) applySolo(row.index, true);
    if (row.transposeAudio) applyTransposeAudio(row.index, row.transposeAudio);
  }
});

// What AlphaTab actually DREW, not what was asked for — the same rule the rendered-track count
// follows. It also covers the first render, which picks the drum tracks without asking the mixer.
useAlphaTabEvent(api, 'renderFinished', () => {
  setRenderedIndexes(api?.tracks.map((track) => track.index) ?? []);
});
```

`setState` inside an **event handler** is fine — the lint rule that forbids it is about the body of an effect.

The handlers. Every one takes `api` from the prop, so none needs a dependency list of its own beyond it; write them as plain functions in the component body (the React compiler caches them) or `useCallback(…, [api, tracks])`:

```tsx
const patch = (index: number, change: Partial<MixerTrack>) =>
  setTracks((current) =>
    current.map((track) => (track.index === index ? { ...track, ...change } : track)),
  );

const trackAt = (index: number) => api?.score?.tracks[index];

const applyRendered = (index: number, next: boolean) => {
  const score = api?.score;
  if (!api || !score) return;
  const chosen = next
    ? [...renderedIndexes, index].sort((a, b) => a - b)
    : renderedIndexes.filter((i) => i !== index);
  // AlphaTab cannot draw nothing: an empty list falls back to the first track, and the box the
  // person just cleared would untick itself a moment later. Keep the last one ticked instead —
  // but the row DISABLES that control rather than swallowing the click (renderLockReason below).
  // Reaching here at all would be a bug: no state is set, so the box would not move by a frame.
  if (chosen.length === 0) return;
  // renderTracks takes Track OBJECTS (unlike renderScore, which takes indexes). No state is set
  // here: renderFinished reports what was really drawn.
  api.renderTracks(chosen.map((i) => score.tracks[i]));
};

const applySolo = (index: number, next: boolean) => {
  const track = trackAt(index);
  if (!api || !track) return;
  // Solo is NOT exclusive, as in AlphaTab and the reference fork: this sets one track's flag and
  // leaves every other track's alone.
  api.changeTrackSolo([track], next);
  patch(index, { solo: next });
};

const applyMute = (index: number, next: boolean) => {
  const track = trackAt(index);
  if (!api || !track) return;
  api.changeTrackMute([track], next);
  patch(index, { mute: next });
};

const applyVolume = (index: number, next: number) => {
  const track = trackAt(index);
  const row = tracks.find((t) => t.index === index);
  if (!api || !track || !row) return;
  // An ABSOLUTE channel level on AlphaTab's own scale, not a ratio against the file's level:
  // changeTrackVolume forwards its argument unscaled, and the engine's own resting level for a
  // channel is playbackInfo.volume / 16. Dividing by the file's level instead would sit about a
  // third hot before anyone touches the slider, and would fight the engine's re-assert on every
  // MIDI reload. `next` is on playbackInfo.volume's own 0-16 scale; 16 is a constant, so there is
  // no denominator to guard.
  api.changeTrackVolume([track], next / 16);
  patch(index, { volume: next });
};

const applyTransposeAudio = (index: number, semitones: number) => {
  const track = trackAt(index);
  if (!api || !track) return;
  // Audio only — no re-render. This is the half that must NOT be fused with Transpose full.
  api.changeTrackTranspositionPitch([track], semitones);
  patch(index, { transposeAudio: semitones });
};

const applyTransposeFull = (index: number, semitones: number) => {
  if (!api) return;
  // Notation AND audio. Fusing this with Transpose audio would drop the notation-transposing
  // path entirely. The write itself lives with the other live-settings writes.
  setTrackTransposition(api, index, semitones);
  patch(index, { transposeFull: semitones });
};

const applyStaffDisplay = (
  trackIndex: number,
  staffId: string,
  key: StaffDisplayKey,
  next: boolean,
) => {
  if (!api) return;
  const staffIndex = Number(staffId.split('-')[1]);
  setStaffDisplay(api, trackIndex, staffIndex, key, next);
  setTracks((current) =>
    current.map((track) =>
      track.index === trackIndex
        ? {
            ...track,
            staves: track.staves.map((staff) =>
              staff.id === staffId ? { ...staff, [key]: next } : staff,
            ),
          }
        : track,
    ),
  );
};
```

The shell of the component — the trigger carries an always-present tooltip in the same shape the Settings gear uses (Task 5): the `TooltipTrigger` renders a span **around** the `PopoverTrigger`, because this button is disabled while no player is coming:

```tsx
const RECORDING = 'Not available while the file plays its own recording';

<Popover>
  <Tooltip>
    {/* The span-wrap, not a bare stacked trigger: this button is disabled while the engine
        loads, and a disabled Button is pointer-events:none (Global Constraints). */}
    <TooltipTrigger render={<span className="inline-flex" />}>
      <PopoverTrigger
        render={
          <Button
            data-testid="tracks-trigger"
            variant="ghost"
            size="icon"
            aria-label="Tracks"
            disabled={disabled}
            className="size-11 rounded-lg text-muted-foreground"
          >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{ fontSize: 24 }}
              >
                instant_mix
              </span>
            </Button>
          }
        />
      }
    />
    <TooltipContent>Tracks</TooltipContent>
  </Tooltip>
  <PopoverContent
    data-testid="tracks-popover"
    align="end"
    side="top"
    className="w-[32rem] p-0"
    aria-label="Tracks"
  >
    <ScrollArea className="max-h-[60vh]">
      {/* Said ONCE, in words, above the rows: a disabled slider has no tooltip of its own, and a
          person should not have to hover a dimmed button to learn why the mixer is quiet. */}
      {hasBackingTrack ? (
        <p className="px-3 pt-3 text-sm text-muted-foreground">
          This file is playing its own recording, so solo, mute, volume and audio transposition are
          not available.
        </p>
      ) : null}
      {tracks.map((track) => (
        <TrackRow
          key={track.index}
          data-testid={`track-row-${track.index}`}
          name={track.name}
          rendered={renderedIndexes.includes(track.index)}
          onRenderedChange={(next) => applyRendered(track.index, next)}
          renderLockReason={
            renderedIndexes.length === 1 && renderedIndexes.includes(track.index)
              ? 'At least one track must stay shown'
              : undefined
          }
          mixUnavailable={hasBackingTrack ? RECORDING : undefined}
          // …the rest of TrackRow's props, each wired to the handler above with track.index.
        />
      ))}
      {/* The Master row (maintainer, 2026-09-21). Its volume is NOT the mixer's own state: it is
          the SAME masterVolume PlayerShell owns and the Settings ▸ Player row edits, handed down
          as a value and its existing single writer. A second piece of state here would be two
          editors for one value — the exact shape of the metronome bug, and what Plan B's
          single-writer rule exists to prevent. Solo-all and mute-all DO belong to the mixer: they
          set every row's own solo / mute, so they go through the same handlers a row click does.
          Note what soloing EVERY track sounds like: nothing. AlphaTab silences a channel only
          when some channel is soloed and this one is not (TinySoundFont.ts:204-208), so an
          all-soloed mix is identical to an un-soloed one — which is exactly why these are
          select-all checkboxes with a way back, not one-way commands.
          masterVolume is not stubbed for a backing track (alphaTab.core.mjs:40395), so this row
          stays live while a recording plays — unlike every per-track mix control. */}
      <MasterRow
        data-testid="master-row"
        volume={masterVolume}
        onVolumeChange={onMasterVolumeChange}
        // "Select all" over the rows. The aggregate is computed HERE, because the row holds no
        // state and never looks at the tracks; the row just reports the value the browser's own
        // select-all rule produces, and this writes it onto every track through applySolo /
        // applyMute — the same handlers a row click goes through, so each value keeps one writer.
        soloAll={tracks.length > 0 && tracks.every((t) => t.solo)}
        soloAllIndeterminate={tracks.some((t) => t.solo) && tracks.some((t) => !t.solo)}
        onSoloAllChange={(next) => tracks.forEach((t) => applySolo(t.index, next))}
        muteAll={tracks.length > 0 && tracks.every((t) => t.mute)}
        muteAllIndeterminate={tracks.some((t) => t.mute) && tracks.some((t) => !t.mute)}
        onMuteAllChange={(next) => tracks.forEach((t) => applyMute(t.index, next))}
        soloMuteUnavailable={hasBackingTrack ? RECORDING : undefined}
      />
    </ScrollArea>
  </PopoverContent>
</Popover>;
```

`text-muted-foreground` and the 24 px glyph match the transport row's other controls (`RESTING_INK` and `Glyph` in `TransportRow.tsx`), so the trigger reads as part of that row. `side="top"`: the trigger sits at the bottom of the page.

- [ ] **Step 3b: Clear the transposition pitches BEFORE the new score reaches the engine**

In `web/app/play/NotationSurface.tsx`, inside `renderOpenNotation`, on the line above the existing
`api.renderScore(...)` — that function is the app's only `renderScore` call site, and both render
paths go through it (the score effect and the `scoreLoaded` re-assert guard), so one insertion
covers both:

```tsx
// The pitches are indexed by track and live on the api, so the previous score's +2 on track 1
// would transpose this score's track 1 — drawn AND played. It has to happen BEFORE the score
// reaches the engine: applyPitchOffsets runs at the top of the render path, and clearing to []
// afterwards un-stamps nothing, because the write only reaches a track whose index is inside the
// array. Clearing first also leaves a transposition the FILE itself carries intact.
clearTrackTranspositions(api);
api.renderScore(notation.score, drumIndexes.length > 0 ? drumIndexes : undefined);
```

Add `web/app/play/PlayerShell.tsx`'s open-file handler to this task's file list. The mixer's own
rows already start at 0 for a new score, because `toMixerTrack` builds them from the score.

- [ ] **Step 4: Put the trigger in the transport row's free slot**

In `PlayerShell.tsx`, on the existing `<TransportRow … />`. The slot already exists — Plan B left `trailing` free for exactly this, and moved Open file to `leading`. Do not edit `TransportRow.tsx`, and do not add a `Separator`: the row has none.

```tsx
trailing={
  <TracksPopover
    api={api}
    hasBackingTrack={hasBackingTrack}
    disabled={!engine}
    // The SAME value and writer the Settings ▸ Player row uses. Two editors, one writer.
    masterVolume={apiValues.masterVolume}
    onMasterVolumeChange={applyMasterVolume}
  />
}
```

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app/play/TracksPopover.tsx web/app/play/PlayerShell.tsx \
  web/app/play/NotationSurface.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): add the Tracks popover with the full mixer row (NH-291)"
```

The mix **by ear** — that mute silences, that solo isolates, that the channel coupling behaves as recorded — is on the hand-back list in Task 10. Do not self-certify it.

---

### Task 8: The player-mode row — the file's recording, or the synthesizer

**Decided by the maintainer on 2026-09-20:** _"we should be able to change every single setting from alphatab, including enable synth or backing track. 100% do this now. I use this all the time!"_ This supersedes the spec's "a toggle between the recording and the synthesizer is out of v0" (§4), and it is the switch the registry recorded on the same day as built by no plan.

**The scenario.** A Guitar Pro file carries the real song as an embedded recording. The player plays that recording — and while it does, AlphaTab ignores the metronome, the count-in, and every track's solo, mute, volume and audio transposition, so those controls are disabled. The drummer opens Settings, sets the Player group's mode to the synthesizer, and all of them come alive: the score now plays from the sound bank, and the click can be heard. Set it back, and the recording returns.

It is a row like any other — `player.playerMode`, `source: 'settings'`, `apply: 'settings'`, a select over AlphaTab's `PlayerMode` enum, stored with the rest — and the registry measured the swap itself at about 100 ms (`settings.player.playerMode = …` plus `api.updateSettings()`). What needs a task is everything that **assumed the mode never changes**.

**Files:**

- Modify: `web/lib/alphatab/settings-schema.ts` (the row)
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `api.actualPlayerMode` and `api.isReadyForPlayback` (1.8.4, `alphaTab.d.ts:377` and `:1054`); `engine.PlayerMode`; `applySetting` (Task 5).
- Produces: `hasBackingTrack` keeps its name and every consumer — `TransportRow`, `TracksPopover` — but changes its source. `playerReady` stops latching.

- [ ] **Step 1: Add the row**

In `buildSettingGroups`, the Player group, after the five api rows:

```ts
{
  id: 'player-mode',
  source: 'settings',
  label: 'Play from',
  path: 'player.playerMode',
  // The whole enum, as the reference panel offers it. Original labels, written for a drummer:
  // what each mode DOES, not AlphaTab's identifier.
  control: {
    kind: 'select',
    options: [
      { value: 'EnabledAutomatic', label: "The file's own recording, when it has one" },
      { value: 'EnabledSynthesizer', label: 'The synthesizer, always' },
      { value: 'EnabledBackingTrack', label: "The file's own recording, always" },
      { value: 'EnabledExternalMedia', label: 'An external media player' },
      { value: 'Disabled', label: 'No playback' },
    ],
  },
  // Nothing is redrawn. updateSettings() is what makes AlphaTab build the other player.
  apply: 'settings',
},
```

`DEFAULT_PLAYER_SETTINGS.player.playerMode` is already `'EnabledAutomatic'` (Task 4) — what the shell sets, so a first edit of any other row does not change the mode.

- [ ] **Step 2: Write the failing tests**

No fixture embeds a recording, so the cases drive the mode on the bundled beat and read what AlphaTab built. Add to `web/e2e/player.e2e.ts`:

```ts
const playerModes = (page: Page) =>
  page.evaluate(() => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: { actualPlayerMode: number; isReadyForPlayback: boolean; player: unknown };
      } | null
    )?.at;
    return at
      ? { actual: at.actualPlayerMode, ready: at.isReadyForPlayback, hasPlayer: at.player !== null }
      : null;
  });

const setPlayerMode = async (page: Page, label: string) => {
  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('combobox', { name: 'Play from' }).selectOption({ label });
  await page.keyboard.press('Escape');
};

// PlayerMode.EnabledSynthesizer is 2 and Disabled is 0 in 1.8.4's enum (alphaTab.d.ts). The page
// cannot reach the enum object, so the numbers are written here, beside their source.
test('the player-mode row makes AlphaTab build the other player, and Play still works', async ({
  page,
}) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await setPlayerMode(page, 'The synthesizer, always');
  await expect.poll(async () => (await playerModes(page))?.actual).toBe(2);

  // Play must not be pressable before the new player is ready, and must work once it is.
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  expect((await playerModes(page))?.ready).toBe(true);
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

// "No playback" is a real choice, and it is STORED — so the next visit starts with no player.
// The page must say so and stay usable, not pulse a loading bar forever beside a dead Play button.
test('with playback turned off, the page settles and says why', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await setPlayerMode(page, 'No playback');

  await page.reload();
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  const play = page.getByTestId('transport-play');
  await expect(play).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0);

  // The way back is never disabled with the rest.
  await expect(page.getByTestId('settings-trigger')).toBeEnabled();
  // page.mouse, not hover(): a disabled Button takes no pointer events, so hover() would wait
  // forever. The pointer goes where a person's would — the same move the disabled-toggle case uses.
  const box = await play.boundingBox();
  if (!box) throw new Error('the Play button has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(openTooltip(page)).toContainText('Playback is turned off in Settings');
});

// The same settled state WITHOUT a reload. The case above reloads before it asserts, so it would
// pass even if a mid-session switch left the bar spinning behind a dead Play button — which is
// what happens when the mode change re-reads only the flags that come from the built player.
// `playerReady` never fires for a mode that builds no player, so the SETTINGS read has to run on
// the mode change too (Step 3's `readChosenMode`, called from `readPlayer`). No reload here.
test('switching to a mode with no player settles without a reload', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await setPlayerMode(page, 'No playback');

  const play = page.getByTestId('transport-play');
  await expect(play).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0);
  await expect(page.getByTestId('settings-trigger')).toBeEnabled();
});
```

Run: `pnpm --filter @notation-hero/web run test:e2e -g "player-mode row|playback turned off|settles without a reload"`
Expected: FAIL.

- [ ] **Step 3: Ask AlphaTab which player is playing**

In `PlayerShell.tsx`, `hasBackingTrack` is set from the score today:

```diff
- useAlphaTabEvent(api, 'scoreLoaded', (score) =>
-   setHasBackingTrack(Boolean(score.backingTrack?.rawAudioFile)),
- );
+ // The two modes that will never produce a player, read from the SETTINGS — the person's choice,
+ // not what AlphaTab built. Both are needed by `noPlayerComing` in Step 4.
+ const readChosenMode = useCallback(() => {
+   const mode = api?.settings.player.playerMode;
+   setPlaybackOff(mode === engine?.PlayerMode.Disabled);
+   setExternalMedia(mode === engine?.PlayerMode.EnabledExternalMedia);
+ }, [api, engine]);
+ // Which player AlphaTab REALLY built — not what the score would suggest. A score that embeds a
+ // recording plays from the synthesizer when the person chose that, and then the metronome, the
+ // count-in and the mixer all work. `actualPlayerMode` is AlphaTab's own answer; the enum comes
+ // off the loaded namespace because it cannot be imported.
+ const readPlayer = useCallback(() => {
+   if (!api || !engine) return;
+   setHasBackingTrack(api.actualPlayerMode === engine.PlayerMode.EnabledBackingTrack);
+   setPlayerReady(api.isReadyForPlayback);
+   // A mid-session switch settles without a reload: playerReady never fires for either of the
+   // two dead modes, so the settings read has to happen here as well as at scoreLoaded.
+   readChosenMode();
+ }, [api, engine, readChosenMode]);
+ // TWO reads, because they have two different sources of truth.
+ //
+ // "Playback is off" is the PERSON'S choice, and it is in the settings the moment the score
+ // loads. It must NOT come from actualPlayerMode: with playback off AlphaTab builds no player,
+ // so `playerReady` NEVER fires, and a reload with that mode stored would leave the flag false —
+ // Play enabled, the loading bar spinning, and Step 2's stored-"No playback" case failing.
+ useAlphaTabEvent(api, 'scoreLoaded', readChosenMode);
+ // hasBackingTrack and isReadyForPlayback need the REAL player, which does not exist yet at
+ // scoreLoaded: _onScoreLoaded fires BEFORE _setupOrDestroyPlayer (alphaTab.core.mjs:48025-48030),
+ // and that method is actualPlayerMode's only writer and returns early with no score
+ // (:46680-46710). Reading them there reports Disabled on a first load and the OUTGOING player on
+ // a swap. playerReady is the first moment the answer is true, and it re-fires on every swap.
+ useAlphaTabEvent(api, 'playerReady', readPlayer);
```

and in `applySetting`, after the engine call: `if (path === 'player.playerMode') readPlayer();` — `updateSettings()` builds the other player synchronously, so the new mode is readable straight away, while its readiness arrives later through `playerReady`.

`setPlayerReady(api.isReadyForPlayback)` replaces Plan B's `() => setPlayerReady(true)`. That closes a hazard the registry recorded on 2026-09-20 and left open: _"`playerReady` latches true, so Play stays enabled while a soundfont reloads after a recording file is replaced by a synth file."_ The same thing happens on a mode switch — the synthesizer's sound bank was never fetched while the recording played — so the latch has to go for this task to be safe.

> **Verify by running, before building on it** (a spike, not a reading — the maintainer asked for one on 2026-09-21): that `actualPlayerMode` changes synchronously inside `updateSettings()`; that `playerReady` fires again after a swap; and **that the split above is right — with `player.playerMode` stored as Disabled, reload and confirm `playerReady` never fires while the settings read still disables Play and shows its tooltip.** That last one is the case the single-subscription form got wrong. Both are read from 1.8.4's source, not measured. If `playerReady` does not re-fire, call `readPlayer` from the events that do arrive after a swap (`soundFontLoaded`, `playerStateChanged`) — but do **not** subscribe to `midiLoaded`: it overflows the stack in 1.8.4, and `useAlphaTabEvent` refuses to compile it.

- [ ] **Step 4: Make "No playback" a settled state, not an endless load**

`playbackOff` and `externalMedia` are new state beside `hasBackingTrack`, both written by `readChosenMode` in Step 3. Three places read them:

```diff
- const loadingPlayer = !failed && (!playerReady || opening);
+ // Any mode that will NEVER become ready is a settled state, not a pending one. Two qualify:
+ // Disabled, and EnabledExternalMedia — the latter drives playback from an audio or video
+ // element the app supplies, and v0 supplies none, so its player has nothing to drive it.
+ const noPlayerComing = playbackOff || externalMedia;
+ // "Not ready YET" — with playback turned off there is nothing to wait for.
+ const loadingPlayer = !failed && !noPlayerComing && (!playerReady || opening);
```

- The Play button's tooltip has THREE branches, one per dead mode, so a disabled Play button never says "Play": `playbackOff ? 'Playback is turned off in Settings' : externalMedia ? "This mode follows an outside video or audio player, such as a YouTube video, which this version does not provide yet. A recording inside the file plays fine on the other modes." : playing ? 'Pause' : 'Play'`. The button is already `aria-disabled` while `!playerReady` and stays focusable — but a disabled `Button` is `pointer-events: none`, so as its own tooltip trigger it never sees the mouse. Give it the shape `TransportToggle` got for the same reason (registry, 2026-09-20): the `TooltipTrigger` renders a `<span className="inline-flex" />` **around** the button. The span takes the hover; focus still opens it, because focus events bubble. Keep `ref={playRef}` on the `Button` — opening a file still moves focus there.
- The Settings trigger is **never** disabled by `playerReady` — it is the only way back. It is disabled only while the engine itself has not loaded (`!engine`, Task 5), which is unchanged.

**`EnabledExternalMedia` ships, and it must SETTLE like "No playback" does.** The mode drives playback from an audio or video element the app supplies — the reference fork uses it to follow a YouTube video or an audio file with the cursor, setting the mode **in code** when it has media and handing AlphaTab an `IExternalMediaHandler` at the same moment. This is **not** the file's own embedded recording — that is `EnabledBackingTrack` / `EnabledAutomatic`, which ships today and is what the row's two recording options select. Only the OUTSIDE-player case is absent: v0 has no media source and no handler, so the player it builds has nothing to drive it and `isReadyForPlayback` never turns true. Left alone it would pulse the loading bar forever behind a dead Play button whose tooltip still read "Play" — and because the mode is stored, on every later visit too. So it joins `playbackOff` in `noPlayerComing`, and the Play tooltip reads: _"This mode plays along to an audio or video file, which this version does not provide yet."_ Following a YouTube video or an audio file is a real feature worth its own ticket; this plan only makes the choice honest.

**The mixer's trigger gates on the ENGINE, not on player readiness.** `disabled={!playerReady}` would lock the Tracks popover away entirely once no player is coming — but render-select, the per-staff display toggles and Transpose full change the **drawn score** and need no player at all. Gate the trigger on `!engine` and let the rows disable their own mix controls through `mixUnavailable`, exactly as a backing-track file already does. Task 7 already ships the trigger as `disabled={!engine}` — nothing changes here, and `TracksPopover.tsx` is deliberately absent from this task's file list.

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS — including every Plan A and Plan B case. `hasBackingTrack` and `playerReady` both changed their source here, and Plan B's transport cases are what prove the FALSE branch is unchanged: no fixture embeds a recording (the largest is 25 KB), so every case in the lane runs with `hasBackingTrack` false, and Step 2's two new cases drive only the synthesizer and No playback. **Nothing in the lane ever puts AlphaTab into `EnabledBackingTrack`, so nothing here checks the new derivation's true branch.** What the flag FEEDS is covered at the prop level — `TrackRow`'s own test, story and baselines (Task 3) and `TransportRow.test.tsx`'s two `hasBackingTrack` cases — but that the flag still becomes true against a real recording is proved only by Task 10 Step 1's by-ear step. A green lane is not evidence for that half.

- [ ] **Step 6: Commit**

```bash
git add web/lib/alphatab/settings-schema.ts web/app/play/PlayerShell.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): switch between a file's recording and the synthesizer (NH-291)"
```

The switch **by ear**, on one of the maintainer's own files that embeds a recording, is on the hand-back list in Task 10.

---

### Task 9: Extend the axe gate and open the PR

**Files:**

- Modify: `web/e2e/a11y.e2e.ts`

- [ ] **Step 1: Widen the hit-area gate to the new control kinds**

`expectHitAreas` (Plan A) measures `button, a[href], label[for], [role="button"]` and the slider's 44 px `Control`. The popovers add three kinds it has never seen — text and number fields, native selects, and checkboxes — so widen its selector, in `web/e2e/a11y.e2e.ts`:

```ts
      ...document.querySelectorAll(
        [
          'button',
          'a[href]',
          'label[for]',
          '[role="button"]',
          '[data-slot="slider-control"]',
          // The popovers' fields, and ONLY the popovers': scoped to the popover content so the
          // header's BPM field stays out. That field is Base UI's NumberField.Input — a text input
          // about 14 px tall — and it is deliberately out of scope for this PR; widening the gate
          // over it would turn five /play cases red in files this plan does not otherwise touch.
          // NOT [role="checkbox"]: the design system's checkbox is a 16 px box by design, and its
          // hit target is the <label for> around it — measured above.
          // NOT the hidden inputs either: the file picker's, the range input Base UI sizes to its
          // 16 px thumb, and the checkbox's own hidden input are none of them what a finger hits.
          '[data-slot="popover-content"] select',
          '[data-slot="popover-content"] input:not([type="range"]):not([type="file"]):not([type="checkbox"])',
        ].join(', '),
      ),
```

Keep the seek-rail selector and the comment above it exactly as the file ships them: the rail is
found by `[data-slot="slider-control"]`, NOT by the Tailwind class it is measuring. Only the two
field selectors below it are new.

- [ ] **Step 2: Add the two popover-open cases**

The spec's axe lane covers `/play` with each popover open. Add to `web/e2e/a11y.e2e.ts`:

```ts
test('player has no axe violations with the Settings popover open', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').click();
  await expect(page.getByTestId('settings-popover')).toBeVisible();
  // Open EVERY group so every control kind is audited, not just the closed headers: the text
  // fields live in the colour and font groups, the selects in the general and player groups, and
  // the action buttons in Export.
  const headers = page.getByTestId('settings-popover').locator('[data-slot="accordion-trigger"]');
  for (const header of await headers.all()) {
    if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  }

  await expectNoViolations(page, 'play / settings open');
  await expectHitAreas(page, 'play / settings open');
});

test('player has no axe violations with the Tracks popover open', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
  await settleToasts(page);

  await page.getByTestId('tracks-trigger').click();
  await expect(page.getByTestId('tracks-popover')).toBeVisible();
  // Expand a drum row AND the guitar row, so the disclosure's controls — the tablature toggle
  // included — are audited too.
  for (const row of ['track-row-0', 'track-row-1']) {
    await page
      .getByTestId(row)
      .getByRole('button', { name: /more controls/i })
      .click();
  }
  // And press a solo and a mute: the pressed state is a different colour pair for axe to check.
  await page.getByTestId('track-row-1').getByRole('button', { name: /solo/i }).click();
  await page.getByTestId('track-row-1').getByRole('button', { name: /mute/i }).click();

  await expectNoViolations(page, 'play / tracks open');
  await expectHitAreas(page, 'play / tracks open');
});
```

`settleToasts` is this file's own helper: the "loaded" toast is still fading in when the popover opens, and axe folds a half-transparent toast into its contrast maths.

- [ ] **Step 3: Run it**

Run: `pnpm --filter @notation-hero/web run test:e2e a11y`
Expected: PASS. Fix violations in the markup, never by loosening the assertion or the selector. The likely ones: a row control with no accessible name, a duplicate `id` across two rows (the schema's `id` must be unique across all eight groups), contrast on a pressed solo/mute button, and a field left at the primitive's own `h-9`.

- [ ] **Step 4: Run every gate**

```bash
pnpm run check:all
pnpm run build                                    # the `build` job + its bg-clip-padding @source sentinel
pnpm --filter @notation-hero/client run test:a11y
pnpm test:vr:docker
pnpm --filter @notation-hero/client run test:e2e  # the `e2e` job runs BOTH lanes
pnpm --filter @notation-hero/web run test:e2e
```

Expected: all PASS.

- [ ] **Step 5: Update the decision registry**

`docs/decisions/decision-registry.md`, a new Change-log entry at the top, in this PR (AGENTS.md, "Decision governance"). Record what is now **enforced**, and every place the build superseded an older line:

- The three new design-system components — `Accordion`, `SettingRow`, `TrackRow` — gated by VR + axe.
- The settings-persistence shape: one `localStorage` key, AlphaTab's settings JSON plus a `version`, restored **before** the api is built, merged per key and per type, a toast on a real corruption.
- `live-settings.ts` is the app's one `updateSettings()` funnel — closing the fork-parity triage's finding F-C3, deferred on 2026-09-18 to its first caller. Tick that item on NH-302.
- **Spec Delta:** Transpose audio is disabled with solo, mute and volume while a file plays its own recording. The spec's §7 lists three; 1.8.4's backing-track synthesizer stubs a fourth.
- **Spec Delta:** the accepted channel coupling covers solo and mute, not only volume (§7 records volume alone).
- **New:** a score change resets the synth's channel states and the transposition pitches — AlphaTab keeps both across scores.
- **Spec Delta, by the maintainer's decision (2026-09-20):** the Settings popover ships every row of the reference panel, including the player-mode row — superseding the spec's "a toggle between the recording and the synthesizer is out of v0" (§4). `hasBackingTrack` now comes from `api.actualPlayerMode`, and `playerReady` no longer latches — which closes the hazard the 2026-09-20 hands-on entry recorded and left open.
- **New:** a settings row names how it takes effect — `render`, `settings` or `midi` — and the Stylesheet group writes to the open score's model, not to the settings. Both are enforced by e2e cases that read the engine.
- Metronome and Count-In are volumes with one writer each; the transport buttons read `> 0`.
- The 44 px gate now measures the popovers' fields and selects; `Input` and `NativeSelect` stay `h-9` in the design system and are raised to `h-11` per call site — a design-system default of 44 px is a separate question, not answered here, and neither is the header's BPM field, which stays under 44 px and outside the gate's scope.

- [ ] **Step 6: Commit, push, open the PR**

```bash
git add web/e2e/a11y.e2e.ts docs/decisions/decision-registry.md
git commit -m "test(web): axe and hit areas over both open popovers (NH-291)"
git push
gh pr create --title "feat: v0 settings and tracks popovers (NH-291)" --body "$(cat <<'EOF'
## What & why

The player gets its two popovers: the header gear opens every AlphaTab setting the reference panel
exposes, and the transport's mixer gets one row per track. Together they close v0 success criteria
3 and 7. Neither popover blocks playback — that is the whole reason v0 chose a popover over a modal. The
fourteen sound-rebuilding rows are the one measured exception: regenerating the MIDI stops and
rewinds the player, and an e2e case pins that behaviour rather than letting it look like a bug.

## Jira

- Closes [NH-291](https://leocaseiro.atlassian.net/browse/NH-291)

## How to test

Open the preview, then walk the two by-hand checks in Task 10 of
`docs/plans/2026-09-13-v0c-popovers-plan.md`: the mix by ear, and every settings group by eye.

Implements Plan C of the v0 local-file drum player.

Spec: `docs/specs/2026-09-10-v0-local-file-player-design.md`
Plan: `docs/plans/2026-09-13-v0c-popovers-plan.md`

## New design-system components

`Accordion`, `SettingRow`, `TrackRow` — each with a Storybook story plus VR and axe baselines that block merge. `Accordion` completes the three new components the spec called for, and it is what v0.1's settings search builds on.

## Success criteria covered

- [ ] 3 (per-track mute/solo half) — solo, mute and volume change the audible mix. **Needs ears — handed back, not self-certified.**
- [ ] 7 — the Settings rows change the rendered score (and the sound, for the rows that shape it); the Tracks popover lists every track and its rows work in both directions (solo/mute/volume for the mix, render-select for what is drawn, display toggles and both transposition sliders for the rendered score). **The rows reaching the engine is machine-checked; that each one LOOKS right needs eyes — handed back.**

Tablature is excluded from criterion 7 by the spec: 1.8.4 cannot render it on a percussion staff.

## Notes

- **The port is clean-room.** The reference fork (`rhythm-game` branch, MPL-2.0) was read, not copied — no files, no code, no label strings. All label copy is original.
- **Accepted coupling:** AlphaTab applies volume, solo and mute to a track's primary AND secondary MIDI channels, so tracks sharing a channel move together. `Punk.gp`'s two drum tracks are both on channel 9, so muting, soloing or turning down one does the same to the other. Expected v0 behaviour, not a defect.
- **A file that plays its own recording** disables solo, mute, volume and Transpose audio, with the reason in a tooltip and in a line above the rows: AlphaTab's backing-track player ignores all four.
- Settings persist under one `localStorage` key with a version integer, restored through `Settings.fillFromJson` before the engine is built, and merged per key against the shipped defaults. A corrupt value falls back and raises a toast rather than reverting silently. The playback speed and master volume are not persisted (NH-295).
- **Every row of the reference panel that can do anything ships — 90**, by the maintainer's decision: 71 settings, 5 api properties, 12 score-stylesheet properties and 2 actions. Two of the fork's font rows are dropped because 1.8.4 ignores them on every write path; nine more are re-keyed onto `elementFonts`, where they actually work. That includes the **player-mode row**, which switches between a file's own recording and the synthesizer and supersedes the spec's v0 boundary. Three of the reference panel's rows are bound wrongly there — two to the wrong key, one to the wrong enum; this build uses the right ones.
- `EnabledExternalMedia` is offered because every mode is, but this app provides no external media handler, so it plays nothing.

## Pulumi preview

n/a — this PR touches no `infra/` files.
EOF
)"
```

The `pr-checklist-sync` workflow appends the merge checklist to the body when the PR opens; tick only what is true. After it opens, read CI with the PR tools rather than polling `gh run watch`, and do **not** edit the PR body while a run is in progress — a body edit re-triggers CI and cancels the run in flight.

---

### Task 10: 🧑 Hand back the two human gates, and close out v0

Nothing in this task is done by an agent. It is the hand-back: one message to the maintainer, once, when the PR is open and green.

- [ ] **Step 1: 🧑 HUMAN GATE — the mix, by ear** (criterion 3's mute/solo half, and criterion 7's audible half)

On the PR's preview deployment, with `Punk.gp` open and playing:

1. Mute **Distortion Guitar** — the guitar goes silent, the drums do not.
2. Solo **Distortion Guitar**, then also solo **Drumkit** — both are audible together; solo is not exclusive.
3. Move **Distortion Guitar**'s volume — its level changes.
4. Set **Transpose audio** on the guitar to +2 — its pitch rises and the notation does not move. Set **Transpose full** to +2 — the notation moves too.
5. The accepted coupling: mute **Drumkit** — **Drumkit Left** goes silent as well, while its own Mute button stays un-pressed. Both tracks are on MIDI channel 9. That is the recorded behaviour, not a bug.
6. **The two master boxes, and the way back out of each.** With two rows soloed, **Solo all** shows the mixed dash; press it — every row solos, which sounds like the full mix (that is the engine's rule, not a bug); press it again — every row un-solos. Same for **Mute all**: press it from the mixed dash to silence everything, then un-tick ONE row to hear just that track. Neither box may leave the mixer in a state only a row-by-row click can undo.
7. With something muted, open another score — nothing in it is muted.
8. **The player mode, on one of your own files that embeds a recording.** It opens playing the recording, with Metronome, Count-In and the mixer disabled. Set **Play from** to the synthesizer: the sound changes to the sound bank, and all of those controls come alive and work. Set it back: the recording returns. Reload the page in each mode — the choice survived.
9. In the Player group, change a vibrato or slide row on a guitar score and play — the sound changes without reopening the file.

- [ ] **Step 2: 🧑 HUMAN GATE — every settings group, by eye** (criterion 7's drawn half)

The lane already proves every row names a real AlphaTab key. What it cannot see is a value edited in two places that drift apart, a row with the wrong `apply` (the value changes, and the score does not redraw or the sound does not change until something else forces it), or a change that simply draws wrong. Walk it in this order — most consequential first:

1. **Every value with a SECOND EDITOR.** These are the ones that can disagree, and disagreement is silent: speed (the header stepper ↔ the Player row), master volume (Settings ▸ Player ↔ the mixer's Master row), metronome volume and count-in volume (the transport buttons ↔ their Player rows), loop (the transport ↔ its Player row), and each track's solo and mute (the row's own buttons ↔ the Master row's select-all boxes). Move each in ONE place; confirm the other editor follows and that the sound actually changed. A track's own volume is not on this list — it has one editor, and Step 1 item 3 is what checks it.
2. **One row of each WAY OF TAKING EFFECT** — four checks, and the only ones that can catch a wrong `apply`. AlphaTab applies faithfully whatever it receives; `apply` is our choice about when to hand it over, so a row marked `render` that needs `midi` never reaches the engine at all. Change one row that redraws, one that is pushed without a redraw, one that rebuilds the sound (expect the player to stop and rewind — that is correct, see Global Constraints), and one stylesheet row.
3. **One row in each of the eight sections** — Player, Display ▸ General, Colors, Fonts, Paddings, Notation, Stylesheet, Export — watching the score.
4. **Press both Export buttons** and open the two files they download.

- [ ] **Step 3: Take stock of the v0 acceptance set across all three plans**

Criteria 1, 3, 5, 6, 7, 8, 9 and 10 should now be met. **Criterion 9 is verified by running** — `web/e2e/fixtures/guitar-no-percussion.gp` and its e2e case landed with Plan A (the spec's Q7 is closed). Criteria **2** (audible audio) and **4** (the maintainer's own files) have no machine evidence and never will — headless Chromium is silent — so they stand on the by-ear checks of Plans A, B and this one. Still untested: `.gp3`, `.gp4` and `.capx` (the spec's Q6 — they need real Guitar Pro 3/4 and Capella exports; renaming a `.gp5` proves nothing, because `ScoreLoader` reads the bytes). Say all of that plainly in the epic rather than marking v0 complete.

---

## Self-Review

**Spec coverage.** §7 "Two popovers, not modals" → Tasks 5 and 7, with the non-blocking property asserted in Task 5's own test. §7 Settings groups (Display ▸ General, Colors, Fonts, Paddings, Notation, Player, Stylesheet, Export) → Task 4, with a full row inventory by AlphaTab key rather than counts; the Export group (renamed from Tools — maintainer, 2026-09-21) is the v0.1 spec's two Action rows (its §4); the player-mode row → Task 8. §7 "Colors are plain text inputs for now" → **Spec Delta**: the six colour rows use `SettingRow`'s `color` kind, not `text`, because a half-typed hex parses to a null `Color` the renderer throws on; the `text` kind holds the font rows and commits on blur or Enter. Called out in its comment. §7 Tracks row full control set (render-select, solo, mute, volume, per-staff display toggles, both transposition sliders) → Tasks 3 and 7. §7's volume-as-ratio with a zero guard → **Spec Delta** (Global Constraints): the engine takes an ABSOLUTE channel level, so the writer sends `next / 16` and no zero guard is needed; the 0–16 scale is unchanged → Tasks 3 and 7. §7 channel coupling → stated in Global Constraints, in `TrackRow`'s comment, in Task 10's by-ear list and in the PR body — and widened to solo and mute, which the spec does not record. §4 and §7 "a file that plays its own recording disables solo, mute and volume, with a tooltip" → Tasks 3 and 7, plus Transpose audio (a Spec Delta, with the source line that justifies it). §7 tablature only for a tuned stringed staff → Tasks 3 and 7, each with a test. §7 eight-controls disclosure → Task 3. §7 "compose controls that already exist" → `SettingRow` composes `Field`, `Checkbox`, `Input`, `NativeSelect`, `Slider`, `Button`; none is new. §7 settings persistence, `fillFromJson`, the per-key merge and the reset toast → Task 6, with both the reload and the corrupt-value paths as e2e cases. §7 the speed slider in the Player group → Task 4's `source: 'api'` row, written by `PlayerShell`'s `applySpeed` (Plan B's single-writer rule), over the engine's 12.5–800 % range (registry, 2026-09-20, superseding the spec's 200 %). The always-present, state-telling tooltip on every control without visible text (registry 2026-09-20, and the maintainer on this plan) → Global Constraints, a unit case in Task 3 and an e2e case in Task 7 that walks every row of the open mixer, then re-reads each tooltip after its state changed. §4's 44 px rule → `expectHitAreas` with each popover open, Task 9. §8 criteria 3 and 7 → Tasks 5, 7 and 9. **Deliberately not covered here:** everything in Plans A and B; v0.1's search index and tab chrome; drum tablature (needs a version bump, Q5); persisting the speed (NH-295).

**Decisions taken after the re-triage (maintainer, 2026-09-20).** The Settings popover is the same as the reference panel — every row. All five api-property rows ship, and the player-mode row ships with its own task (Task 8), superseding the spec's §4 boundary. Asked to confirm the plan had every row, the re-triage replaced the plan's row COUNTS with a full inventory by AlphaTab key (Task 4 Step 1): 90 rows, four sources, three ways a settings row takes effect.

**Placeholder scan.** Two tasks describe rather than transcribe, and both name the exact source of the answer: Task 3's component body is specified as a requirement list plus the one comment that must appear (the test file above it is complete and is the real specification), and Task 4's schema shows the pattern rows with an explicit instruction that a group left as a comment is an unfinished task, not a deferral. Two things are flagged as **read, not run**: that a score change needs `resetChannelStates()` (Global Constraints — Task 7's case and Task 10's by-ear item 6 are what prove it), and that a `TooltipTrigger` rendering a span **around** a `PopoverTrigger` opens on hover and on focus (the shape `TransportToggle` already ships; Task 5 verifies it in the browser while the gear is still disabled). Every other library fact in the plan was checked against the installed package, with the file and line beside it.

**Type consistency.** `SettingControl` and `SettingValue` are declared once in `SettingRow.tsx`, re-exported from the barrel, and imported by `settings-paths.ts` and `settings-schema.ts`. `PlayerSettingsJson` is declared once in `settings-paths.ts` and is the same type in the schema, the storage module, `live-settings.ts` and `PlayerShell`. `readSettingValue` / `writeSettingValue` keep one name and one signature in the module, the schema's re-export and the test. `SettingDescriptor` is a union discriminated on `source` (four members), and `SettingsPopover` narrows on it before it touches `path`, `key` or `action`. `SettingApply` is declared in the schema and is the third parameter of `onSettingChange`, `applySetting` and `applySettingsJson` alike — no `rerender` boolean survives anywhere. `ApiValueKey` is spelled identically in the schema, `SettingsPopover`'s props and `PlayerShell`'s `applyApiValue`; `'masterVolume'` is added to `useAlphaTab.ts`'s `AlphaTabApiValue` in the same task that first writes it. `TrackStaffState.tablatureAvailable` is spelled identically in `TrackRow`'s props, its tests, and `toMixerTrack`. `StaffDisplayKey` is declared in `live-settings.ts` and used by `TracksPopover`. The `data-testid` values are declared in the task that creates them and reused verbatim: `settings-trigger`, `settings-popover`, `tracks-trigger`, `tracks-popover`, `track-row-<index>`; the expand control's accessible name is `More controls for <track>` in `TrackRow`, its tests and both e2e files.
