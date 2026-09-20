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
> - **The Tools group is two action rows** (Export MIDI, Export Guitar Pro — v0.1 spec §4), and the
>   fork's Player group has **five** rows that are `AlphaTabApi` properties, not one. The schema gains a
>   `source` so both kinds are real rows that v0.1's search can index.
> - **Base UI 1.6's accordion prop is `multiple`**, not `openMultiple` — verified against the
>   installed types.
> - **The 44 px checks are automated** (`expectHitAreas`, from Plan A), and `Input`, `NativeSelect`
>   and `Checkbox` are all under 44 px as built, so the rows pad them.
>
> **Two decisions are still open and are marked `🟥 OPEN DECISION` where they bite** — which of the
> five API-property rows ship (Task 4), and whether the `player.playerMode` row ships (Task 4).

> **🧑 HUMAN GATES.** Two checks in this plan need a person: the mix **by ear**, and a walk through
> every settings group **by eye**. They are collected in Task 9 and handed back **once, at the end** —
> the maintainer's choice for Plan B (registry, 2026-09-20), carried over. An agentic worker never
> self-certifies them and never ticks the success-criteria box they back: this repo's `pr-checklist`
> gate checks that a box is ticked, not that the claim is true.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player its two popovers — Settings (the header gear: eight accordion sections of rows that change the rendered score, and that survive a reload) and Tracks (the transport's mixer: one row per track in the score, with solo, mute, volume, render-select, the per-staff display toggles and both transposition sliders).

**Architecture:** Two new presentation-only components in `client/` (`Accordion` and `SettingRow`) plus a `TrackRow`, each gated by a Storybook story with VR and axe baselines. `web/` owns the schema of groups with an accessor per row, one module that holds every write to the live engine's settings, and both popover compositions. Neither popover blocks the player: a drummer can change a setting while the score plays.

**Tech Stack:** `@base-ui/react` 1.6 (`accordion`, `popover`, `slider`), Tailwind 4 tokens, Storybook 10, Playwright 1.61.1 + axe.

**Spec:** [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) — §7 from "Two popovers, not modals" to the end is this plan's brief.

**Reference (read-only):** the `rhythm-game` fork at `/Users/leocaseiro/Sites/alphaTabWebsite`, branch `rhythm-game` — `src/components/AlphaTabRhythmGame/playground-settings.tsx` (1,279 lines) is the settings panel this ports. **Clean-room: read it, copy nothing.** No files, no code blocks, no label strings. Write original code and original label copy. That is decision D4 and the [2026-06-18 licensing spike](../spikes/2026-06-18-file-formats-and-licensing.md); the fork is MPL-2.0 and stays open for reference only.

**Depends on:** [Plan A](2026-09-13-v0a-engine-and-first-sound-plan.md), merged as PR #159 — the engine context, `/play`, `useAlphaTab` / `useAlphaTabEvent`, `setAlphaTabDefaults`, and the Playwright lane with its `expectNoViolations` and `expectHitAreas` helpers — and [Plan B](2026-09-13-v0b-transport-plan.md), PR #162 — `Slider` (with `onCommit`), `TransportToggle`, the transport row's free `trailing` slot, the header's empty right column, and `PlayerShell`'s `applySpeed` and `hasBackingTrack`. **Branch from `master` only after PR #162 has merged**: Tasks 2, 3, 5 and 7 import what it adds.

**Jira:** epic [NH-291](https://leocaseiro.atlassian.net/browse/NH-291).

**Closes success criteria:** 3 (per-track mute/solo half) and 7 (the Settings rows change the rendered score; the Tracks popover lists every track and its rows work in both directions).

---

## Global Constraints

Every task's requirements implicitly include this section, plus **all of Plan A's and Plan B's Global Constraints**, which still bind.

- **The api is React state, never a ref.** `PlayerShell`'s `Player` owns it — `const [api, hostRef] = useAlphaTab(settingsInit)` — and passes it **down as a prop**, typed `AlphaTabApi | undefined`. There is no `apiRef`, no `onApiReady`, no `onScoreLoaded`. Because `api` is state, it **must** be in every `useCallback` dependency list: an empty list freezes the callback on the `undefined` it held before the engine arrived, and the control then flips its own React state while the engine never hears about it.
- **Every subscription goes through `useAlphaTabEvent(api, 'eventName', handler)`.** No `.on()` by hand. Both popovers mount and unmount while the api stays alive, which is exactly the case that helper exists for.
- **Every write to an engine object lives in `web/lib/alphatab/`, never in a component or a hook body.** The api reaches components through `useState`, so React's compiler lint (`react-hooks/immutability`, an error under `eslint . --max-warnings 0`) rejects `api.settings.notation.transpositionPitches = …` or `staff.showSlash = …` inside one. Plan B's `setAlphaTabValue` is the precedent; Task 4 adds `live-settings.ts` beside it. That module is also the **one `updateSettings()` funnel** — mutate, push, redraw when asked — that the fork-parity triage deferred to its first caller (finding F-C3, tracked in NH-302). Nothing else in the app calls `api.updateSettings()`.
- **Never run an engine side effect inside a `setState` updater.** React may invoke an updater twice (it does in Strict Mode), which would push the settings and redraw the score twice. Compute the next value, call `setState(next)`, then call the engine.
- **Never call `setState` synchronously inside a `useEffect`.** `react-hooks/set-state-in-effect` is an error in `web/`. The stored settings are read in a lazy `useState` initialiser instead (Task 6).
- **Test the engine, not only the app.** A `data-*` attribute or an `aria-pressed` mirrors React state and flips even when the write never reached AlphaTab. Every e2e case that claims an engine change reads the engine through the debug handle `useAlphaTab` parks on the host element (`document.querySelector('[data-testid="notation-surface"] > div').at`), as Plan B's toggle case does.
- **Code comments name the thing, never a plan-local number.** "(Task 4)" or "Plan B's Global Constraints" means nothing to a reader outside this document (registry, 2026-09-18). Prose, steps and tables keep their numbers; the code blocks below do not carry them.
- **Clean-room port.** Read the fork to learn the group list, the row set and the accessor pattern; write everything yourself. No copied code, no copied label strings. If you cannot restate a row's purpose in your own words, you do not understand it well enough to port it.
- **Both popovers, never modals.** Neither blocks the player — that is the single reason v0 chose a popover, and v0.1 keeps it. `Dialog` is not built and is not needed.
- **Every `client/` component here is presentation-only**: `value` in, `onChange` out, option lists as plain arrays, and **no import from `@coderline/alphatab`**. A `client/` Storybook story has no engine instance, so a row that read its options off the library would be gated while rendering fabricated options. The schema of accessors and the context carrying the namespace live in `web/`.
- **Each new `client/` component needs all six co-located files** (`X.tsx`, `X.stories.tsx`, `X.story-ids.ts`, `X.test.tsx`, `X.a11y.ts`, `X.vr.ts`) in its own folder. Never `__tests__/` or `stories/`.
- **VR baselines are Linux-only** — `pnpm test:vr:docker:update` with Docker Desktop running (`open -a Docker`), never natively on macOS. Kill any `:6006` Storybook first.
- **Every control's hit area is at least 44 px, and the lane measures it.** Plan A's `expectHitAreas` (`web/e2e/a11y.e2e.ts`) runs with each popover open (Task 8); nothing is checked by eye. Three primitives these rows compose are **under** 44 px as built — `Input` and `NativeSelect` are `h-9` (36 px), `Checkbox` is `size-4` (16 px) — so `SettingRow` and `TrackRow` pass `h-11` to the first two and put each checkbox inside a label that is at least 44 × 44.
- **Every icon-only button has a tooltip that tells its state, always present** (registry, 2026-09-20). That covers the Settings gear, the Tracks trigger, and `TrackRow`'s solo, mute and expand controls. Never render the tooltip conditionally: swapping the wrapped and the bare element remounts the button and drops its focus.
- **A disabled control is `aria-disabled`, never natively disabled** — the design system's `Button` (NH-304) and `TransportToggle` already do this. A natively disabled button takes no focus and no hover, so the tooltip saying _why_ it is unavailable could never open. Tests assert `aria-disabled="true"`, not `toBeDisabled()`.
- **A file that plays its own recording disables the mixer** (spec §4 and §7). `PlayerShell` already holds `hasBackingTrack` (`Boolean(score.backingTrack?.rawAudioFile)` — AlphaTab's own condition for choosing its backing-track player). While it is true, every row's **solo, mute, volume and Transpose audio** render disabled with a tooltip saying the file is playing its own recording. Transpose audio is not in the spec's list; it is here because 1.8.4's `BackingTrackAudioSynthesizer` stubs `setChannelTranspositionPitch` and `applyTranspositionPitches` exactly as it stubs `channelSetMute`, `channelSetSolo` and `channelSetMixVolume` (`alphaTab.core.mjs:40427-40432`), and the spec's rule is that a control must never look live and do nothing. Render-select, the display toggles and Transpose full stay enabled: they change the drawn score, which still works.
- **Solo is not exclusive**, as in AlphaTab and the fork. Soloing a second track does not un-solo the first.
- **Volume is applied as a RATIO, not an absolute**: `api.changeTrackVolume([track], next / track.playbackInfo.volume)`, and the ratio must guard a zero denominator. `next` uses `playbackInfo.volume`'s own **0–16** scale. The ratio is against the level **the file gives the track**, and it is not cumulative: in 1.8.4 `changeTrackVolume` only forwards a mix volume to the synth and never writes `playbackInfo.volume`, so the denominator stays the file's value for the life of the score.
- **Accepted coupling — volume, solo AND mute:** `changeTrackVolume`, `changeTrackSolo` and `changeTrackMute` each act on the track's primary **and secondary** MIDI **channel**, not on the track (`alphaTab.core.mjs:46789-46871`), so tracks sharing a channel move together. `Punk.gp`'s two drum tracks are both on channel 9: muting Drumkit silences Drumkit Left as well, soloing one solos both, and their volume sliders are **not** independent — while each row's own button still shows only what was clicked on it. That is expected v0 behaviour — do not "fix" it, and do not write a test that asserts independence. A test that needs two independent tracks uses Drumkit (row 0) and Distortion Guitar (row 1).
- **None of `changeTrackSolo` / `changeTrackMute` / `changeTrackVolume` writes anything readable on the main thread** — the state lives in the synth worker. So the mixer's React state is the only record of what is soloed or muted, it is rebuilt from the score on every `scoreLoaded`, and an e2e case proves a click reached the engine by wrapping the api method through the debug handle and recording its arguments (Task 7).
- **A new score must start with a clean mix, and AlphaTab does not do that by itself.** The synth keeps its muted and soloed **channels** until someone calls `resetChannelStates()`, and nothing inside 1.8.4 calls it on a score change (the identifier appears only on the public surface — `alphaTab.core.mjs:33711`, `38911`, `40079`, `45179`). Drums are channel 9 in every General MIDI file, so without a reset a drummer who muted the drums in one score opens the next one to silent drums beside a row that reads un-muted. `settings.notation.transpositionPitches` has the same shape of problem: it is indexed by track and lives on the api, so a Transpose full of +2 on track 1 would carry into the next score's track 1. On every `scoreLoaded` the mixer therefore calls `api.player?.resetChannelStates()`, clears the transposition pitches through the funnel, and rebuilds its rows. _Established by reading the source, not by running — Task 7's e2e case is what proves it._
- **The tablature toggle appears only for a stringed staff that has a tuning.** The pinned 1.8.4 cannot render percussion tablature at all: `Staff.finish()` forces `showTablature = false` on any percussion staff, and `TabBarRendererFactory` sets `hideOnPercussionTrack = true` and requires `staff.tuning.length > 0`. `Punk.gp` confirms it — its two drum staves report `showTablature=false, tuningLen=0` while its guitar staff reports `true, 6`. Piano and vocal staves carry no tuning either, so they are ruled out too.
- **Transpose Audio and Transpose Full are two separate controls and must stay separate.** Fusing them drops the notation-transposing path entirely.
- **`Settings` has `fillFromJson` but no `toJson`.** There is no way to ask AlphaTab for its current settings as JSON, so the app holds its own `SettingsJson`-shaped object as the edit state and pushes it into the live settings. That object is both the UI state and the persisted value.
- **Restore through `Settings.fillFromJson(parsed)`, never by assignment.** `JSON.parse` returns plain objects, but `RenderingResources` holds real `model.Color` and `model.Font` instances — a plain object assigned into the settings tree breaks rendering **without throwing**, so a `try`/`catch` would never fire and the Colors and Fonts groups would silently stop working. `fillFromJson` is public and `@target web` in 1.8.4 and rebuilds both through their `fromJson` helpers.
- **Some Player-group rows are `AlphaTabApi` properties, not settings — and `fillFromJson` ignores them without a word.** The fork's Player group binds five rows to the api instead of to `api.settings`: `masterVolume`, `metronomeVolume`, `countInVolume`, `playbackSpeed` and `isLooping`. None is a key in AlphaTab's `SettingsJson`, so a row that wrote `player.playbackSpeed` into the JSON would move its slider, update its number, and change nothing audible. The schema therefore gives every row a `source` (Task 4): a `settings` row goes through the JSON and the funnel; an `api` row is bound to state `PlayerShell` already owns, and is written by the shell's **single writer** for that value (`applySpeed`, `applyLooping`, `applyMetronome`, `applyCountIn` — Plan B). That is what keeps two editors of one value in sync: the header's BPM stepper and the Player group's speed row are one `speed`, one writer.
- **The speed range is the engine's own: 12.5 %–800 %** — `SynthConstants` clamps `playbackSpeed` to `0.125`–`8` (registry, 2026-09-20, superseding the spec's 12.5–200 %). The Player group's speed row uses the same range as the header's `TempoControl`.
- **API-property rows are not persisted in v0.** The stored value is AlphaTab's settings JSON and nothing else (spec §7). Whether the playback speed should survive a reload is [NH-295](https://leocaseiro.atlassian.net/browse/NH-295); do not answer it here by widening the stored shape.
- **Keys the shell owns per instance are not rows.** `PlayerShell`'s `settingsInit` and `setAlphaTabDefaults` set `core.file`, `core.tracks`, `core.fontDirectory`, `core.logLevel`, `player.soundFont` and `player.scrollElement`. A row over any of them lets a stored value break the page on the next visit (a stale `core.file`, a missing sound bank). Where the fork has such a row, leave it out and say so in the PR. For the keys that **are** rows and that the shell also sets — `player.enableCursor` (true), `player.scrollMode` (Continuous) and `player.scrollOffsetY` (-10) — the shipped default in Task 4 must equal what the shell sets, because the first edit pushes the **whole** JSON through `fillFromJson`.
- **`web/` has a unit-test runner.** Vitest, `pnpm --filter @notation-hero/web run test`, tests co-located as `X.test.ts` beside `X.ts` and importing `describe` / `expect` / `it` from `'vitest'` explicitly — `web/lib/alphatab/drum-tracks.test.ts` is the pattern.
- `@coderline/alphatab` 1.8.4 facts this plan relies on, each checked against the installed package: `api.settings: Settings`, `api.updateSettings()`, `api.render()`, `api.renderTracks(tracks: Track[])`, `api.tracks` (what is drawn now), `api.changeTrackMute(tracks, mute)`, `api.changeTrackSolo(tracks, solo)`, `api.changeTrackVolume(tracks, ratio)`, `api.changeTrackTranspositionPitch(tracks, semitones)`, `api.player?.resetChannelStates()`, `api.downloadMidi()`, `exporter.Gp7Exporter#export(score, settings): Uint8Array` (on the namespace object), `settings.notation.transpositionPitches: number[]` (indexed by track), `track.playbackInfo.volume` (0–16), `staff.showStandardNotation | showSlash | showNumbered | showTablature`, `staff.tuning: number[]`. `fillFromJson` reads an enum from its **name**, case-insensitively, as well as from its number (`JsonHelper.parseEnum`, `alphaTab.core.mjs:25045`).
- `@base-ui/react` 1.6.0 facts, checked against the installed types: the accordion root's prop is **`multiple`** (`AccordionRoot.d.ts:84`; `openMultiple` was the pre-1.0 name and does not exist), and the trigger's open-state attribute is **`data-panel-open`**.

---

## File Structure

**Created — `client/src/components/ui/`**

| Folder        | Responsibility                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accordion/`  | Collapsible sections. The third and last of the spec's three new design-system components, and the one v0.1's settings search builds on.                                   |
| `SettingRow/` | One settings row: label left, control right. Renders a toggle, a number input, a number-with-slider, a text input, a dropdown or an action button from a plain descriptor. |
| `TrackRow/`   | One mixer row: an always-visible primary cluster plus a disclosure holding the display toggles and both transposition sliders.                                             |

**Created — `web/`**

| File                                   | Responsibility                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `web/lib/alphatab/settings-paths.ts`   | Dot-path read and immutable write over the settings JSON. Co-located `settings-paths.test.ts`.                                 |
| `web/lib/alphatab/settings-schema.ts`  | The eight groups and their rows. Each row names its `source`: a settings path, an api value, or an action. No JSX.             |
| `web/lib/alphatab/settings-storage.ts` | Read, merge, validate and write the persisted settings JSON. Co-located `settings-storage.test.ts`.                            |
| `web/lib/alphatab/live-settings.ts`    | Every write to the LIVE engine's settings, tracks and staves — the one `updateSettings()` funnel. No React.                    |
| `web/app/play/SettingsPopover.tsx`     | The gear popover: accordion sections of `SettingRow`s, driven by the schema.                                                   |
| `web/app/play/TracksPopover.tsx`       | The mixer popover: one `TrackRow` per track in the score. Owns the mixer's React state and rebuilds it on every `scoreLoaded`. |

**Modified**

| File                                                  | Change                                                                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/index.ts`                                 | Export `Accordion*`, `SettingRow`, `TrackRow`, `Popover*` and `ScrollArea` — what a `web/` screen imports, and nothing else (spec D3).                      |
| `client/src/components/ui/{Popover,ScrollArea}/*.tsx` | Add `'use client'` — both lack it today. `Field`, `Checkbox`, `Input` and `NativeSelect` are reached only through `SettingRow` / `TrackRow`, which have it. |
| `web/app/play/PlayerHeader.tsx`                       | Gain an `actions` slot for the right column Plan B left empty. The shell passes the Settings popover into it.                                               |
| `web/app/play/PlayerShell.tsx`                        | Hold the settings state; restore it before the api is built; persist on change; pass both popovers into their slots.                                        |
| `web/e2e/player.e2e.ts`, `web/e2e/a11y.e2e.ts`        | Cases for criteria 3 and 7, axe with each popover open, and `expectHitAreas` widened to the new control kinds.                                              |

`web/app/play/TransportRow.tsx` and `web/app/play/NotationSurface.tsx` are **not** modified. The row already has a `trailing` slot, left free for this plan's Tracks trigger, and the mixer learns the score's tracks from `scoreLoaded` and what is drawn from `renderFinished` — it needs nothing from the notation surface.

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
  <Accordion defaultValue={['notation']}>
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
  | { kind: 'text' }
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
      label="Playback speed"
      control={{ kind: 'range', min: 0.125, max: 2, step: 0.125 }}
      value={1}
      onChange={() => {}}
    />,
  );

  expect(screen.getByRole('spinbutton', { name: 'Playback speed' })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: 'Playback speed' })).toBeInTheDocument();
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

// The Tools group: a row whose control is a command, not a value.
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

> jsdom has no layout, so the 44 px rule cannot be unit-tested here. It is enforced where it can be measured: `expectHitAreas` in the `web` lane, with the popover open (Task 8).

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
  | { kind: 'text' }
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
// Colours are plain text inputs for now; a colour-picker row can replace them in a later release.
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
  const reportNumber = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() !== '' && !Number.isNaN(parsed)) onChange(parsed);
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
          disabled={disabled}
          // h-11, not Input's own h-9: 36px is under the 44px minimum.
          className="h-11 w-28"
        />
      ) : null}

      {control.kind === 'text' ? (
        <Input
          id={id}
          type="text"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-40"
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

`SettingRow.story-ids.ts`: `['toggle', 'number', 'range', 'text', 'select', 'action', 'disabled']` — one story per control kind, so every branch carries a VR and axe baseline. `storyPrefix: 'ui-settingrow'`, `snapshotSlug: 'settingrow'`, `slotSelector: '[data-slot="setting-row"]'`, a `w-96` decorator.

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

Eight controls do not fit on one line, so the row discloses. An always-visible primary cluster carries the track name, render-select, solo, mute and volume; the per-staff display toggles and both transposition sliders sit behind a per-row expand control. `Punk.gp` alone is three rows; a band score is more.

**Files:**

- Create: `client/src/components/ui/TrackRow/` (six files)

**Interfaces:**

- Consumes: `Accordion` is _not_ used here — the disclosure is a single collapsible, so use `@base-ui/react/collapsible` directly or a plain conditional; `Checkbox`, `Slider`, `Button`, `Field`, `Tooltip*`, and Plan B's `TransportToggle` for solo and mute. It is an icon-only `aria-pressed` toggle at 44 px that forwards `data-testid`, renders `aria-disabled` rather than the native attribute, and already wraps itself in a tooltip that opens under the mouse even while disabled — every property the two buttons need, so do not rebuild it.
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
  rendered: boolean;
  onRenderedChange: (next: boolean) => void;
  solo: boolean;
  onSoloChange: (next: boolean) => void;
  mute: boolean;
  onMuteChange: (next: boolean) => void;
  /** 0-16, AlphaTab's own playbackInfo.volume scale. */
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
  expect(screen.getByRole('checkbox', { name: /render/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument();
});

test("the volume slider spans AlphaTab's own 0-16 scale", () => {
  render(<TrackRow {...baseProps} />);
  const volume = screen.getByRole('slider', { name: /volume/i });
  expect(volume).toHaveAttribute('aria-valuemin', '0');
  expect(volume).toHaveAttribute('aria-valuemax', '16');
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
  render(<TrackRow {...baseProps} expanded />);
  expect(screen.getByRole('checkbox', { name: /standard notation/i })).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: /tablature/i })).not.toBeInTheDocument();
});

test('a stringed staff with a tuning does offer the tablature toggle', () => {
  render(
    <TrackRow
      {...baseProps}
      name="Distortion Guitar"
      expanded
      staves={[{ ...drumStaff, id: 'staff-1', showTablature: true, tablatureAvailable: true }]}
    />,
  );
  expect(screen.getByRole('checkbox', { name: /tablature/i })).toBeInTheDocument();
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

  // Focus, not hover: jsdom has no pointer geometry. The mouse path is covered in the web lane.
  solo.focus();
  expect(await screen.findByText(new RegExp(RECORDING, 'i'))).toBeInTheDocument();
});

test('the controls that change the DRAWN score stay live while a recording plays', () => {
  render(<TrackRow {...baseProps} expanded mixUnavailable={RECORDING} />);
  // `data-disabled`, not toBeDisabled(): the design system's Checkbox renders a <span>, and
  // toBeDisabled() only understands native form elements — on a span it passes whatever happens.
  expect(screen.getByRole('checkbox', { name: /render/i })).not.toHaveAttribute('data-disabled');
  expect(screen.getByRole('checkbox', { name: /standard notation/i })).not.toHaveAttribute(
    'data-disabled',
  );
  expect(screen.getByRole('slider', { name: /transpose full/i })).not.toBeDisabled();
});
```

> The two slider assertions use `toBeDisabled()` on purpose: Base UI's slider thumb is a real `<input type="range">`, and a disabled slider has no tooltip to keep reachable — the reason is carried by the solo and mute buttons beside it, and by the note Task 7 puts at the top of the popover.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TrackRow`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/TrackRow/TrackRow.tsx`. Keep it presentation-only: no AlphaTab import, no ratio arithmetic (the caller does that), no knowledge of MIDI channels.

Requirements the tests encode, all of which must be visible in the code:

- The props extend `Omit<ComponentProps<'div'>, 'children'>` and the root spreads `...rest`, so the caller's `data-testid` lands on the row. `TrackStaffState` is **exported** — the mixer in `web/` builds that shape from the score.
- The primary cluster is one flex line: name, a render-select `Checkbox` labelled for the track, a solo toggle, a mute toggle, a `Slider` for volume with `min={0} max={16} step={1}` and an accessible name that includes the track (`label={`${name} volume`}`), and the expand control.
- Solo and mute are Plan B's `TransportToggle` — `pressed`, `onPressedChange`, `label` (`Solo ${name}`, `Mute ${name}`), `icon`, `tooltip`, `disabled`. Base UI's `Toggle` reports the NEXT state, which is what makes solo non-exclusive: the row never looks at any other row. Each `tooltip` tells the control's **state**, and is always present: `Solo: on` / `Solo: off`, `Mute: on` / `Mute: off`, or the `mixUnavailable` text when that is set.
- `mixUnavailable` disables solo, mute, the volume `Slider` and the "Transpose audio" `Slider`, and nothing else. `disabled={Boolean(mixUnavailable)}` on each — `TransportToggle` turns that into `aria-disabled` by itself.
- The volume `Slider` reports through **`onCommit`**, and tracks the pointer in local state while it is dragged — the same shape `SettingRow`'s range kind uses. One message to the synth worker per gesture is enough. Both transposition sliders do the same; Transpose full re-lays-out the whole score.
- The expand control is an icon `Button` (`size="icon"`, `size-11`) with `aria-expanded={expanded}`, `aria-controls` pointing at the disclosure panel's id, an `aria-label` of `More controls for ${name}`, and its own always-present tooltip (`Show more controls` / `Hide more controls`) — `TooltipTrigger render={<Button … />}`, the shape `PlayerShell`'s Play button already uses.
- Each `Checkbox` sits **inside** its `<label>`, and that label is at least 44 × 44 (`min-h-11 min-w-11`): the box is 16 px and is never the hit target on its own. That is the same construction `SettingRow`'s toggle kind uses.
- The disclosure renders per staff: a `Checkbox` for `showStandardNotation`, one for `showSlash`, one for `showNumbered`, and one for `showTablature` **only when `staff.tablatureAvailable`**.
- Below the staff toggles, two `Slider`s with distinct names — "Transpose audio" and "Transpose full" — each `min={-12} max={12} step={1}`, wired to their own callbacks. They are separate controls in the fork and must stay separate; fusing them drops the notation-transposing path entirely.
- Every control's hit area is at least 44 px. Task 8 measures it in the browser.

Add this comment above the volume slider, because it is the behaviour a future reader will otherwise file as a bug:

```tsx
{
  /* 0-16 is playbackInfo.volume's own scale. The caller converts this to the RATIO
            changeTrackVolume takes. Note the coupling v0 accepts: AlphaTab applies volume, solo
            AND mute to the track's primary and secondary MIDI CHANNELS, not to the track, so
            tracks sharing a channel move together. Punk.gp's two drum tracks are both on channel
            9: their volume sliders are not independent, and muting or soloing one does the same
            to the other while this row's own button still shows only what was pressed on it.
            That is expected, not a defect. */
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TrackRow`
Expected: PASS — 10 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`TrackRow.story-ids.ts`: `['collapsed', 'expanded', 'stringed-expanded', 'muted', 'soloed', 'recording']`. The `stringed-expanded` story is what proves the tablature toggle renders for a tuned staff, so it earns its own baseline; `recording` is the expanded row with `mixUnavailable` set, so the disabled look of all four controls has a baseline in both themes (VR `statesForStory`: `['resting', 'focus']` — a disabled toggle still takes focus, and that is the state its tooltip opens in). `storyPrefix: 'ui-trackrow'`, `snapshotSlug: 'trackrow'`, `slotSelector: '[data-slot="track-row"]'`, `iconFontStory: () => true`, a `w-[30rem]` decorator.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "TrackRow"
open -a Docker
pnpm test:vr:docker:update
pnpm test:vr:docker
```

Expected: a11y PASS; only new `trackrow-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/TrackRow
git commit -m "feat(client): add the TrackRow with its disclosure (NH-291)"
```

---

### Task 4: The settings schema and its accessors

The schema is what keeps a value edited in two places — the header tempo control and the Player group, say — in sync. It lives in `web/` because that is where the AlphaTab namespace exists.

Every row names its **`source`**, because the fork's panel holds three kinds of row and only one of them is a setting:

| `source`   | What it is                                                     | How it is written                                                                                                     |
| ---------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `settings` | A key in AlphaTab's settings JSON — almost every row           | Into the app's JSON, then through the funnel: `fillFromJson`, `updateSettings()`, `render()` when the row asks for it |
| `api`      | An `AlphaTabApi` property — `playbackSpeed` and its neighbours | By `PlayerShell`'s single writer for that value. Never through the JSON: `fillFromJson` ignores it without a word     |
| `action`   | A command — the Tools group's two exports                      | It runs; there is no value                                                                                            |

An `api` or `action` row is still a **schema row**, not a special case in the popover's JSX. v0.1's search is "a flat projection of the per-row accessor schema v0 already builds" and indexes the speed row "like every other row" (v0.1 spec §3 and §8), so a row that lived outside the schema would be a row search could never find.

**Files:**

- Create: `web/lib/alphatab/settings-paths.ts`, `web/lib/alphatab/settings-paths.test.ts`
- Create: `web/lib/alphatab/settings-schema.ts`
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

interface SettingRowBase {
  /** Unique across ALL eight groups — it becomes a DOM id. */
  id: string;
  label: string;
  control: SettingControl;
}

export type SettingDescriptor =
  | (SettingRowBase & {
      source: 'settings';
      /** Dot path into the settings JSON, e.g. 'display.scale'. */
      path: string;
      /** Re-render the score after this changes. False for player-only settings. */
      rerender: boolean;
    })
  | (SettingRowBase & { source: 'api'; key: ApiValueKey })
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

// live-settings.ts — every write to the live engine's settings, tracks and staves.
export function applySettingsJson(
  api: AlphaTabApi,
  json: PlayerSettingsJson,
  rerender: boolean,
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

- [ ] **Step 1: Read the fork and list the rows**

Open the reference panel and work through it:

```bash
sed -n '266,700p' /Users/leocaseiro/Sites/alphaTabWebsite/src/components/AlphaTabRhythmGame/playground-settings.tsx
```

It defines seven groups plus a separate Tools block, ~90 rows in total:

| Group              | Rows                                                                |
| ------------------ | ------------------------------------------------------------------- |
| Display ▸ General  | 8                                                                   |
| Display ▸ Colors   | 6                                                                   |
| Display ▸ Fonts    | 14                                                                  |
| Display ▸ Paddings | 15                                                                  |
| Notation           | 7                                                                   |
| Player             | 27                                                                  |
| Stylesheet         | 13                                                                  |
| Tools              | two action buttons, not settings: Export MIDI and Export Guitar Pro |

**The groups stay exactly these** — v0.1 is search plus tabs over rows that already exist, not a re-grouping. Write down each row's `source`, its setting path or api key, and its control kind as you read. **Write original label copy** — do not reuse the fork's strings, and do not borrow strings from any reference product.

Three things the fork's panel does that a careless port would copy wrong — each checked by reading it:

1. **Five of the Player group's 27 rows are `AlphaTabApi` properties, not settings.** The fork binds `masterVolume`, `metronomeVolume`, `countInVolume`, `playbackSpeed` and `isLooping` to the api object rather than to `api.settings`. They are `source: 'api'` rows. Give one a `path` instead and its slider moves, its number updates, and nothing audible changes.
2. **The Tools block is two commands**, not settings: Export MIDI (`api.downloadMidi()`) and Export Guitar Pro (the namespace's `exporter.Gp7Exporter`). The v0.1 spec's row grammar already names them as its two "Action" rows (§4). They are `source: 'action'` rows in a `tools` group.
3. **Some rows edit a key this app's shell owns** (Global Constraints). Leave those out.

> **🟥 OPEN DECISION — which `api` rows ship.** `playbackSpeed` ships: the spec puts the speed slider in this group. `masterVolume` has no other home in the player. The other three — `metronomeVolume`, `countInVolume`, `isLooping` — are **also** on Plan B's transport row, as three on/off toggles, where the fork has two 0-1 volume sliders and a checkbox. Shipping them here too means `PlayerShell`'s `metronome` and `countIn` state becomes a **volume** (a number) with the toggle reading `> 0`, so the toggle and the slider stay one value with one writer. The maintainer has not chosen yet. Until he does, build `playbackSpeed` and `masterVolume`, and leave the other three keys in `ApiValueKey` with no row.
>
> **🟥 OPEN DECISION — the `player.playerMode` row.** The fork's Player group has a dropdown over `player.playerMode`. In this app that row **is** the switch between a file's own recording and the synthesizer, which the spec puts out of v0 (§4) and the registry records as built by no plan (2026-09-20, the maintainer's question 16) — while also measuring that it works at runtime in about 100 ms. One of its values is `Disabled`, which removes the player. The maintainer has not chosen yet. Until he does, **leave the row out**: the spec's text is the standing decision.

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Dot-path read over the settings JSON. Returns undefined for a path that is not there, and for
 * one that lands on an object rather than a value.
 */
export function readSettingValue(json: PlayerSettingsJson, path: string): SettingValue | undefined {
  let current: unknown = json;
  for (const part of path.split('.')) {
    if (!isRecord(current) || !(part in current)) return undefined;
    current = current[part];
  }
  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? current
    : undefined;
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
  const [head, ...rest] = path.split('.');
  if (head === undefined) return json;
  if (rest.length === 0) return { ...json, [head]: value };
  const child = json[head];
  return {
    ...json,
    [head]: writeSettingValue(isRecord(child) ? child : {}, rest.join('.'), value),
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/settings-paths`
Expected: PASS — 5 tests.

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

interface SettingRowBase {
  /** Unique across ALL eight groups — it becomes a DOM id, and axe fails a duplicate. */
  id: string;
  label: string;
  control: SettingControl;
}

export type SettingDescriptor =
  | (SettingRowBase & {
      source: 'settings';
      /** Dot path into the settings JSON, e.g. 'display.scale'. */
      path: string;
      /** Re-render the score after this changes. Player-only settings set this false. */
      rerender: boolean;
    })
  // An AlphaTabApi PROPERTY, not a settings key. It must never get a `path`: fillFromJson ignores
  // a key it does not know, so the row would move and nothing would change.
  | (SettingRowBase & { source: 'api'; key: ApiValueKey })
  | (SettingRowBase & { source: 'action'; action: SettingAction });

export interface SettingGroup {
  id: string;
  title: string;
  settings: SettingDescriptor[];
}

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
      id: 'display-general',
      title: 'Display: general',
      settings: [
        {
          id: 'display-scale',
          source: 'settings',
          label: 'Zoom',
          path: 'display.scale',
          control: { kind: 'range', min: 0.25, max: 3, step: 0.05 },
          rerender: true,
        },
        {
          id: 'display-layout-mode',
          source: 'settings',
          label: 'Layout',
          path: 'display.layoutMode',
          control: { kind: 'select', options: enumOptions(engine.LayoutMode) },
          rerender: true,
        },
        // …the remaining six rows of this group.
      ],
    },
    // …Display: colours, Display: fonts, Display: paddings, Notation.
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
          rerender: false,
        },
        // …the remaining Player rows.
      ],
    },
    // …Stylesheet.
    {
      id: 'tools',
      title: 'Tools',
      settings: [
        {
          id: 'tools-export-midi',
          source: 'action',
          action: 'export-midi',
          label: 'MIDI file',
          control: { kind: 'action', actionLabel: 'Export MIDI' },
        },
        {
          id: 'tools-export-guitar-pro',
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
  display: { scale: 1, layoutMode: 'Page' },
  player: {
    // These three are set by the player at construction, so they are not AlphaTab's defaults.
    enableCursor: true,
    scrollMode: 'Continuous',
    scrollOffsetY: -10,
  },
  // …one entry per `settings` row, matching its path.
};
```

**Fill in every row before moving on.** The rows shown are the pattern; the list comes from Step 1's reading, and a group left as a comment is an unfinished task, not a deferral. Cross-check as you go: every `source: 'settings'` row's `path` must have a matching entry in `DEFAULT_PLAYER_SETTINGS`, every entry there must correspond to a row, and no `api` or `action` row has an entry at all.

**Get each default from the engine, not from memory.** `new engine.Settings()` in the browser console (`$0.at.settings` on the notation box is the live one) shows AlphaTab's value for every key; a wrong default here silently changes the score on the first edit of an unrelated row, because the whole JSON is pushed each time.

- [ ] **Step 7: Write the live-settings funnel**

Create `web/lib/alphatab/live-settings.ts`. Every write to a live engine object goes through this file — React's compiler lint rejects such a write inside a component — and it holds the only `api.updateSettings()` call in the app:

```ts
import type { PlayerSettingsJson } from './settings-paths';
import type * as AlphaTab from '@coderline/alphatab';

/**
 * The ONE place the live engine's settings change: write, push to the workers, redraw when asked.
 *
 * These live here, not in a component, for the same reason setAlphaTabValue does: the api reaches
 * components through useState, and the compiler lint treats anything reached through a hook as
 * immutable. It is right about React data and wrong about a handle to an engine outside React.
 */
function pushSettings(api: AlphaTab.AlphaTabApi, rerender: boolean): void {
  api.updateSettings();
  if (rerender) api.render();
}

/**
 * fillFromJson, NEVER assignment. The JSON holds plain objects, but RenderingResources holds real
 * model.Color and model.Font instances, and a plain object assigned into the settings tree breaks
 * rendering WITHOUT throwing — the colour and font groups would silently stop working.
 */
export function applySettingsJson(
  api: AlphaTab.AlphaTabApi,
  json: PlayerSettingsJson,
  rerender: boolean,
): void {
  api.settings.fillFromJson(json as AlphaTab.json.SettingsJson);
  pushSettings(api, rerender);
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
  pushSettings(api, true);
}

/**
 * For a score change. The pitches are indexed by track and live on the api, so without this a +2
 * on one score's second track would transpose the next score's second track. No redraw: a new
 * score is about to be drawn anyway.
 */
export function clearTrackTranspositions(api: AlphaTab.AlphaTabApi): void {
  if (api.settings.notation.transpositionPitches.length === 0) return;
  api.settings.notation.transpositionPitches = [];
  pushSettings(api, false);
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
  api.render();
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
        at?: { playbackSpeed: number; settings: { display: { scale: number } } };
      } | null
    )?.at;
    return at ? { speed: at.playbackSpeed, scale: at.settings.display.scale } : null;
  });

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

  // Open the first group and change the zoom — a setting whose effect is measurable in the DOM.
  // Through the NUMBER field: it shares the slider's name, and typing a value is one report.
  await page.getByRole('button', { name: 'Display: general' }).click();
  await page.getByRole('spinbutton', { name: 'Zoom' }).fill('2');

  await expect.poll(async () => (await engineState(page))?.scale).toBe(2);
  await expect
    .poll(async () => (await surface.locator('svg').first().boundingBox())?.width ?? 0, {
      timeout: 20_000,
    })
    .toBeGreaterThan(widthBefore);

  // The popover never blocks the player: that is the whole reason v0 chose a popover.
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

// Two editors, one value, one writer. The header's stepper and this row must never disagree, and
// the ENGINE must hear about it — a row that wrote the speed into the settings JSON would move,
// show its new number, and change nothing.
test('the Player group speed row and the header tempo control are one value', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').click();
  await page.getByRole('button', { name: 'Player' }).click();
  await page.getByRole('spinbutton', { name: 'Playback speed (%)' }).fill('50');

  await expect(page.getByTestId('player-status')).toHaveAttribute('data-speed', '0.5');
  await expect.poll(async () => (await engineState(page))?.speed).toBe(0.5);
});

test('the Settings icon trigger has a tooltip', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').hover();
  await expect(openTooltip(page)).toHaveText('Settings');
});
```

`openTooltip` is the helper Plan B's tooltip cases already use in this file. The Tracks trigger's tooltip is asserted in Task 7's first case.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "settings row|one value|icon trigger"`
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

import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';
import { buildSettingGroups, readSettingValue } from '../../lib/alphatab/settings-schema';
import type {
  ApiValueKey,
  PlayerSettingsJson,
  SettingAction,
  SettingDescriptor,
} from '../../lib/alphatab/settings-schema';

interface SettingsPopoverProps {
  settings: PlayerSettingsJson;
  onSettingChange: (path: string, value: SettingValue, rerender: boolean) => void;
  /**
   * The AlphaTabApi properties the Player group edits, in the unit each row shows. The shell owns
   * every one of them, because each has a second editor elsewhere in the player — the speed is
   * also the header's tempo control.
   */
  apiValues: Readonly<Partial<Record<ApiValueKey, SettingValue>>>;
  /** Routed by the shell to its single writer for that value. Never to the settings JSON. */
  onApiValueChange: (key: ApiValueKey, value: SettingValue) => void;
  onAction: (action: SettingAction) => void;
}

// The header gear. A POPOVER, not a modal — it never blocks the player, so a drummer can change a
// setting while the score plays. That is the single reason v0 chose this shape, and the settings
// search that comes later is layered over these same rows.
//
// The playback-speed slider lives in this popover's Player group, not in the header pill: neither
// design source draws a slider there, and "two popovers, not modals" leaves no third surface.
//
// THREE KINDS OF ROW, ONE LOOP. A row's `source` decides where its value comes from and where a
// change goes. It matters most for the `api` rows: `playbackSpeed` and its neighbours are
// AlphaTabApi PROPERTIES, not keys in AlphaTab's settings JSON, so a row that wrote one into the
// JSON would move, show its new number, and change nothing audible — a silent failure, not an
// error. They go to the shell's single writer for that value instead, which is also what keeps
// this slider and the header's tempo control showing the same speed.
export function SettingsPopover({
  settings,
  onSettingChange,
  apiValues,
  onApiValueChange,
  onAction,
}: Readonly<SettingsPopoverProps>) {
  const { engine } = useAlphaTabEngine();
  // The enum options come off the loaded namespace, so the groups cannot exist before it does.
  const groups = engine ? buildSettingGroups(engine) : [];

  const valueOf = (setting: SettingDescriptor): SettingValue => {
    if (setting.source === 'settings') return readSettingValue(settings, setting.path) ?? '';
    if (setting.source === 'api') return apiValues[setting.key] ?? '';
    return ''; // an action row has no value
  };

  const change = (setting: SettingDescriptor, next: SettingValue) => {
    if (setting.source === 'settings') onSettingChange(setting.path, next, setting.rerender);
    else if (setting.source === 'api') onApiValueChange(setting.key, next);
  };

  return (
    <Popover>
      {/* The tooltip is ALWAYS present, never conditional: swapping the wrapped and the bare
          element remounts the button and drops its focus. Both triggers render through the same
          Button — one <button>, no nesting. */}
      <Tooltip>
        <TooltipTrigger
          render={
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
          }
        />
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <PopoverContent
        data-testid="settings-popover"
        align="end"
        className="w-96 p-0"
        aria-label="Settings"
      >
        <ScrollArea className="max-h-[70vh]">
          <Accordion className="px-3 py-2">
            {groups.map((group) => (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger>{group.title}</AccordionTrigger>
                <AccordionContent>
                  {group.settings.map((setting) => (
                    <SettingRow
                      key={setting.id}
                      id={setting.id}
                      label={setting.label}
                      control={setting.control}
                      value={valueOf(setting)}
                      onChange={(next) => change(setting, next)}
                      onAction={
                        setting.source === 'action' ? () => onAction(setting.action) : undefined
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

> `render={…}` is Base UI's composition prop, and `TooltipTrigger render={<Button … />}` is the working precedent in this repo — `PlayerShell`'s Play button. What is **new** here is stacking two triggers on one button. Verify it in the browser before moving on: hover opens the tooltip, a click opens the popover, Tab reaches the button once, and `Escape` closes the popover and leaves focus on the gear. If the two triggers fight, fall back to the shape `TransportToggle` uses — the `TooltipTrigger` renders a `<span className="inline-flex" />` **around** the `PopoverTrigger` — and keep the tooltip permanent either way.

- [ ] **Step 4: Apply a changed setting to the live engine**

In `PlayerShell.tsx`, inside `Player`. `api` is **state**, so it is in every dependency list below:

```tsx
const [settings, setSettings] = useState<PlayerSettingsJson>(DEFAULT_PLAYER_SETTINGS);

const applySetting = useCallback(
  (path: string, value: SettingValue, rerender: boolean) => {
    // Compute, set, THEN call the engine — never call the engine inside the setState updater.
    // React may run an updater twice, which would push the settings and redraw the score twice.
    const next = writeSettingValue(settings, path, value);
    setSettings(next);
    if (api) applySettingsJson(api, next, rerender);
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
const apiValues = { playbackSpeed: Math.round(speed * 1000) / 10, masterVolume };

const applyApiValue = useCallback(
  (key: ApiValueKey, value: SettingValue) => {
    // applySpeed stays the ONLY writer of api.playbackSpeed: this row and the header's tempo
    // control are two editors of one value.
    if (key === 'playbackSpeed') applySpeed(Number(value) / 100);
    else if (key === 'masterVolume') applyMasterVolume(Number(value));
  },
  [applySpeed, applyMasterVolume],
);

const runAction = useCallback(
  (action: SettingAction) => {
    if (!api?.score || !engine) return;
    if (action === 'export-midi') {
      api.downloadMidi();
      return;
    }
    // Guitar Pro 7 bytes from AlphaTab's own exporter, handed to the browser as a download. The
    // exporter is a runtime value, so it comes off the loaded namespace, never an import.
    const bytes = new engine.exporter.Gp7Exporter().export(api.score, api.settings);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${api.score.title || 'score'}.gp`;
    link.click();
    URL.revokeObjectURL(url);
  },
  [api, engine],
);
```

Add `'masterVolume'` to `AlphaTabApiValue` in `web/lib/alphatab/useAlphaTab.ts` — that union is what `setAlphaTabValue` accepts, and it lists the transport's values only.

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
<PlayerHeader
  scoreTitle={notation?.score.title ?? ''}
  fileName={openFileName}
  scoreTempo={scoreTempo}
  speed={speed}
  onSpeedChange={applySpeed}
  disabled={!playerReady}
  actions={
    <SettingsPopover
      settings={settings}
      onSettingChange={applySetting}
      apiValues={apiValues}
      onApiValueChange={applyApiValue}
      onAction={runAction}
    />
  }
/>
```

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS. The lint run is not a formality here: it is what catches an engine write that slipped into a component instead of `live-settings.ts`.

- [ ] **Step 6: Prove every `settings` row reaches the engine**

Criterion 7 says the Settings popover's rows change the rendered score, not that the popover opens — and a row with a wrong `path` does nothing, without an error. ~90 rows is too many to trust to one zoom case, and a machine can check most of it. Add to `web/e2e/player.e2e.ts`:

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
          if (current === null || typeof current !== 'object' || !(part in current)) return true;
          current = (current as Record<string, unknown>)[part];
        }
        return false;
      });
  });
  expect(missing, 'settings rows whose path is not a real AlphaTab key').toEqual([]);
});
```

For it to find the rows, `SettingsPopover` passes `data-setting-path={setting.path}` on each `source: 'settings'` row, and `SettingRow` spreads `...rest` onto its root the way `TrackRow` does (widen its props to `Omit<ComponentProps<'div'>, 'onChange' | 'children' | 'id'>` when you add it). It is a static attribute with no runtime cost — the same kind of hook as the `data-testid`s this player already ships, not a state mirror.

What this cannot tell is whether a row should have set `rerender` and did not, or whether the change looks right. That needs eyes, and it is one of the two checks handed back in Task 9.

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

- Consumes: `DEFAULT_PLAYER_SETTINGS`, `PlayerSettingsJson` (Task 4).
- Produces: `loadStoredSettings(raw: string | null, defaults: PlayerSettingsJson): { settings: PlayerSettingsJson; reset: boolean }` and `serializeSettings(settings: PlayerSettingsJson): string`, plus `SETTINGS_STORAGE_KEY` and `SETTINGS_VERSION`.

- [ ] **Step 1: Write the failing test**

Create `web/lib/alphatab/settings-storage.test.ts`, beside the module it covers:

```ts
import { describe, expect, it } from 'vitest';

import { loadStoredSettings, serializeSettings } from './settings-storage';

const DEFAULTS = { display: { scale: 1 }, player: { enableCursor: true } };

describe('loadStoredSettings', () => {
  it('round-trips every stored value', () => {
    const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: false } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: false } });
    expect(reset).toBe(false);
  });

  it('yields the defaults for a first visit, and does NOT call that a reset', () => {
    const { settings, reset } = loadStoredSettings(null, DEFAULTS);
    expect(settings).toEqual(DEFAULTS);
    // A first visit is not a corruption.
    expect(reset).toBe(false);
  });

  // A bad stored value must never break the player, and must not vanish quietly.
  it('falls back to the defaults and reports a reset on unparseable JSON', () => {
    const { settings, reset } = loadStoredSettings('{not json', DEFAULTS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  it('falls back and reports a reset on a wrong-shaped value', () => {
    const { settings, reset } = loadStoredSettings('"a string"', DEFAULTS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  // Merge PER KEY rather than discarding the whole object — the settings search layers over
  // these same settings, so the stored shape changes soon after v0 ships.
  it('keeps the keys an older version has and fills the rest from the defaults', () => {
    const stored = JSON.stringify({ version: 0, settings: { display: { scale: 1.4 } } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: true } });
    // A partial merge is not a reset.
    expect(reset).toBe(false);
  });

  it('drops a key the defaults do not declare', () => {
    const stored = JSON.stringify({
      version: 1,
      settings: { display: { scale: 1.4 }, bogus: { nope: 1 } },
    });
    const { settings } = loadStoredSettings(stored, DEFAULTS);
    expect(settings).not.toHaveProperty('bogus');
  });

  // A stored value of the wrong TYPE would reach fillFromJson as-is. A string where a number
  // belongs breaks the layout without throwing, so the default wins.
  it('drops a stored value whose type differs from the default', () => {
    const stored = JSON.stringify({ version: 1, settings: { display: { scale: 'huge' } } });
    const { settings } = loadStoredSettings(stored, DEFAULTS);
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
 * `reset` is true only when something was actually WRONG — unparseable, or the wrong shape. A
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

  return { settings: mergeAgainstDefaults(parsed.settings, defaults), reset: false };
}
```

> An enum is stored by **name** (Task 4), so its default is a string and a stored name passes the same-type check. A stored name AlphaTab does not know parses to `undefined` inside `fillFromJson` and leaves that key at its current value — harmless.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/web exec vitest run lib/alphatab/settings-storage`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the failing e2e cases**

The by-hand reload check is a machine's job. Add to `web/e2e/player.e2e.ts`:

```ts
test('a changed setting survives a reload', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('settings-trigger').click();
  await page.getByRole('button', { name: 'Display: general' }).click();
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
- Modify: `web/e2e/player.e2e.ts`

`TransportRow.tsx` and `NotationSurface.tsx` are not touched: the row's `trailing` slot is already there and free, and the mixer reads the score from the api's own events.

**Interfaces:**

- Consumes: `TrackRow`, `TrackStaffState` (Task 3); `Popover*`, `ScrollArea`, `Button`, `Tooltip*`; `setTrackTransposition`, `clearTrackTranspositions`, `setStaffDisplay` (Task 4); `useAlphaTabEvent` and the `api` state (Plan A); `hasBackingTrack` (Plan B).
- Produces: `<TracksPopover api={api} hasBackingTrack={hasBackingTrack} disabled={!playerReady} />`; test hooks `data-testid="tracks-trigger"`, `data-testid="tracks-popover"`, and `data-testid="track-row-<index>"` per row.

- [ ] **Step 1: Write the failing tests**

Add to `web/e2e/player.e2e.ts`. Each opens the fixture with `openFirstScore` — the helper this file already has, which proves the file really opened by its `data-file` attribute; the bundled beat is on screen from the first paint, so "a track rendered" is true before anything is picked.

```ts
// Record every call the page makes to one AlphaTabApi method. The synth keeps solo, mute and
// volume in its WORKER, so nothing on the main thread can be read back afterwards — and the row's
// aria-pressed mirrors React state, so it flips even when the call never reached the engine
// (exactly what a callback frozen on the pre-engine `undefined` api does). Wrapping the method
// through the debug handle is test-side only: nothing ships for it.
async function recordApiCalls(page: Page, method: string): Promise<() => Promise<unknown[][]>> {
  await page.evaluate((name) => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: Record<string, (...args: unknown[]) => unknown>;
      } | null
    )?.at;
    if (!at) throw new Error('no engine');
    const original = at[name].bind(at);
    const calls: unknown[][] = [];
    const store = ((globalThis as { nhCalls?: Record<string, unknown[][]> }).nhCalls ??= {});
    store[name] = calls;
    at[name] = (...args: unknown[]) => {
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

  // The two drum tracks are drawn, so their render-select boxes start ticked; the guitar's does not.
  const drawn = (row: number) =>
    page.getByTestId(`track-row-${row}`).getByRole('checkbox', { name: /render/i });
  await expect(drawn(0)).toHaveAttribute('aria-checked', 'true');
  await expect(drawn(1)).toHaveAttribute('aria-checked', 'false');
  await expect(drawn(2)).toHaveAttribute('aria-checked', 'true');
});

test('render-select changes which tracks are drawn', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  // Draw the guitar too. `rendered-track-count` is what AlphaTab actually drew (api.tracks), not
  // an echo of the request.
  await page
    .getByTestId('track-row-1')
    .getByRole('checkbox', { name: /render/i })
    .click();

  await expect(page.getByTestId('rendered-track-count')).toHaveText('3', { timeout: 30_000 });
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

test('mute and volume reach the engine, the volume as a ratio of the level the file gives', async ({
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

  // One step down on the 0-16 scale, sent as next / the file's own level — never as an absolute.
  const [[tracks, ratio]] = (await volumeCalls()) as [[number[], number]];
  expect(tracks).toEqual([1]);
  expect(ratio).toBeCloseTo((before - 1) / before, 5);
});

// AlphaTab keeps its muted and soloed CHANNELS across a score change, and drums are channel 9 in
// every file — so without a reset, muting the drums in one score silences them in the next, beside
// a row that reads un-muted.
test('opening another score starts from a clean mix', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('tracks-trigger').click();
  await page.getByTestId('track-row-0').getByRole('button', { name: /mute/i }).click();
  await page.keyboard.press('Escape');

  const mutesAfterOpen = await recordApiCalls(page, 'changeTrackMute');
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
  // The mixer clears the synth's channel state; it does not replay the old score's mutes.
  expect(await mutesAfterOpen()).toEqual([]);
});

test('only a stringed staff with a tuning offers the tablature toggle', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();

  // The guitar staff reports tuningLen=6, so its row has the toggle.
  await page
    .getByTestId('track-row-1')
    .getByRole('button', { name: /more controls/i })
    .click();
  await expect(
    page.getByTestId('track-row-1').getByRole('checkbox', { name: /tablature/i }),
  ).toBeVisible();

  // Both drum staves report showTablature=false, tuningLen=0 — 1.8.4 cannot render percussion
  // tablature at all, so the toggle must be absent rather than present-and-broken.
  await page
    .getByTestId('track-row-0')
    .getByRole('button', { name: /more controls/i })
    .click();
  await expect(
    page.getByTestId('track-row-0').getByRole('checkbox', { name: /tablature/i }),
  ).toHaveCount(0);
});
```

> The "clean mix" case cannot read the synth worker's channel map — nothing can, from the page. What it pins is the visible half (the rebuilt row reads un-muted, and the old score's rows are gone); the audible half is on the by-ear list in Task 9. `api.player` is a separate object from the api, so to also assert the reset call, wrap `at.player.resetChannelStates` the same way.
>
> No fixture carries an embedded recording, so the disabled-mixer state is covered by `TrackRow`'s own test, story and baselines (Task 3), and the wiring here is one prop. If a small Guitar Pro file with an audio track turns up, add the case then — do not fabricate one.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "Tracks popover|render-select|solo is not exclusive|mute and volume|clean mix|tablature toggle"`
Expected: FAIL — no `tracks-trigger`.

- [ ] **Step 3: Write the popover**

Create `web/app/play/TracksPopover.tsx`. It owns the mixer's React state — which, for solo and mute, is the **only** record there is, because AlphaTab keeps those in the synth worker. The component itself stays mounted for the life of the page (only `PopoverContent` comes and goes), so closing the popover does not lose the mix.

The score arrives through the api's own events — there is no callback from the notation surface:

```tsx
interface MixerTrack {
  index: number;
  name: string;
  /** The level the FILE gives this track, 0-16. It is the ratio's denominator and never changes. */
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
useAlphaTabEvent(api, 'scoreLoaded', (score) => {
  api?.player?.resetChannelStates();
  if (api) clearTrackTranspositions(api);
  setTracks(score.tracks.map(toMixerTrack));
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
  // person just cleared would untick itself a moment later. Keep the last one ticked instead.
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
  // A RATIO against the level the FILE gives the track, not an absolute and not cumulative —
  // that is what changeTrackVolume takes, and AlphaTab never writes the new level back to
  // playbackInfo. `next` is on the same 0-16 scale. Guard the zero denominator: a track the file
  // sets to 0 would divide by zero and push Infinity into the synth.
  api.changeTrackVolume([track], row.fileVolume > 0 ? next / row.fileVolume : 0);
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

The shell of the component — the trigger carries an always-present tooltip, the same stacked-trigger shape the Settings gear uses (Task 5), and the same fallback if the two triggers fight:

```tsx
const RECORDING = 'Not available while the file plays its own recording';

<Popover>
  <Tooltip>
    <TooltipTrigger
      render={
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
          mixUnavailable={hasBackingTrack ? RECORDING : undefined}
          // …the rest of TrackRow's props, each wired to the handler above with track.index.
        />
      ))}
    </ScrollArea>
  </PopoverContent>
</Popover>;
```

`text-muted-foreground` and the 24 px glyph match the transport row's other controls (`RESTING_INK` and `Glyph` in `TransportRow.tsx`), so the trigger reads as part of that row. `side="top"`: the trigger sits at the bottom of the page.

- [ ] **Step 4: Put the trigger in the transport row's free slot**

In `PlayerShell.tsx`, on the existing `<TransportRow … />`. The slot already exists — Plan B left `trailing` free for exactly this, and moved Open file to `leading`. Do not edit `TransportRow.tsx`, and do not add a `Separator`: the row has none.

```tsx
trailing={
  <TracksPopover api={api} hasBackingTrack={hasBackingTrack} disabled={!playerReady} />
}
```

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/app/play/TracksPopover.tsx web/app/play/PlayerShell.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): add the Tracks popover with the full mixer row (NH-291)"
```

The mix **by ear** — that mute silences, that solo isolates, that the channel coupling behaves as recorded — is on the hand-back list in Task 9. Do not self-certify it.

---

### Task 8: Extend the axe gate and open the PR

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
          '[data-slot="slider"] [class*="h-11"]',
          // The popovers' fields. NOT [role="checkbox"]: the design system's checkbox is a 16 px
          // box by design, and its hit target is the <label for> around it — measured above.
          // NOT the hidden inputs either: the file picker's, the range input Base UI sizes to its
          // 16 px thumb, and the checkbox's own hidden input are none of them what a finger hits.
          'select',
          'input:not([type="range"]):not([type="file"]):not([type="checkbox"])',
        ].join(', '),
      ),
```

Keep the comment already above the selector about the seek rail; it still applies.

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
  // the action buttons in Tools.
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
pnpm --filter @notation-hero/web run test
pnpm --filter @notation-hero/client run test:a11y
pnpm test:vr:docker
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
- Whatever the maintainer decided on the two open decisions in Task 4.
- The 44 px gate now measures fields and selects; `Input` and `NativeSelect` stay `h-9` in the design system and are raised to `h-11` per call site — a design-system default of 44 px is a separate question, not answered here.

- [ ] **Step 6: Commit, push, open the PR**

```bash
git add web/e2e/a11y.e2e.ts docs/decisions/decision-registry.md
git commit -m "test(web): axe and hit areas over both open popovers (NH-291)"
git push
gh pr create --title "feat: v0 settings and tracks popovers (NH-291)" --body "$(cat <<'EOF'
Implements Plan C of the v0 local-file drum player.

Spec: `docs/specs/2026-09-10-v0-local-file-player-design.md`
Plan: `docs/plans/2026-09-13-v0c-popovers-plan.md`

## New design-system components

`Accordion`, `SettingRow`, `TrackRow` — each with a Storybook story plus VR and axe baselines that block merge. `Accordion` completes the three new components the spec called for, and it is what v0.1's settings search builds on.

## Success criteria covered

- [ ] 3 (per-track mute/solo half) — solo, mute and volume change the audible mix. **Needs ears — handed back, not self-certified.**
- [ ] 7 — the Settings rows change the rendered score; the Tracks popover lists every track and its rows work in both directions (solo/mute/volume for the mix, render-select for what is drawn, display toggles and both transposition sliders for the rendered score). **The rows reaching the engine is machine-checked; that each one LOOKS right needs eyes — handed back.**

Tablature is excluded from criterion 7 by the spec: 1.8.4 cannot render it on a percussion staff.

## Notes

- **The port is clean-room.** The reference fork (`rhythm-game` branch, MPL-2.0) was read, not copied — no files, no code, no label strings. All label copy is original.
- **Accepted coupling:** AlphaTab applies volume, solo and mute to a track's primary AND secondary MIDI channels, so tracks sharing a channel move together. `Punk.gp`'s two drum tracks are both on channel 9, so muting, soloing or turning down one does the same to the other. Expected v0 behaviour, not a defect.
- **A file that plays its own recording** disables solo, mute, volume and Transpose audio, with the reason in a tooltip and in a line above the rows: AlphaTab's backing-track player ignores all four.
- Settings persist under one `localStorage` key with a version integer, restored through `Settings.fillFromJson` before the engine is built, and merged per key against the shipped defaults. A corrupt value falls back and raises a toast rather than reverting silently. The playback speed and master volume are not persisted (NH-295).
- Rows left out on purpose, because the player's shell owns the key: list them here.

## Pulumi preview

safe — no `infra/` changes in this PR.
EOF
)"
```

The `pr-checklist-sync` workflow appends the merge checklist to the body when the PR opens; tick only what is true. After it opens, read CI with the PR tools rather than polling `gh run watch`, and do **not** edit the PR body while a run is in progress — a body edit re-triggers CI and cancels the run in flight.

---

### Task 9: 🧑 Hand back the two human gates, and close out v0

Nothing in this task is done by an agent. It is the hand-back: one message to the maintainer, once, when the PR is open and green.

- [ ] **Step 1: 🧑 HUMAN GATE — the mix, by ear** (criterion 3's mute/solo half, and criterion 7's audible half)

On the PR's preview deployment, with `Punk.gp` open and playing:

1. Mute **Distortion Guitar** — the guitar goes silent, the drums do not.
2. Solo **Distortion Guitar**, then also solo **Drumkit** — both are audible together; solo is not exclusive.
3. Move **Distortion Guitar**'s volume — its level changes.
4. Set **Transpose audio** on the guitar to +2 — its pitch rises and the notation does not move. Set **Transpose full** to +2 — the notation moves too.
5. The accepted coupling: mute **Drumkit** — **Drumkit Left** goes silent as well, while its own Mute button stays un-pressed. Both tracks are on MIDI channel 9. That is the recorded behaviour, not a bug.
6. With something muted, open another score — nothing in it is muted.

- [ ] **Step 2: 🧑 HUMAN GATE — every settings group, by eye** (criterion 7's drawn half)

Open each of the eight sections and change at least one row in each, watching the score. The lane already proves every row names a real AlphaTab key; what it cannot see is a row that needed `rerender: true` and did not get it (the value changes, the score does not redraw until something else redraws it), or a change that draws wrong. Press both Tools buttons and open the two files they download.

- [ ] **Step 3: Take stock of the v0 acceptance set across all three plans**

Criteria 1, 3, 5, 6, 7, 8, 9 and 10 should now be met. **Criterion 9 is verified by running** — `web/e2e/fixtures/guitar-no-percussion.gp` and its e2e case landed with Plan A (the spec's Q7 is closed). Criteria **2** (audible audio) and **4** (the maintainer's own files) have no machine evidence and never will — headless Chromium is silent — so they stand on the by-ear checks of Plans A, B and this one. Still untested: `.gp3`, `.gp4` and `.capx` (the spec's Q6 — they need real Guitar Pro 3/4 and Capella exports; renaming a `.gp5` proves nothing, because `ScoreLoader` reads the bytes). Say all of that plainly in the epic rather than marking v0 complete.

---

## Self-Review

**Spec coverage.** §7 "Two popovers, not modals" → Tasks 5 and 7, with the non-blocking property asserted in Task 5's own test. §7 Settings groups (Display ▸ General, Colors, Fonts, Paddings, Notation, Player, Stylesheet, Tools) → Task 4, with the real row counts from the reference panel; the Tools group is the v0.1 spec's two Action rows (its §4). §7 "Colors are plain text inputs for now" → `SettingRow`'s `text` kind, called out in its comment. §7 Tracks row full control set (render-select, solo, mute, volume, per-staff display toggles, both transposition sliders) → Tasks 3 and 7. §7 volume-as-ratio with a zero guard, and the 0–16 scale → Tasks 3 and 7. §7 channel coupling → stated in Global Constraints, in `TrackRow`'s comment, in Task 9's by-ear list and in the PR body — and widened to solo and mute, which the spec does not record. §4 and §7 "a file that plays its own recording disables solo, mute and volume, with a tooltip" → Tasks 3 and 7, plus Transpose audio (a Spec Delta, with the source line that justifies it). §7 tablature only for a tuned stringed staff → Tasks 3 and 7, each with a test. §7 eight-controls disclosure → Task 3. §7 "compose controls that already exist" → `SettingRow` composes `Field`, `Checkbox`, `Input`, `NativeSelect`, `Slider`, `Button`; none is new. §7 settings persistence, `fillFromJson`, the per-key merge and the reset toast → Task 6, with both the reload and the corrupt-value paths as e2e cases. §7 the speed slider in the Player group → Task 4's `source: 'api'` row, written by `PlayerShell`'s `applySpeed` (Plan B's single-writer rule), over the engine's 12.5–800 % range (registry, 2026-09-20, superseding the spec's 200 %). §4's 44 px rule → `expectHitAreas` with each popover open, Task 8. §8 criteria 3 and 7 → Tasks 5, 7 and 9. **Deliberately not covered here:** everything in Plans A and B; v0.1's search index and tab chrome; drum tablature (needs a version bump, Q5); persisting the speed (NH-295); a switch between a file's recording and the synthesizer (NH-298, and the second open decision in Task 4).

**Open decisions.** Two, both in Task 4 Step 1 and both marked `🟥 OPEN DECISION`, each with the default the plan builds until the maintainer chooses: which of the fork's five api-property rows ship, and whether the `player.playerMode` row ships. Neither blocks Tasks 1-3.

**Placeholder scan.** Two tasks describe rather than transcribe, and both name the exact source of the answer: Task 3's component body is specified as a requirement list plus the one comment that must appear (the test file above it is complete and is the real specification), and Task 4's schema shows the pattern rows with an explicit instruction that a group left as a comment is an unfinished task, not a deferral. Two things are flagged as **read, not run**: that a score change needs `resetChannelStates()` (Global Constraints — Task 7's case and Task 9's by-ear item 6 are what prove it), and that a `TooltipTrigger` and a `PopoverTrigger` can render through one `Button` (Task 5 names the fallback). Every other library fact in the plan was checked against the installed package, with the file and line beside it.

**Type consistency.** `SettingControl` and `SettingValue` are declared once in `SettingRow.tsx`, re-exported from the barrel, and imported by `settings-paths.ts` and `settings-schema.ts`. `PlayerSettingsJson` is declared once in `settings-paths.ts` and is the same type in the schema, the storage module, `live-settings.ts` and `PlayerShell`. `readSettingValue` / `writeSettingValue` keep one name and one signature in the module, the schema's re-export and the test. `SettingDescriptor` is a union discriminated on `source`, and `SettingsPopover` narrows on it before it touches `path`, `key` or `action`. `ApiValueKey` is spelled identically in the schema, `SettingsPopover`'s props and `PlayerShell`'s `applyApiValue`; `'masterVolume'` is added to `useAlphaTab.ts`'s `AlphaTabApiValue` in the same task that first writes it. `TrackStaffState.tablatureAvailable` is spelled identically in `TrackRow`'s props, its tests, and `toMixerTrack`. `StaffDisplayKey` is declared in `live-settings.ts` and used by `TracksPopover`. The `data-testid` values are declared in the task that creates them and reused verbatim: `settings-trigger`, `settings-popover`, `tracks-trigger`, `tracks-popover`, `track-row-<index>`; the expand control's accessible name is `More controls for <track>` in `TrackRow`, its tests and both e2e files.
