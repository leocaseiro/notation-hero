# v0 Transport — Implementation Plan B "Playback Control" (2 of 3)

> **⛔ RE-TRIAGED 2026-09-19 against Plan A's 2026-09-18 rework.** Plan A's Self-Review ordered this:
> _"Re-triage Plan B against that rule and rewrite it onto `useAlphaTabEvent` before it is dispatched."_
> That rework removed three things Tasks 6-8 were built on — the `apiRef` handle, hand-written
> `api.*.on(...)` subscriptions, and the `data-position` test hook — and added a `/play` that auto-loads
> its score, so the `load-sample` button those tests clicked never existed. All four are corrected here.
> Tasks 1-5 (the five `client/` components) were never affected: they are presentation-only.

> **🧑 HUMAN GATES.** Four steps in this plan cannot be performed by a machine — they need human ears
> (Task 6 Step 7, Task 7 Step 6) or a human browser console (Task 8 Step 6, Task 9 Step 3). Each is marked
> `🧑 HUMAN GATE`. An agentic worker must **stop at each one and hand back**, never self-certify it and
> never tick the checklist item it backs. This repo's `pr-checklist` gate is presence-only — it checks that
> a box is ticked, not that the claim is true — so a ticked box is the artefact a reviewer trusts.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player its transport — a seek bar that scrubs, a tempo control in the header, Loop / Metronome / Count-In toggles that audibly change playback, and a determinate progress bar for the soundfont download.

**Architecture:** Five new presentation-only components in `client/` (`Slider`, `Progress`, `Scrubber`, `TransportToggle`, `TempoControl`), each built on a Base UI primitive and each with a Storybook story plus the VR and axe baselines that block merge. The already-built `Tooltip` is already in the barrel (Plan A) and is consumed here, not re-exported. `web/` composes them into the transport row and the header pill and wires each to an `AlphaTabApi` accessor. Nothing in `client/` imports `@coderline/alphatab` — that is what keeps the gate real, because a `client/` story has no engine instance to provide.

**Tech Stack:** `@base-ui/react` 1.6 — `Slider`, `Progress`, `Toggle` and `NumberField` primitives; every new control is built on one of them rather than hand-rolled. Tailwind 4 tokens, Storybook 10, Playwright 1.61.1 + axe.

**Spec:** [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) — §7 is the component split; §4 is the soundfont progress behaviour.

**Depends on:** [v0 Engine and First Sound — Plan A (1 of 3)](2026-09-13-v0a-engine-and-first-sound-plan.md) — the engine context, the `/play` screen, the `AlphaTabApi` handle and the `web` Playwright lane must all exist first.

**Jira:** epic [NH-291](https://leocaseiro.atlassian.net/browse/NH-291).

**Closes success criteria:** 3 (tempo half), 5 (Loop, Metronome, Count-In each audibly change playback), 6 (the scrubber seeks and the cursor follows).

---

## Global Constraints

Every task's requirements implicitly include this section, plus **all of Plan A's Global Constraints**, which still bind.

- **Disabled controls stay keyboard-reachable — the design system owns that, not this plan.** Ratified
  2026-09-18 ([NH-304](https://leocaseiro.atlassian.net/browse/NH-304), merged 2026-09-19 as PR #158): `Button`
  renders `aria-disabled` with its own activation guard instead of the native `disabled` attribute,
  because a natively disabled button cannot take focus — which hides it from anyone tabbing through and
  makes focus-moving behaviour a silent no-op. The registry counts 46 `disabled` sites in this plan —
  **but the change only reaches a site that renders the `Button` COMPONENT.** A site that merely borrows
  `buttonVariants(...)` class strings inherits nothing, because class strings carry no behaviour. None of
  this plan's three disabled-capable controls is a `Button`: `TransportToggle` is Base UI `Toggle`,
  `TempoControl`'s `±` are `NumberField.Decrement`/`Increment` (Base UI sets the native attribute in
  `useNumberFieldButton`), and `Scrubber` composes `Slider`. Decide per control whether its disabled
  state must stay focusable; where it must, that is THIS plan's work, not NH-304's. Only skip a
  hand-rolled guard where the site really does render `Button`.
- **The whole transport is gated on `playerReady`, never on `soundFontLoaded`.** Pass
  `disabled={!playerReady}` — Plan A already holds `playerReady` in `Player` and gates Play on it, so
  the transport becomes live at the same moment Play does. Do NOT gate any control on `soundFontLoaded`:
  it is a bare `IEventEmitter` in 1.8.4 with no replay, so a subscriber attaching after it fires never
  sees it and the control would latch disabled forever. (That race is exactly why Plan A stopped gating
  Play on it.) Task 8 may still _listen_ to `soundFontLoaded` to hide the progress bar, because it
  subscribes in the same effect as `soundFontLoad` — it cannot see the start and miss the end.
- **Metronome and Count-In are inert on a score with a backing track — disable them, do not hide
  them.** When the loaded score carries an embedded audio recording, AlphaTab plays that recording
  through `BackingTrackPlayer`, whose synthesiser (`BackingTrackAudioSynthesizer`) implements
  `setupMetronomeChannel` as an empty method and discards metronome events in its synthesis loop.
  `api.metronomeVolume = 1` and `api.countInVolume = 1` then store a number that reaches nothing
  audible. Render both toggles `disabled` with a tooltip saying why (`'Not available while the file
plays its own recording'`), rather than letting a user press a lit button that makes no sound.
  Loop and the scrubber are unaffected — they work on both playback paths.
- **Every AlphaTab subscription goes through `useAlphaTabEvent(api, event, handler)`** — the typed helper
  Plan A Task 5 lands in `web/lib/alphatab/useAlphaTab.ts`. A bare `api.<event>.on(...)` in a component
  is a leak: it pairs no `.off()`, and `reactStrictMode: true` (set in `web/next.config.ts`)
  double-invokes the mount effect in dev, so the second subscription is never removed. AlphaTab also
  re-fires several of these events at subscribe time, which turns resubscribe churn into a feedback
  loop rather than mere waste. Ratified 2026-09-18 (Plan A F-B2).
- **`Player` owns the api, and it is React state, not a ref.** Plan A calls `useAlphaTab` in exactly one
  place — `const [api, hostRef] = useAlphaTab(...)` — and after the 2026-09-18 triage **no `apiRef`
  exists at all**. `api` is `AlphaTabApi | undefined` until the engine is built, so every `useCallback`
  that touches it takes `[api]` as its dependency list; an empty `[]` (correct for a ref) freezes the
  callback on the `undefined` it held before the engine arrived.
- **`/play` auto-loads the bundled score; there is no load button.** Plan A sets
  `settings.core.file = SAMPLE_NOTATION` at construction, and the registry records the decision ("the
  player always loads a score; the empty state is removed"). The e2e entry point is
  `await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 })`, never a click.
  Plan A's test hooks are exactly: `notation-surface`, `notation-skeleton`, `engine-error`,
  `transport-play`, `player-status` (`data-playing`, `data-player-ready`), `rendered-track-count`,
  `open-file-input`, `open-file-button`, `loaded-notation-name`. Anything else must be produced by a
  task in THIS plan.
- **Every `client/` component here is presentation-only**: `value` in, `onChange` out, option lists as plain arrays, and **no import from `@coderline/alphatab`**. `client/` has no AlphaTab dependency and a Storybook story has no engine instance, so a control that read its options off the library would be gated while rendering fabricated options. **This is machine-enforced now, not a convention to remember:** `client/eslint.config.js` bans the package outright — type imports included, unlike `web/`'s fence which allows `import type` — and bans `await import()` of it through a `no-restricted-syntax` selector; `tooling/alphatab-import-fence.test.sh` (run by `pnpm run test:tooling`, a required CI step) proves both fences still reject a probe.
- **Each new `client/` component needs all six files, co-located in its own folder**: `X.tsx`, `X.stories.tsx`, `X.story-ids.ts`, `X.test.tsx`, `X.a11y.ts`, `X.vr.ts`. Never a `__tests__/` or `stories/` directory — `tooling/check-layout.sh` fails the build on them.
- **VR baselines are Linux-only.** Generate them with `pnpm test:vr:docker:update` (Docker Desktop running — `open -a Docker`), never natively on macOS. Kill any Storybook already on `:6006` first, or Playwright's `reuseExistingServer` serves desynced stories and the baselines come out wrong.
- **`test:vr:docker:update` re-blesses EVERY baseline in `client/`, not just the new component's.** It passes no filter, so after every regeneration run `git status --short client/src` (package-wide, never folder-scoped) and commit only what you meant to change. Re-running `pnpm test:vr:docker` afterwards compares against the files you just wrote, so it proves the suite is green — it cannot detect drift.
- **Every control's hit area is at least 44 px**, with the glyph left at its drawn size. The mockup's transport is `w-10 h-10` (40 px) and its header `±` buttons carry no size class at all — both are too small and v0 must not copy them.
- **The seek and volume rails meet the 44 px rule through the slider's `Control`, not its thumb.** Base UI handles click/drag on `Slider.Control`, so the height belongs there (`h-11`); the rail stays `h-1` and the thumb `size-4`, centred inside an invisible 44 px target. Measuring the nested `input[type="range"]` is therefore the wrong test — Base UI sizes it to the 16 px thumb no matter how large the real target is.
- **Vocabulary: a piece of music is a `score`; a `notation` is the score FILE.** The word "chart" is not
  used anywhere in this plan or in the data model — the schema's instrument-agnostic unit is `playable`
  (song · part · lesson · pattern) and `notation` is the S3 file or inline alphaTex. `score` is the
  user-facing and log-facing word, and it matches AlphaTab's own `api.score` / `score.title`.
- **Tempo lives in the header, not the transport row.** Both design sources put it there, so the transport row has none.
- **v0 ships TWO speed controls over ONE value, and `applySpeed` is the only writer.** The header BPM stepper
  (this plan) and the Settings popover's 12.5–200 % slider (Plan C) both edit the same `speed` multiplier;
  `PlayerShell`'s `applySpeed` is the **sole** code path that assigns `api.playbackSpeed`, and Plan C's
  Player-group row must call it rather than the settings-JSON accessor path. This is not stylistic:
  `playbackSpeed` is an `AlphaTabApi` **property**, not a field in AlphaTab's `Settings` JSON, so a row
  wired like the other settings rows would write a value that never reaches the engine — the slider moves,
  the `%` updates, the audio does not.
- **The 12.5–200 % speed slider is Plan C's** — it belongs to the Settings popover's Player group, not the header pill. This plan builds the editable BPM number field (`± 1` with hold-to-repeat, wheel scrub, drag scrub) and the `%` readout only.
- **A–B loop markers are out of scope.** v0 ships a plain seek bar; looping uses AlphaTab's native bar-range selection plus the Loop toggle. Do not build marker UI.
- `@coderline/alphatab` 1.8.4 facts this plan relies on — all verified against the installed
  `dist/alphaTab.d.ts` and, where marked **observed**, against a headless run of the real synth:
  - `api.isLooping: boolean`, `api.metronomeVolume: number`, `api.countInVolume: number`,
    `api.playbackSpeed: number`, `api.endTime: number`, `api.timePosition: number` (settable — this is
    the seek). Set these directly; `api.updateSettings()` is **not** required (alphaTab's own docs show
    `api.metronomeVolume = 0.5`).
  - `api.playerPositionChanged` emits **seven** fields:
    `{ currentTime, endTime, currentTick, endTick, isSeek, originalTempo, modifiedTempo }`.
  - `api.midiLoaded` — fires when the score's MIDI is ready, carrying a `PositionChangedEventArgs` built
    at tick 0. This is the clean bootstrap for the tempo readout.
  - `api.soundFontLoad` emits `{ loaded, total }`; `api.soundFontLoaded` is completion (no payload); and
    the failure path is **`api.error`, NOT `api.soundFontLoadFailed`** — the latter is a member of
    `AlphaSynthBase`/`IAlphaSynth`, not of `AlphaTabApiBase`, and `AlphaTabApiBase` forwards it itself
    (`player.soundFontLoadFailed.on((e) => { this.onError(e); })`). Both the progress and completion
    events must still be handled —
    subscribing only to the first leaves the progress bar on screen forever.
  - `api.playbackRange: PlaybackRange | null` plus
    `api.playbackRangeChanged: IEventEmitterOfT<PlaybackRangeChangedEventArgs>` — how the Loop toggle
    learns whether a bar range is selected.
  - **`score.tempo` is the INITIAL tempo only.** It is a getter over
    `masterBars[0].tempoAutomations[0].value`, so on a score whose tempo changes it reports the opening
    value for the whole piece (**observed**: a 90 → 120 → 60 score reported 90 throughout). Use
    `args.originalTempo`, which is recomputed from the MIDI tempo table on every position update and
    tracks automations at bar and sub-bar granularity (**observed** flipping exactly at the automation
    ticks). Multiply by `playbackSpeed` yourself rather than displaying `modifiedTempo`: the two are
    identical in the plain synth path, but `modifiedTempo` is defined as `syncPointTempo × playbackSpeed`
    and diverges once backing-track sync points exist.
  - **`playerPositionChanged` replays a hardcoded stub on subscribe.** It has a `fireOnRegister` provider
    and `on()` invokes synchronously at registration with
    `PositionChangedEventArgs(0, 0, 0, 0, false, 120, 120)`. A naive mount subscription therefore flashes
    **120 BPM on a 90 BPM score** (**observed**). Guard the first callback on `endTime > 0`.
  - **A seek is followed by a burst of stale position events.** They carry `isSeek: false` — the same value
    every ordinary playback tick carries — so the flag alone cannot filter them (**observed**: blocking the
    main thread 25 ms produced 8 stale events; 60 ms produced 18). The echo of the seek itself carries
    `isSeek: true` and **exactly** the requested `currentTime` (clamped to `endTime`), and MessagePort
    delivery is FIFO, so the stale burst always precedes it. See Task 6 Step 5 for the guard.

---

## File Structure

**Created — `client/src/components/ui/`, one folder each**

| Folder             | Responsibility                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Slider/`          | Single-value slider primitive. `RangeSlider` is dual-thumb only (`value: [number, number]`), so it cannot serve the scrubber, the tempo slider, per-track volume or the settings rows. |
| `Progress/`        | Determinate progress bar, with an indeterminate fallback. The design system has no `Progress`, `Spinner` or `Loader` at all.                                                           |
| `Scrubber/`        | Current time, seek bar, total time. Composes `Slider`.                                                                                                                                 |
| `TransportToggle/` | Icon toggle with a pressed state — one component used three times (Loop, Metronome, Count-In).                                                                                         |
| `TempoControl/`    | The header pill: `– <BPM> +` on Base UI `NumberField` — editable, wheel- and drag-scrubbable, `± 1` with hold-to-repeat — with the `%` shown on hover/focus and never at 100 %.        |

Each folder holds the six files named in Global Constraints, plus a `X.vr.ts-snapshots/` directory of committed `-linux` PNGs.

**Modified**

| File                               | Change                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/index.ts`              | Export the five new components, each with a one-line reason comment (the barrel's convention). `Tooltip` is ALREADY exported — do not re-export it.                                             |
| `web/app/play/PlayerShell.tsx`     | Hold transport and soundfont-progress state; render the transport row, the header and the progress bar.                                                                                         |
| `web/app/play/TransportRow.tsx`    | _(new)_ The row layout, wired to the api.                                                                                                                                                       |
| `web/app/play/PlayerHeader.tsx`    | _(extracted)_ Plan A Task 11 Step 3's inline `<header>`, moved out of `PlayerShell.tsx` and given the tempo pill.                                                                               |
| `web/app/play/NotationSurface.tsx` | Report the soundfont download progress upward (Task 8). NOT the tempo — `score.tempo` is the INITIAL tempo only; `PlayerShell` reads the live value off `midiLoaded` / `playerPositionChanged`. |
| `web/e2e/player.e2e.ts`            | Cases for criteria 3, 5 and 6.                                                                                                                                                                  |
| `web/e2e/a11y.e2e.ts`              | Axe over the loaded state now that the transport exists.                                                                                                                                        |

---

### Task 1: `Slider` — the single-value primitive

**Files:**

- Create: `client/src/components/ui/Slider/Slider.tsx`
- Create: `client/src/components/ui/Slider/Slider.stories.tsx`
- Create: `client/src/components/ui/Slider/Slider.story-ids.ts`
- Create: `client/src/components/ui/Slider/Slider.test.tsx`
- Create: `client/src/components/ui/Slider/Slider.a11y.ts`
- Create: `client/src/components/ui/Slider/Slider.vr.ts`

**Interfaces:**

- Consumes: `@base-ui/react/slider`, `cn` from `@/lib/utils`.
- Produces: `<Slider value={number} onChange={(next: number) => void} min? max? step? label? formatValue? unit? showReadout? disabled? className? />`, `data-slot="slider"`. Task 3 consumes it; Plan C's settings rows and per-track volume consume it too.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/Slider/Slider.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Slider } from './Slider';

// Base UI Slider measures its track with ResizeObserver and uses pointer-capture on the thumb —
// neither exists in jsdom. Both are polyfilled globally in vitest.setup.ts; these tests drive the
// slider by keyboard.

const Harness = ({
  initial = 50,
  ...props
}: Readonly<{ initial?: number } & Partial<Parameters<typeof Slider>[0]>>) => {
  const [value, setValue] = useState(initial);
  return <Slider {...props} value={value} onChange={setValue} />;
};

test('renders one named slider', () => {
  render(<Slider value={50} onChange={() => {}} label="Volume" />);
  expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
});

test('exposes min / max / aria-valuenow', () => {
  render(<Slider value={30} onChange={() => {}} min={0} max={60} label="Volume" />);
  const thumb = screen.getByRole('slider', { name: 'Volume' });
  // Base UI renders the thumb as a real (visually-hidden) <input type="range"> and sets ONLY
  // aria-valuenow on it — the bounds live on the native min/max attributes. RangeSlider.test.tsx
  // already asserts them this way; do not add redundant aria-* to the thumb to satisfy a test.
  expect(thumb).toHaveAttribute('min', '0');
  expect(thumb).toHaveAttribute('max', '60');
  expect(thumb).toHaveAttribute('aria-valuenow', '30');
});

test('arrow keys step the value through the controlled parent', async () => {
  const user = userEvent.setup();
  render(<Harness initial={50} label="Volume" step={5} />);
  const thumb = screen.getByRole('slider', { name: 'Volume' });

  await user.click(thumb);
  await user.keyboard('{ArrowRight}');
  expect(thumb).toHaveAttribute('aria-valuenow', '55');

  await user.keyboard('{ArrowLeft}{ArrowLeft}');
  expect(thumb).toHaveAttribute('aria-valuenow', '45');
});

test('formats the visible readout without touching the thumb semantics', () => {
  render(
    <Slider
      value={90}
      onChange={() => {}}
      label="Tempo"
      formatValue={(v) => `${v}`}
      unit="BPM"
      showReadout
    />,
  );
  // The readout is aria-hidden so a screen reader hears the thumb, not a duplicated line.
  expect(screen.getByText('90 BPM')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuenow', '90');
});

test('disabled marks the thumb disabled', () => {
  render(<Slider value={50} onChange={() => {}} label="Volume" disabled />);
  expect(screen.getByRole('slider', { name: 'Volume' })).toBeDisabled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Slider`
Expected: FAIL — `Failed to resolve import "./Slider"`.

- [ ] **Step 3: Write the component**

First create `client/src/components/ui/Slider/SliderClasses.ts` holding the shared TRACK and THUMB strings, then import them from BOTH `Slider.tsx` and `RangeSlider.tsx` — add `client/src/components/ui/RangeSlider/RangeSlider.tsx` to the File Structure "Modified" table, since this task now edits it. Its rendered classes must come out byte-identical, so re-run `pnpm test:vr:docker` afterwards and expect the RangeSlider baselines to pass unchanged. Then create `client/src/components/ui/Slider/Slider.tsx`:

```tsx
'use client';

import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/utils';

// Shared with RangeSlider so the two read as one system and cannot drift apart. Exported from
// ./SliderClasses.ts and imported by BOTH components; the earlier plan said to keep the thumb
// classes "byte-identical" by hand, which is exactly the duplication that drifts.
// PascalCase filename, NOT kebab: client/eslint.config.js sets unicorn/filename-case to pascalCase
// for everything under src/components/**, so `slider-classes.ts` fails `eslint . --max-warnings 0`.
// Only TRACK and THUMB are genuinely shared. RangeSlider's Control is `flex w-full items-center` with
// NO h-11 (its Root is h-5), so handing it this 44 px control box would change its geometry and
// invalidate its committed -linux VR baselines.
export const SLIDER_CONTROL_CLASS = 'flex h-11 w-full items-center'; // Slider only
export const SLIDER_TRACK_CLASS = 'relative h-1 grow rounded-full bg-muted';
export const SLIDER_THUMB_CLASS = cn(
  'block size-4 cursor-grab rounded-full border-2 border-primary bg-background transition-[box-shadow,background-color]',
  'hover:ring-4 hover:ring-ring/30',
  // Base UI's thumb is a styled div wrapping a real (visually-hidden) native <input type="range">
  // — the INPUT takes focus, not this div, so a plain focus-visible: utility never matches.
  'has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-focus-visible:outline-none',
  'active:cursor-grabbing active:bg-primary',
  'data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed',
);

interface SliderProps {
  /** Controlled value. */
  value: number;
  /** Fires with the new value whenever the thumb moves. */
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Increment per keystroke / drag tick. */
  step?: number;
  /** Accessible name for the thumb (Base UI maps it to role="slider"). */
  label?: string;
  /** Format the visible readout; defaults to String(v). */
  formatValue?: (v: number) => string;
  /** Unit appended to the visible readout, e.g. 'BPM'. */
  unit?: string;
  /** Show the readout above the rail. Off by default — most rows label the value themselves. */
  showReadout?: boolean;
  disabled?: boolean;
  className?: string;
}

// Dumb, controlled single-thumb slider: a number in, onChange out. Base UI owns the interaction
// model (arrow-key stepping, the slider semantics); this wrapper adds the rail/range/thumb look,
// the optional readout and the data-slot hook. RangeSlider is dual-thumb only (value:
// [number, number]), so it cannot serve the scrubber, the tempo slider, per-track volume or the
// settings rows — which is why this exists alongside it rather than replacing it.
//
// The readout is aria-hidden so a screen reader hears the thumb's aria-valuenow/min/max, not a
// duplicated line. The thumb carries its own aria-label so axe sees a named slider.
const Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label = 'Value',
  formatValue = String,
  unit,
  showReadout = false,
  disabled = false,
  className,
}: SliderProps) => {
  const readout = `${formatValue(value)}${unit ? ` ${unit}` : ''}`;

  return (
    <div data-slot="slider" className={cn('flex flex-col gap-2', className)}>
      {showReadout ? (
        <output aria-hidden="true" className="text-sm text-muted-foreground tabular-nums">
          {readout}
        </output>
      ) : null}
      <SliderPrimitive.Root
        value={value}
        onValueChange={(next) => onChange(typeof next === 'number' ? next : next[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          'relative flex w-full touch-none items-center select-none',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {/* 44 px pointer target lives on CONTROL, not Root: Base UI puts the click/drag handling
            on Control, so height on Root alone leaves the touchable area at the rail's 4 px. The
            rail stays h-1 and is centred inside it — invisible padding, full-size target. */}
        <SliderPrimitive.Control className={SLIDER_CONTROL_CLASS}>
          <SliderPrimitive.Track className={SLIDER_TRACK_CLASS}>
            <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
            {/* Thumb: grab cursor + teal fill while dragging (:active); disabled keys off Base
                UI's data-disabled (a <span> can't match :disabled), which also suppresses the
                hover ring. Base UI's thumb is a styled div wrapping a real (visually-hidden)
                native <input type="range"> — the INPUT receives focus, not this div, so a plain
                focus-visible: utility would never match; has-focus-visible: reads the nested
                input's focus state instead. */}
            <SliderPrimitive.Thumb index={0} aria-label={label} className={SLIDER_THUMB_CLASS} />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </div>
  );
};

export { Slider };
```

> `onValueChange` may hand you `number` or `number[]` depending on the Base UI version's typing. The branch above covers both. If the installed types make one branch unreachable, keep only the reachable one rather than casting.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Slider`
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the story-ids and stories**

`client/src/components/ui/Slider/Slider.story-ids.ts`:

```ts
// Shared list of Slider story IDs (kebab) so VR (Slider.vr.ts) and a11y (Slider.a11y.ts) stay in
// lockstep with Slider.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` so Storybook's stories glob ignores it.
export const SLIDER_STORY_IDS = ['default', 'with-readout', 'stepped', 'disabled'] as const;
```

`client/src/components/ui/Slider/Slider.stories.tsx` — model it on `RangeSlider.stories.tsx` (same `title: 'UI/Slider'` shape, `parameters: { layout: 'padded' }`, `tags: ['autodocs']`, a `w-80` decorator, `fn()` for `onChange`, and a `render` that holds local state so dragging works in the canvas). Export exactly four stories whose ids match the list above: `Default`, `WithReadout`, `Stepped`, `Disabled`.

- [ ] **Step 6: Write the a11y and VR harnesses**

`client/src/components/ui/Slider/Slider.a11y.ts`:

```ts
import { runA11yStories } from '../../../a11y-helpers';
import { SLIDER_STORY_IDS } from './Slider.story-ids';

// axe coverage for Slider — every story x {light,dark} x {resting,hover}. Skip hover on the
// disabled story (the thumb is inert).
runA11yStories({
  name: 'Slider',
  storyPrefix: 'ui-slider',
  storyIds: SLIDER_STORY_IDS,
  slotSelector: '[data-slot="slider"]',
  hoverStory: (story) => story !== 'disabled',
});
```

`client/src/components/ui/Slider/Slider.vr.ts`:

```ts
import { runVrStories } from '../../../vr-helpers';
import { SLIDER_STORY_IDS } from './Slider.story-ids';

// VR for Slider — every story in light + dark, plus focus and hover on the non-disabled stories.
// Focus tabs to the nested native input (the actual focusable element); hover targets the visible
// thumb div, which paints on top and intercepts pointer events.
runVrStories({
  name: 'Slider',
  storyPrefix: 'ui-slider',
  snapshotSlug: 'slider',
  storyIds: SLIDER_STORY_IDS,
  slotSelector: '[data-slot="slider"]',
  states: ['resting', 'focus', 'hover'],
  focusExpect: 'input[type="range"]',
  hoverSelector: '[data-index]',
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover']),
});
```

- [ ] **Step 7: Run the a11y gate**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "Slider"
```

Expected: PASS. Killing any stale `:6006` Storybook first is not optional — `reuseExistingServer` will otherwise serve stories from an older build and the gate audits the wrong markup.

- [ ] **Step 8: Generate the VR baselines**

```bash
open -a Docker
pnpm test:vr:docker:update
git status --short client/src
```

Expected: only new `slider-*-linux.png` files. The status is scoped to **all** of `client/src`, not just this component's folder: `test:vr:docker:update` runs `playwright test --update-snapshots` with no filter, so it re-blesses every baseline in the package. A shared-token shift that moved `Button`'s baseline would be invisible under a folder-scoped status, would stay uncommitted (every commit step uses a path-scoped `git add`), and would then fail CI against the committed file. **Never generate these on macOS** — darwin rasterises fonts differently and those snapshots are git-ignored.

- [ ] **Step 9: Confirm the suite is green against the new baselines**

Run: `pnpm test:vr:docker`
Expected: PASS. Note what this step can and cannot do: it re-runs against the very files Step 8 just wrote, so it proves the suite is green — it **cannot** detect drift. Step 8's `git status --short client/src` is the drift check.

- [ ] **Step 10: Commit**

```bash
git add client/src/components/ui/Slider
git commit -m "feat(client): add a single-value Slider primitive (NH-291)"
```

---

### Task 2: `Progress` — the determinate bar, on Base UI

**Files:**

- Create: `client/src/components/ui/Progress/Progress.tsx`
- Create: `client/src/components/ui/Progress/Progress.stories.tsx`
- Create: `client/src/components/ui/Progress/Progress.story-ids.ts`
- Create: `client/src/components/ui/Progress/Progress.test.tsx`
- Create: `client/src/components/ui/Progress/Progress.a11y.ts`
- Create: `client/src/components/ui/Progress/Progress.vr.ts`

**Interfaces:**

- Consumes: `@base-ui/react/progress`, `cn` from `@/lib/utils`.
- Produces: `<Progress value={number | null} label={string} className? />`, `data-slot="progress"`. `value` is a **fraction 0–1**, or `null` for the indeterminate style. Task 8 consumes it.

> **Use Base UI's `Progress`, do not hand-roll a `role="progressbar"` div.** `@base-ui/react/progress`
> ships `Root · Track · Indicator · Label · Value`, and its `Root` is documented as _"The current value.
> The component is indeterminate when value is `null`."_ — exactly this component's semantics, already
> built. It also supplies `min`/`max` (defaulting 0/100), `format`, `getAriaValueText`, and a `status`
> state of `'indeterminate' | 'progressing' | 'complete'` that the indeterminate styling keys off. That
> deletes a manual `aria-valuenow` omission and the hand-written ARIA wiring. It does **not** clamp:
> `ProgressRoot` renders `'aria-valuenow': value ?? undefined` straight through, and
> `ProgressIndicator`'s width comes from an unclamped `(value - min) * 100 / (max - min)`. The wrapper
> below therefore clamps before handing the value over.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/Progress/Progress.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Progress } from './Progress';

test('exposes a named progressbar with the value mapped to 0-100', () => {
  render(<Progress value={0.42} label="Loading sounds" />);
  const bar = screen.getByRole('progressbar', { name: 'Loading sounds' });
  expect(bar).toHaveAttribute('aria-valuenow', '42');
  expect(bar).toHaveAttribute('aria-valuemin', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '100');
});

// AlphaTab forwards the raw XMLHttpRequest ProgressEvent: `total` is 0 when the response carries
// no Content-Length. The caller maps that to null, and Base UI renders the indeterminate state —
// which, per ARIA, means NO aria-valuenow at all. Base UI does this for us.
test('renders indeterminate with no aria-valuenow when value is null', () => {
  render(<Progress value={null} label="Loading sounds" />);
  const bar = screen.getByRole('progressbar', { name: 'Loading sounds' });
  expect(bar).not.toHaveAttribute('aria-valuenow');
  expect(bar).toHaveAttribute('data-indeterminate');
});

// `total` is the ENCODED length while `loaded` counts decoded bytes when the CDN compresses, so the
// fraction can exceed 1. Base UI does NOT clamp — it renders `aria-valuenow` straight through — so
// these two cases assert the WRAPPER's clamp.
test('clamps an over-unity fraction to 100', () => {
  render(<Progress value={1.8} label="Loading sounds" />);
  expect(screen.getByRole('progressbar', { name: 'Loading sounds' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
});

test('clamps a negative fraction to 0', () => {
  render(<Progress value={-0.5} label="Loading sounds" />);
  expect(screen.getByRole('progressbar', { name: 'Loading sounds' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Progress`
Expected: FAIL — `Failed to resolve import "./Progress"`.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/Progress/Progress.tsx`:

```tsx
'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@/lib/utils';

interface ProgressProps {
  /**
   * Completion as a fraction from 0 to 1, or null for the indeterminate style.
   *
   * Null is a real case, not a guard: AlphaTab forwards the raw XMLHttpRequest ProgressEvent, and
   * `total` is 0 whenever the response carries no Content-Length — so there is genuinely no
   * fraction to show. Values above 1 are real too (a compressed response reports the ENCODED
   * total against DECODED loaded bytes).
   */
  value: number | null;
  /** Accessible name — required; a bare progressbar tells a screen-reader user nothing. */
  label: string;
  className?: string;
}

// Determinate progress bar with an indeterminate fallback, over Base UI's Progress. Base UI owns
// the ARIA contract — it omits aria-valuenow entirely on the indeterminate branch (which is what
// ARIA defines as "value unknown"; rendering 0 would announce "0 percent" forever). It does NOT
// clamp, so this wrapper does: it paints the track/indicator, adds data-slot, and pins the
// percentage into [0, 100] before Base UI sees it.
//
// The indeterminate fill reuses the repo's skeleton keyframe AS-IS. Do not stack a `bg-*` tint on
// it: `animate-skeleton-pulse` animates `background-color` across the whole cycle, so a keyframe
// declaration outranks a normal utility on the same element and the tint is simply never painted —
// while `runVrStories` freezes animations before snapshotting, so the committed baseline would show
// the tint the live page never renders. `Skeleton.tsx` pairs the animation with `bg-skeleton`.
const Progress = ({ value, label, className }: Readonly<ProgressProps>) => (
  <ProgressPrimitive.Root
    value={value === null ? null : Math.min(100, Math.max(0, value * 100))}
    data-slot="progress"
    aria-label={label}
    className={cn('relative h-1.5 w-full overflow-hidden rounded-full', className)}
  >
    <ProgressPrimitive.Track className="h-full w-full overflow-hidden rounded-full bg-muted">
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-150',
          'data-[indeterminate]:animate-skeleton-pulse data-[indeterminate]:bg-skeleton data-[indeterminate]:w-full',
        )}
      />
    </ProgressPrimitive.Track>
  </ProgressPrimitive.Root>
);

export { Progress };
```

> Confirm `animate-skeleton-pulse` and the `bg-skeleton` token still exist before relying on them
> (`Skeleton.tsx` and `client/src/styles.css`). If either has been renamed, use whatever `Skeleton.tsx`
> uses today rather than inventing a new animation.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Progress`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`Progress.story-ids.ts`:

```ts
// Shared list of Progress story IDs (kebab) so VR and a11y stay in lockstep with the stories file.
export const PROGRESS_STORY_IDS = ['default', 'complete', 'indeterminate'] as const;
```

Stories: `title: 'UI/Progress'`, **three** exports matching those ids exactly — `Default` at 0.42,
`Complete` at 1, `Indeterminate` at null. Model the file on `RangeSlider.stories.tsx`.

`Progress.a11y.ts` and `Progress.vr.ts` follow the Task 1 shape with `storyPrefix: 'ui-progress'`,
`snapshotSlug: 'progress'`, `slotSelector: '[data-slot="progress"]'`. A progress bar has no focus or
hover state, so use `states: ['resting']` in VR and set `hoverStory: () => false` in a11y.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "Progress"
open -a Docker
pnpm test:vr:docker:update
git status --short client/src
pnpm test:vr:docker
```

Expected: a11y PASS; only new `progress-*-linux.png` files; the second VR run clean.

> The indeterminate story animates, and `runVrStories` already freezes transitions and animations
> before snapshotting — check `vr-helpers.ts` rather than adding a bespoke freeze. Note the frozen
> baseline therefore guards only the keyframe's base frame, not the pulse trough.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/Progress
git commit -m "feat(client): add a Progress bar on Base UI (NH-291)"
```

---

### Task 3: `Scrubber` — current time, seek bar, total time

**Files:**

- Create: `client/src/components/ui/Scrubber/` (six files)

**Interfaces:**

- Consumes: `Slider` (Task 1).
- Produces: `<Scrubber positionMs={number} durationMs={number} onSeek={(ms: number) => void} disabled? className? />`, `data-slot="scrubber"`. Task 6 consumes it.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/Scrubber/Scrubber.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Scrubber } from './Scrubber';

const Harness = ({ initial = 0, durationMs = 260_000 }) => {
  const [positionMs, setPositionMs] = useState(initial);
  return <Scrubber positionMs={positionMs} durationMs={durationMs} onSeek={setPositionMs} />;
};

test('shows elapsed and total time as mm:ss', () => {
  render(<Scrubber positionMs={102_000} durationMs={260_000} onSeek={() => {}} />);
  expect(screen.getByText('01:42')).toBeInTheDocument();
  expect(screen.getByText('04:20')).toBeInTheDocument();
});

test('pads seconds below ten', () => {
  render(<Scrubber positionMs={5_000} durationMs={65_000} onSeek={() => {}} />);
  expect(screen.getByText('00:05')).toBeInTheDocument();
  expect(screen.getByText('01:05')).toBeInTheDocument();
});

test('the seek bar is a named slider over the song length in seconds', () => {
  render(<Scrubber positionMs={0} durationMs={260_000} onSeek={() => {}} />);
  const bar = screen.getByRole('slider', { name: 'Seek' });
  // Native min/max, not aria-valuemin/max — see the note in Slider.test.tsx.
  expect(bar).toHaveAttribute('min', '0');
  expect(bar).toHaveAttribute('max', '260');
});

test('arrow keys seek and report milliseconds to the caller', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const bar = screen.getByRole('slider', { name: 'Seek' });

  await user.click(bar);
  await user.keyboard('{ArrowRight}');

  // One second step, reported back in ms — the unit the api's timePosition setter takes.
  expect(screen.getByText('00:01')).toBeInTheDocument();
});

// A score that has not loaded yet has no length; the bar must not render NaN or a 1-second song.
test('renders a disabled zero-length bar when there is no duration', () => {
  render(<Scrubber positionMs={0} durationMs={0} onSeek={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Seek' })).toBeDisabled();
  expect(screen.getAllByText('00:00')).toHaveLength(2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Scrubber`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/Scrubber/Scrubber.tsx`:

```tsx
'use client';

import { Slider } from '../Slider/Slider';

import { cn } from '@/lib/utils';

interface ScrubberProps {
  /** Playback position in milliseconds. */
  positionMs: number;
  /** Song length in milliseconds. 0 means nothing is loaded. */
  durationMs: number;
  /** Fires with the requested position in MILLISECONDS — the unit the player's setter takes. */
  onSeek: (ms: number) => void;
  disabled?: boolean;
  className?: string;
}

// mm:ss. Beyond an hour this reads as minutes past 60 (e.g. 65:00) rather than growing an hour
// field — no practice score runs that long, and a third field would jitter the row's width.
const formatClock = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Elapsed time, a seek bar, total time. Presentation-only: it knows nothing about the player —
// milliseconds in, a requested position in milliseconds out.
//
// The bar works in SECONDS internally so one arrow-key press is a one-second step, which is the
// granularity a drummer wants; milliseconds would need a step of 1000 and would report a
// misleading max of 260000.
//
// A–B loop markers are deliberately absent: v0 uses AlphaTab's native bar-range selection plus the
// Loop toggle, so there is no marker UI and no marker/selection sync to keep.
const Scrubber = ({
  positionMs,
  durationMs,
  onSeek,
  disabled = false,
  className,
}: Readonly<ScrubberProps>) => {
  const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const positionSeconds = Math.min(durationSeconds, Math.max(0, Math.floor(positionMs / 1000)));

  return (
    <div data-slot="scrubber" className={cn('flex w-full items-center gap-4', className)}>
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
        {formatClock(positionMs)}
      </span>
      <Slider
        className="flex-1"
        value={positionSeconds}
        onChange={(seconds) => onSeek(seconds * 1000)}
        min={0}
        max={durationSeconds}
        step={1}
        label="Seek"
        disabled={disabled || durationSeconds === 0}
      />
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
        {formatClock(durationMs)}
      </span>
    </div>
  );
};

export { Scrubber };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Scrubber`
Expected: PASS — 5 tests.

> If the zero-duration case fails because Base UI rejects `max === min`, give `Slider` a `max={Math.max(1, durationSeconds)}` and keep the `disabled` branch. Fix it in `Scrubber`, not by loosening the test.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`Scrubber.story-ids.ts`: `['default', 'start', 'near-end', 'empty']`. Stories under `title: 'UI/Scrubber'` with a `w-[36rem]` decorator so the bar has room. `storyPrefix: 'ui-scrubber'`, `snapshotSlug: 'scrubber'`, `slotSelector: '[data-slot="scrubber"]'`, `focusExpect: 'input[type="range"]'`, `hoverSelector: '[data-index]'`, and `statesForStory: (story) => (story === 'empty' ? ['resting'] : ['resting', 'focus', 'hover'])`.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "Scrubber"
open -a Docker
pnpm test:vr:docker:update
git status --short client/src
pnpm test:vr:docker
```

Expected: a11y PASS; only new `scrubber-*-linux.png`; the second VR run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/Scrubber
git commit -m "feat(client): add the playback Scrubber (NH-291)"
```

---

### Task 4: `TransportToggle` — one component, three uses, on Base UI

**Files:**

- Create: `client/src/components/ui/TransportToggle/` (six files)

**Interfaces:**

- Consumes: `@base-ui/react/toggle`, `buttonVariants`, `Tooltip`, `cn`.
- Produces: `<TransportToggle pressed={boolean} onPressedChange={(next: boolean) => void} label={string} icon={ReactNode} tooltip? disabled? ...buttonProps />`, `data-slot="transport-toggle"`. Task 6 renders it three times.

> **Use Base UI's `Toggle`, do not hand-roll `aria-pressed` on a `Button`.** `@base-ui/react/toggle` is
> documented as _"A two-state button that can be on or off. Renders a `<button>` element."_ — it owns
> `pressed` / `onPressedChange`, sets `aria-pressed`, emits `data-pressed`, and extends
> `NativeButtonProps`, so `data-testid` and every other button attribute pass through without a bespoke
> rest-spread. The repo already uses it: `ToggleChipGroup.tsx` imports the same primitive.
>
> Not the `Switch` (that is the settings-row affordance, Plan C) and not `ToggleGroup` — Loop, Metronome
> and Count-In are three independent booleans, and a group would bind them into one roving-focus widget
> sitting next to a scrubber.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/TransportToggle/TransportToggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TransportToggle } from './TransportToggle';

const Icon = () => (
  <span className="material-symbols-outlined" aria-hidden="true">
    repeat
  </span>
);

const Harness = ({ initial = false }) => {
  const [pressed, setPressed] = useState(initial);
  return (
    <TransportToggle pressed={pressed} onPressedChange={setPressed} label="Loop" icon={<Icon />} />
  );
};

test('exposes a named button with its pressed state', () => {
  render(
    <TransportToggle pressed={false} onPressedChange={() => {}} label="Loop" icon={<Icon />} />,
  );
  expect(screen.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'false');
});

test('clicking toggles through the controlled parent', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const toggle = screen.getByRole('button', { name: 'Loop' });

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('disabled does not toggle', async () => {
  const user = userEvent.setup();
  render(
    <TransportToggle
      pressed={false}
      onPressedChange={() => {
        throw new Error('must not fire while disabled');
      }}
      label="Loop"
      icon={<Icon />}
      disabled
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Loop' }));
  expect(screen.getByRole('button', { name: 'Loop' })).toBeDisabled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TransportToggle`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/TransportToggle/TransportToggle.tsx`:

```tsx
'use client';

import { Toggle } from '@base-ui/react/toggle';
import type { ComponentProps, ReactNode } from 'react';

import { buttonVariants } from '../Button/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';

import { cn } from '@/lib/utils';

interface TransportToggleProps extends Omit<ComponentProps<'button'>, 'onChange' | 'children'> {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  /** Accessible name — the control is icon-only, so this is the only label a reader gets. */
  label: string;
  /** The glyph. Pass it aria-hidden; `label` carries the name. */
  icon: ReactNode;
  /** Optional hover/focus hint. Use it where the control implies a gesture the UI never teaches. */
  tooltip?: string;
  disabled?: boolean;
  className?: string;
}

// Icon-only transport toggle. One component, three uses (Loop, Metronome, Count-In), so the
// pressed styling stays identical across the row.
//
// `aria-pressed` rather than a checkbox role: these are toggle BUTTONS in an application toolbar,
// not form inputs, and a screen reader announces "Loop, pressed" — which is what the control does.
//
// size-11 = the 44px minimum hit area. The mockup draws these at w-10 h-10 (40px) and v0 must not
// copy that: the screen target is tablet landscape.
const TransportToggle = ({
  pressed,
  onPressedChange,
  label,
  icon,
  tooltip,
  disabled = false,
  className,
  ...rest
}: Readonly<TransportToggleProps>) => {
  const toggle = (
    <Toggle
      {...rest}
      data-slot="transport-toggle"
      pressed={pressed}
      onPressedChange={(next) => onPressedChange(next)}
      aria-label={label}
      disabled={disabled}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'size-11 rounded-lg',
        // Pressed = SOLID brand teal, matching every other selected/active control in the system:
        // ToggleChipGroup (`data-pressed:border-primary data-pressed:bg-primary
        // data-pressed:text-primary-foreground`), Tabs (`data-active:bg-primary
        // data-active:text-primary-foreground`) and Sidebar's active item. A gray fill with a teal
        // glyph is NOT an existing pattern here — do not invent one.
        'data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground',
        className,
      )}
    >
      {icon}
    </Toggle>
  );

  // Base UI sets aria-pressed and the accessible name on the Toggle itself, so the tooltip is a
  // redundant hint rather than the control's name — safe to omit per-instance.
  return tooltip ? (
    <Tooltip>
      <TooltipTrigger render={toggle} />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    toggle
  );
};

export { TransportToggle };
```

> `Base UI`'s `Toggle` renders its own `<button>`, so the look comes from `buttonVariants(...)` rather
> than from wrapping `<Button>` — that is the repo's reuse rule (never hand-copy Button's class
> strings) without nesting two buttons. Verify with `--print-config`-style inspection that
> `data-slot="transport-toggle"` wins over any `data-slot` the variants set, since the VR and axe
> helpers select on it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TransportToggle`
Expected: PASS — 3 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`TransportToggle.story-ids.ts`: `['default', 'pressed', 'disabled', 'with-tooltip']`. Stories under `title: 'UI/TransportToggle'`, each passing a Material Symbols glyph as `icon`. In `TransportToggle.a11y.ts` set `iconFontStory: () => true` — every story renders a glyph, and that flag makes the helper assert the icon font actually loaded, so a failed load cannot pass silently — `client/src/styles.css` now sets `font-display: block` on the Material Symbols face, which means a failed load renders **blank** rather than showing the ligature source text, and axe is perfectly happy with a blank control. VR: `states: ['resting', 'focus', 'hover']`, `statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover'])`. **Keep that override.** NH-304 changed the `Button` COMPONENT; `TransportToggle` only borrows `buttonVariants(...)` class strings and renders Base UI's `Toggle`, which is natively disabled and cannot hold focus. `runVrStories` asserts `toBeFocused()` before it snapshots, so capturing a `focus` state on the disabled story fails the `vr` job.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "TransportToggle"
open -a Docker
pnpm test:vr:docker:update
git status --short client/src
pnpm test:vr:docker
```

Expected: a11y PASS; only new `transporttoggle-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/TransportToggle
git commit -m "feat(client): add the TransportToggle used by Loop, Metronome and Count-In (NH-291)"
```

---

### Task 5: `TempoControl` — the header pill, on Base UI `NumberField`

`Bpm` is display-only, so the tempo control is new. The displayed number is the **score's tempo
multiplied by the playback speed**; the value is directly editable, the `±` buttons move it by **1 BPM**
with hold-to-repeat, and the percentage appears **on hover or focus** (see the visibility rule below).

**Files:**

- Create: `client/src/components/ui/TempoControl/` (six files)

**Interfaces:**

- Consumes: `@base-ui/react/number-field`, `buttonVariants`, `inputSurfaceClasses`, `cn`.
- Produces: `<TempoControl scoreTempo={number} speed={number} onSpeedChange={(next: number) => void} minSpeed? maxSpeed? showPercent? disabled? />`, `data-slot="tempo-control"`. Task 7 consumes it. Plan C's Player settings group edits the same `speed` value, which is why it is the single source of truth rather than a BPM number.

> **Use Base UI's `NumberField`, do not hand-roll a stepper.** `@base-ui/react/number-field` ships
> `Root · Group · Input · Increment · Decrement · ScrubArea · ScrubAreaCursor` and supplies, out of the
> box, every behaviour this control needs: a real editable input (no click-to-convert), mouse-wheel
> stepping via `allowWheelScrub`, `step` / `smallStep` / `largeStep` / `snapOnStep`, `min` / `max`
> clamping, `format` / `locale`, and **hold-to-repeat on the buttons** (`START_AUTO_CHANGE_DELAY = 400`
> then a tick every `CHANGE_VALUE_TICK_DELAY = 60`). `ScrubArea` additionally gives a DAW-style
> drag-sideways-to-change gesture for free.
>
> The hold repeat is a constant 60 ms tick rather than accelerating, so at `step={1}` a hold moves about
> 16 BPM per second — 120 → 60 takes roughly 3.75 s. Acceptable for v0; an accelerating hold is a
> nice-to-have, not a blocker.

#### The percentage-visibility rule

BPM is the unit the user controls; the percentage is the only thing that says whether they are hearing
the score at its **written** speed. So:

1. **On focus** — which covers keyboard use and the editable input, i.e. "while adjusting".
2. **On hover.**
3. **Hidden on blur**, or **3 s** after the last change (the touch path).
4. **At exactly 100 %, never shown** — there is nothing to report, and showing everything at once is noise.

Rules 1–3 are **pure CSS**: `group-hover` and `group-focus-within` drive visibility, and
`:focus-within` gives "hide on blur" for free with no blur listener and no cleanup. Only the 3 s linger
needs JavaScript. Note what the linger is actually for: on touch, tapping `±` **focuses** the button, so
`:focus-within` holds the percentage until the user taps away and the timer never visibly expires. The
linger covers changes that carry no focus — a wheel scrub, or Plan C's Settings slider moving `speed`.

> **Spec Delta.** `docs/specs/2026-09-10-v0-local-file-player-design.md` (§7, the tempo-control line) says
> the percentage is "shown only while adjusting", with `±5` buttons. This plan changes three things:
> hover and blur join focus as triggers, the step becomes 1 BPM (the control is now a number field with
> hold-to-repeat, so coarse steps are no longer needed to keep the press count sane), and the linger moves
> from 2 s to 3 s. Ratified by the maintainer during the 2026-09-13 plan review; record it in
> `docs/decisions/decision-registry.md` with the rest of this plan's entry.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/TempoControl/TempoControl.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TempoControl } from './TempoControl';

// Base UI's NumberField uses pointer capture on its ScrubArea and ResizeObserver internally;
// both are polyfilled globally in vitest.setup.ts. These tests drive it by keyboard and clicks.

const Harness = ({ scoreTempo = 120, initial = 1 }) => {
  const [speed, setSpeed] = useState(initial);
  return <TempoControl scoreTempo={scoreTempo} speed={speed} onSpeedChange={setSpeed} />;
};

test('shows the score tempo scaled by the speed', () => {
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={() => {}} />);
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toHaveValue('120');
});

test('a half speed reads as half the BPM', () => {
  render(<TempoControl scoreTempo={120} speed={0.5} onSpeedChange={() => {}} />);
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toHaveValue('60');
});

test('the increment button moves one BPM and reports a speed', async () => {
  const user = userEvent.setup();
  const onSpeedChange = vi.fn();
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={onSpeedChange} />);

  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  // 121 / 120 — the component owns SPEED, never BPM.
  expect(onSpeedChange).toHaveBeenCalledWith(121 / 120);
});

test('the decrement button moves one BPM down', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Decrease tempo' }));
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toHaveValue('119');
});

test('typing a BPM directly sets the speed', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  await user.clear(input);
  await user.type(input, '60');
  await user.tab();
  expect(input).toHaveValue('60');
});

test('clamps to the 12.5% floor', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  await user.clear(input);
  await user.type(input, '1');
  await user.tab();
  // 12.5% of 120 BPM, rounded.
  expect(input).toHaveValue('15');
});

test('clamps to the 200% ceiling', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  await user.clear(input);
  await user.type(input, '900');
  await user.tab();
  expect(input).toHaveValue('240');
});

// F-22 rule 4: at written speed there is nothing to report, so the percentage is never rendered
// visible — not on hover, not on focus.
test('renders no percentage at exactly 100%', () => {
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={() => {}} />);
  expect(screen.getByTestId('tempo-control')).toHaveAttribute('data-off-speed', 'false');
});

test('marks itself off-speed when the speed is not 1', () => {
  render(<TempoControl scoreTempo={120} speed={0.5} onSpeedChange={() => {}} />);
  expect(screen.getByTestId('tempo-control')).toHaveAttribute('data-off-speed', 'true');
  expect(screen.getByTestId('tempo-percent')).toHaveTextContent('50%');
});

// F-13: the value changes as a side effect of pressing a button, which a text input does not
// announce on its own.
test('announces the new tempo in a live region', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  expect(screen.getByRole('status')).toHaveTextContent('121 BPM');
});

test('disabled blocks both steppers and the input', () => {
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={() => {}} disabled />);
  expect(screen.getByRole('button', { name: 'Increase tempo' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Decrease tempo' })).toBeDisabled();
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toBeDisabled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TempoControl`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/TempoControl/TempoControl.tsx`:

```tsx
'use client';

import { NumberField } from '@base-ui/react/number-field';
import { useEffect, useRef, useState } from 'react';

import { buttonVariants } from '../Button/Button';

import { cn } from '@/lib/utils';

interface TempoControlProps {
  /** The score's live tempo in BPM. The displayed number is this times `speed`. */
  scoreTempo: number;
  /** Playback speed multiplier; 1 is the score's own tempo. */
  speed: number;
  onSpeedChange: (next: number) => void;
  /** AlphaTab's documented playbackSpeed floor. */
  minSpeed?: number;
  maxSpeed?: number;
  /** Force the percentage visible. For stories and VR only; leave undefined in the app. */
  showPercent?: boolean;
  disabled?: boolean;
  className?: string;
}

/** How long the percentage stays visible after a change that carried no focus. */
const PERCENT_LINGER_MS = 3000;

// The header's tempo control. SPEED is the value it owns, not BPM: AlphaTab's playbackSpeed is what
// actually changes playback, and the Player settings group (Plan C) edits the same number — so
// keeping speed as the single source of truth is what stops the two controls drifting apart. BPM is
// the presentation, and the user edits it directly.
//
// Base UI's NumberField owns the interaction model: the editable input, wheel scrubbing, the
// min/max clamp, and hold-to-repeat on the buttons. This wrapper converts BPM <-> speed at the
// boundary, paints the pill, and implements the percentage-visibility rule.
const TempoControl = ({
  scoreTempo,
  speed,
  onSpeedChange,
  minSpeed = 0.125,
  maxSpeed = 2,
  showPercent,
  disabled = false,
  className,
}: Readonly<TempoControlProps>) => {
  const [lingering, setLingering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const displayedBpm = Math.round(scoreTempo * speed);
  const percent = Math.round(speed * 100);
  const offSpeed = Math.abs(speed - 1) > 0.0001;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleBpm = (nextBpm: number | null) => {
    if (nextBpm === null || scoreTempo <= 0) return; // a score with no tempo would divide by zero
    const next = Math.min(maxSpeed, Math.max(minSpeed, nextBpm / scoreTempo));
    onSpeedChange(next);
    setLingering(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLingering(false), PERCENT_LINGER_MS);
  };

  return (
    <NumberField.Root
      value={displayedBpm}
      onValueChange={handleBpm}
      min={Math.round(scoreTempo * minSpeed)}
      max={Math.round(scoreTempo * maxSpeed)}
      step={1}
      largeStep={5}
      allowWheelScrub
      disabled={disabled}
      data-slot="tempo-control"
      data-testid="tempo-control"
      // The visibility rule lives in these two attributes plus the CSS below. data-off-speed=false
      // means "at written speed", and rule 4 says the percentage is then never shown at all.
      data-off-speed={offSpeed}
      data-linger={showPercent ?? lingering}
      className={cn('group flex items-center gap-0.5', className)}
    >
      <NumberField.Group className="flex items-center gap-0.5">
        <NumberField.Decrement
          aria-label="Decrease tempo"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 rounded-lg')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            remove
          </span>
        </NumberField.Decrement>

        {/* ScrubArea wraps the readout: dragging sideways over the BPM changes it, the DAW gesture. */}
        <NumberField.ScrubArea className="flex cursor-ew-resize flex-col items-center px-2">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            BPM
          </span>
          <NumberField.Input
            aria-label="Tempo"
            className={cn(
              'w-12 border-0 bg-transparent p-0 text-center text-sm leading-none font-bold tabular-nums',
              'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
            )}
          />
          {/* Rule 1-4, entirely in CSS: hover or focus reveals it, blur hides it (focus-within does
              that for free), data-linger covers a change that carries no focus, and the whole thing is gated
              on data-off-speed so 100% never shows anything. */}
          <span
            data-testid="tempo-percent"
            aria-hidden="true"
            className={cn(
              'text-[10px] text-primary tabular-nums opacity-0 transition-opacity',
              'group-data-[off-speed=true]:group-hover:opacity-100',
              'group-data-[off-speed=true]:group-focus-within:opacity-100',
              'group-data-[off-speed=true]:group-data-[linger=true]:opacity-100',
            )}
          >
            {percent}%
          </span>
          <NumberField.ScrubAreaCursor />
        </NumberField.ScrubArea>

        <NumberField.Increment
          aria-label="Increase tempo"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 rounded-lg')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>
        </NumberField.Increment>
      </NumberField.Group>

      {/* F-13: Base UI's Input is a text input carrying aria-roledescription, not role="spinbutton",
          so a value change driven by the +/- buttons is not announced. This is the same visually
          hidden live region DataTable.tsx uses for the same shape of problem. */}
      <span role="status" aria-live="polite" className="sr-only">
        {displayedBpm} BPM
      </span>
    </NumberField.Root>
  );
};

export { TempoControl };
```

> Both of these were open questions in the round-1 review and are now **verified against the installed
> packages** (2026-09-19), so the queries and the classes below stand as written:
>
> - `NumberField.Input` renders `<input type="text">` with `aria-roledescription="Number field"` and
>   **no `role`** in `@base-ui/react` 1.6.0 (the only `role:` values anywhere in `number-field/` are
>   `group` on `NumberFieldGroup` and `presentation` on the scrub-area parts). `input[type="text"]`
>   maps to the implicit ARIA role `textbox`, and `aria-roledescription` does not change a computed
>   role — so `getByRole('textbox', …)` is correct and `spinbutton` would not match.
> - The doubled `group-data-[…]` variant **composes**, compiled through Tailwind's own API against both
>   4.3.1 and 4.3.2 with identical output: each `group-*` becomes an independent
>   `&:is(:where(.group)[data-…] *)` ancestor test, and `NumberField.Root` carries `group`,
>   `data-off-speed` and `data-linger` at once, so one element satisfies both. No hoist to a computed
>   `data-percent` attribute is needed.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TempoControl`
Expected: PASS — 11 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`TempoControl.story-ids.ts`: `['default', 'slowed', 'disabled']` — three stories, not four. The
percentage no longer needs a story of its own, because **hover and focus are the two states VR already
captures**; see the next paragraph.

Stories under `title: 'UI/TempoControl'`, each holding local state so the steppers work in the canvas.
`storyPrefix: 'ui-tempocontrol'`, `snapshotSlug: 'tempocontrol'`,
`slotSelector: '[data-slot="tempo-control"]'`, `iconFontStory: () => true`.

**VR and a11y states — this is where the old plan had a race.** The percentage used to be driven only
by a `setTimeout`, which `runVrStories`' `animation: none` freeze cannot stop and which no story
`play()` could reach (neither helper invokes or awaits `play()`, and **no story under `client/src` uses
it**). With the rule above, two of the three triggers are CSS, so the existing states cover them:

```ts
// TempoControl.vr.ts
states: ['resting', 'focus', 'hover'],
statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover']),
focusExpect: 'input',
focusTabs: 2, // Decrement is the first tabbable child; the second Tab reaches the input.
```

The `slowed` story's `hover` and `focus` snapshots are what guard the visible percentage; `resting`
guards its absence. The linger needs no snapshot of its own — but if you want one, drive it with the
controlled `showPercent` prop through `openArgs: 'showPercent:!true'` plus the `open` state, the
mechanism `HoverCard.a11y.ts` and five other components already use. **Do not** add a `play()` click.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "TempoControl"
open -a Docker
pnpm test:vr:docker:update
git status --short client/src
pnpm test:vr:docker
```

Expected: a11y PASS; only new `tempocontrol-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/TempoControl
git commit -m "feat(client): add the header TempoControl on Base UI NumberField (NH-291)"
```

---

### Task 6: Wire the transport row — Loop, Metronome, Count-In, and the scrubber

**Files:**

- Modify: `client/src/index.ts`
- Create: `web/app/play/TransportRow.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `Scrubber`, `TransportToggle` (Tasks 3, 4); the `api` state value and `useAlphaTabEvent` from Plan A's `useAlphaTab` (`web/lib/alphatab/useAlphaTab.ts`).
- Produces: test hooks `data-testid="toggle-loop"`, `"toggle-metronome"`, `"toggle-countin"`, and `data-duration` / `data-looping` / `data-metronome` / `data-countin` on `player-status`. **NOT `data-position`** — Plan A removed it under the no-test-instrumentation rule; the seek assertion reads AlphaTab's own clock instead.

- [ ] **Step 1: Write the failing tests**

Add to `web/e2e/player.e2e.ts`:

```ts
test('Loop, Metronome and Count-In each flip the engine state', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const status = page.getByTestId('player-status');
  await expect(status).toHaveAttribute('data-looping', 'false');
  await expect(status).toHaveAttribute('data-metronome', 'false');
  await expect(status).toHaveAttribute('data-countin', 'false');

  await page.getByTestId('toggle-loop').click();
  await page.getByTestId('toggle-metronome').click();
  await page.getByTestId('toggle-countin').click();

  await expect(status).toHaveAttribute('data-looping', 'true');
  await expect(status).toHaveAttribute('data-metronome', 'true');
  await expect(status).toHaveAttribute('data-countin', 'true');
  await expect(page.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'true');
});

test('the scrubber seeks and the position follows', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const status = page.getByTestId('player-status');
  await expect
    .poll(async () => Number(await status.getAttribute('data-duration')))
    .toBeGreaterThan(0);

  const seek = page.getByRole('slider', { name: 'Seek' });
  await seek.focus();
  // Five one-second steps.
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');

  // AlphaTab's own clock, through the debug handle `useAlphaTab` parks on the host element — the
  // same read Plan A Task 11 uses. Deliberately NOT a data-* attribute: `seek` writes
  // `setPositionMs(ms)` optimistically, so a mirrored hook would report the requested value even if
  // the engine refused it, and the assertion would pass on a broken seek.
  //
  // Read the TICK, not the time. With the audio worker enabled (the browser default),
  // `api.timePosition` is served by AlphaSynthWebWorkerApi, whose setter stores the requested value
  // into its local `_currentPosition` BEFORE posting `alphaSynth.setTimePosition` to the worker, and
  // whose getter returns that stored value — so the time position echoes the request whether or not
  // the worker acted on it. That same setter copies `currentTick` through unchanged, so
  // `api.tickPosition` moves only when a real position update arrives back from the worker. The tick
  // is therefore the only one of the two that a refused seek leaves at zero.
  const engineTickPosition = () =>
    page.evaluate(
      () =>
        (
          document.querySelector('[data-testid="notation-surface"] > div') as {
            at?: { tickPosition: number };
          } | null
        )?.at?.tickPosition ?? 0,
    );

  // The score is paused, so the tick only leaves 0 if the worker accepted the five one-second
  // seeks. A tick threshold cannot be a fixed millisecond number — ticks depend on the score's
  // tempo and MIDI division — so assert it moved off the start at all.
  await expect.poll(engineTickPosition, { timeout: 20_000 }).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "Loop, Metronome|scrubber seeks"`
Expected: FAIL — no `toggle-loop`, no `Seek` slider.

- [ ] **Step 3: Export the new components**

Append to `client/src/index.ts`:

```ts
// Pulled across by the v0 transport:
// - Slider is the single-value rail the scrubber, the settings rows and per-track volume all use.
// - Progress is the soundfont download bar.
// - Scrubber, TransportToggle and TempoControl are the transport itself.
export { Slider } from './components/ui/Slider/Slider';
export { Progress } from './components/ui/Progress/Progress';
export { Scrubber } from './components/ui/Scrubber/Scrubber';
export { TransportToggle } from './components/ui/TransportToggle/TransportToggle';
export { TempoControl } from './components/ui/TempoControl/TempoControl';
```

**Do NOT add a `Tooltip` export.** The barrel already carries
`export { Tooltip, TooltipTrigger, TooltipContent }` (Plan A Task 4 put it there, and it is in the file
today) — re-exporting the same names from the same module is `TS2300`, a hard typecheck failure, not a
warning. `TooltipProvider` is the only name not exported, and nothing needs it: `Tooltip` already wraps
itself in `<TooltipProvider>`, so there is no root provider to mount. Verify before editing with
`grep -n Tooltip client/src/index.ts`.

The header comment needs no edit either — it already reads "It grows only when a screen pulls a
component across (spec D3 — the player decides what gets built)", which is exactly what these five
exports are. Follow the convention the existing entries use: a short comment saying WHY each export was
pulled across, not just that it was.

- [ ] **Step 4: Write the transport row**

Create `web/app/play/TransportRow.tsx`:

```tsx
'use client';

import { Scrubber, TransportToggle } from '@notation-hero/client';
import type { ReactNode } from 'react';

interface TransportRowProps {
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  looping: boolean;
  onLoopingChange: (next: boolean) => void;
  metronome: boolean;
  onMetronomeChange: (next: boolean) => void;
  countIn: boolean;
  onCountInChange: (next: boolean) => void;
  /** Whether AlphaTab holds a bar-range selection. Drives the Loop toggle's label and hint only. */
  hasRange: boolean;
  /** Whether the loaded score plays an embedded recording. Metronome and Count-In are inert then. */
  hasBackingTrack: boolean;
  disabled: boolean;
  /** The play/pause control, owned by the shell because it drives api.playPause(). */
  playButton: ReactNode;
}

const Glyph = ({ name }: Readonly<{ name: string }>) => (
  <span className="material-symbols-outlined" aria-hidden="true">
    {name}
  </span>
);

// The transport row layout. It composes client/ controls and holds NO AlphaTab knowledge itself —
// every accessor arrives as a prop from the shell, which is what keeps the controls reusable and
// the client/ gate honest.
//
// No tempo control here: tempo lives in the header (spec §7), so the player has exactly one.
export function TransportRow({
  positionMs,
  durationMs,
  onSeek,
  looping,
  onLoopingChange,
  metronome,
  onMetronomeChange,
  countIn,
  onCountInChange,
  hasRange,
  hasBackingTrack,
  disabled,
  playButton,
}: Readonly<TransportRowProps>) {
  return (
    <div className="flex w-full items-center gap-4 border-t border-border px-6 py-3">
      {playButton}
      {/* The label names WHAT will repeat. With no bar range selected AlphaTab's isLooping restarts
          the whole score when it ends; with one it repeats the selection. The button looks identical
          either way, and the selection gesture (a mouse drag across the notation) is taught nowhere —
          so the label carries it. No marker UI, so the out-of-scope constraint holds. */}
      <TransportToggle
        data-testid="toggle-loop"
        pressed={looping}
        onPressedChange={onLoopingChange}
        label={hasRange ? 'Loop selection' : 'Loop score'}
        tooltip={hasRange ? undefined : 'Drag across bars in the notation to loop just that range'}
        icon={<Glyph name="repeat" />}
        disabled={disabled}
      />
      <Scrubber
        className="flex-1"
        positionMs={positionMs}
        durationMs={durationMs}
        onSeek={onSeek}
        disabled={disabled}
      />
      {/* Material Symbols has no metronome glyph. `avg_pace` is the nearest stock icon; the repo's
          own mockup (docs/mockups/player-flatrow-teal.html) instead inlines an SVG path. Start with
          the stock glyph so nothing unlicensed ships; the icon choice is tracked as NH-294 —
          it is a design call, not an implementation detail. */}
      <TransportToggle
        data-testid="toggle-metronome"
        pressed={metronome}
        onPressedChange={onMetronomeChange}
        label="Metronome"
        tooltip={
          hasBackingTrack ? 'Not available while the file plays its own recording' : undefined
        }
        icon={<Glyph name="avg_pace" />}
        disabled={disabled || hasBackingTrack}
      />
      <TransportToggle
        data-testid="toggle-countin"
        pressed={countIn}
        onPressedChange={onCountInChange}
        label="Count-In"
        tooltip={
          hasBackingTrack ? 'Not available while the file plays its own recording' : undefined
        }
        icon={<Glyph name="timer" />}
        disabled={disabled || hasBackingTrack}
      />
    </div>
  );
}
```

> `data-testid` reaches the rendered `<button>` without any extra work: Base UI's `Toggle` extends
> `NativeButtonProps`, and Task 4's props spread `...rest` onto it. Do not wrap the toggle in a div to
> attach test hooks — that would break the axe name/role checks.

- [ ] **Step 5: Wire the shell to the api**

In `web/app/play/PlayerShell.tsx`'s `Player`, add state and accessors:

```tsx
// The playhead. This IS product state — the Scrubber is a controlled component over it — which is
// why it may exist here when Plan A's `data-position` DOM hook may not: the rule Plan A applied bans
// test-only instrumentation, not UI state.
const [positionMs, setPositionMs] = useState(0);
const [durationMs, setDurationMs] = useState(0);
const [looping, setLooping] = useState(false);
const [metronome, setMetronome] = useState(false);
const [countIn, setCountIn] = useState(false);
// Whether AlphaTab currently holds a bar-range selection — drives the Loop toggle's label only.
const [hasRange, setHasRange] = useState(false);
// The live score tempo. Declared HERE, not in Task 7, because the position handler below writes it —
// Task 7 only READS it for the header pill. Task 6 has to commit green on its own, and it cannot if a
// setter it calls is declared a task later. The 120 is the pre-load placeholder only.
const [scoreTempo, setScoreTempo] = useState(120);
```

Add the position subscription through `useAlphaTabEvent`. Plan A creates none — it subscribes only to
`error`, `renderFinished`, `playerStateChanged` and `playerReady` — so this is the first one, and it
must go through the helper rather than a hand-written `.on()` (see Global Constraints). It carries
three jobs — position, length and the live tempo — and two guards that are **not** optional:

```tsx
// Guard 1 — `endTime === 0` is the hardcoded PositionChangedEventArgs(0,0,0,0,false,120,120) stub that
// `fireOnRegister` replays synchronously at subscribe time. Without this the header flashes 120 BPM on
// a 90 BPM score.
//
// Guard 2 — after a seek, alphaTab delivers a burst of STALE position events before the seek's own
// echo. They carry `isSeek: false`, identical to every ordinary tick, so the flag cannot filter them.
// What does: the echo carries `isSeek: true` AND exactly the requested time (clamped to endTime), and
// MessagePort delivery is FIFO, so drop everything until that pair matches. The 250 ms timeout is
// mandatory, not decoration — a seek issued during a count-in emits NO event at all (alphaTab gates
// the trigger on `isPlayingMain`), and without the bound the UI would latch forever.
const pendingSeek = useRef<{ target: number; since: number } | null>(null);

// The worklet posts one samplesPlayed message per 128-frame audio quantum, and each one triggers
// a positionChanged — about 345 events per second at 44.1 kHz. Writing state on every one of them
// commits React ~345 times a second for a clock that only shows whole seconds. Coalesce to one
// commit per animation frame: stash the latest args in a ref, schedule a single frame, and let the
// frame do the writing. The guards still run on EVERY event — dropping a stale post-seek event is
// about correctness, not rate — so only the state write is throttled.
// (`PositionChangedEventArgs` needs `import type { PositionChangedEventArgs } from
// '@coderline/alphatab'` if it is not already imported — `web/`'s import fence allows type-only
// imports of the package, unlike `client/`'s.)
const latestPosition = useRef<PositionChangedEventArgs | null>(null);
const positionFrame = useRef<number | null>(null);

useEffect(
  () => () => {
    if (positionFrame.current !== null) cancelAnimationFrame(positionFrame.current);
  },
  [],
);

useAlphaTabEvent(api, 'playerPositionChanged', (args) => {
  if (args.endTime === 0) return; // guard 1

  if (pendingSeek.current) {
    // guard 2
    const expect = Math.min(pendingSeek.current.target, args.endTime);
    const matched = args.isSeek && Math.abs(args.currentTime - expect) < 1;
    if (!matched && performance.now() - pendingSeek.current.since < 250) return;
    pendingSeek.current = null;
  }

  latestPosition.current = args;
  if (positionFrame.current !== null) return; // a frame is already scheduled
  positionFrame.current = requestAnimationFrame(() => {
    positionFrame.current = null;
    const next = latestPosition.current;
    if (!next) return;
    setPositionMs(next.currentTime);
    setDurationMs(next.endTime);
    setScoreTempo(next.originalTempo); // live; score.tempo is the INITIAL tempo only
  });
});

// The correct opening tempo, before a single frame has played. Also replays for late subscribers.
useAlphaTabEvent(api, 'midiLoaded', (args) => setScoreTempo(args.originalTempo));

// F-15: the Loop toggle's label needs to know whether a bar range is selected.
useAlphaTabEvent(api, 'playbackRangeChanged', (args) => setHasRange(args.playbackRange !== null));
```

and add the three accessors, each writing to the api and mirroring into state:

```tsx
// `api` is the state value from Plan A's `useAlphaTab`, already in scope in `Player` — there is no
// apiRef. Because it is state and not a ref it MUST be in the dependency list (Global Constraints).
const applyLooping = useCallback(
  (next: boolean) => {
    setLooping(next);
    if (api) api.isLooping = next;
  },
  [api],
);

// Metronome and Count-In are VOLUMES in AlphaTab, not booleans: 0 is off and 1 is the normal
// level, so the toggle maps to the two ends rather than calling a method.
const applyMetronome = useCallback(
  (next: boolean) => {
    setMetronome(next);
    if (api) api.metronomeVolume = next ? 1 : 0;
  },
  [api],
);

const applyCountIn = useCallback(
  (next: boolean) => {
    setCountIn(next);
    if (api) api.countInVolume = next ? 1 : 0;
  },
  [api],
);

const seek = useCallback(
  (ms: number) => {
    if (api) api.timePosition = ms;
    setPositionMs(ms); // optimistic; the guard above reconciles on the echo
    pendingSeek.current = { target: ms, since: performance.now() };
  },
  [api],
);
```

Render `<TransportRow … hasRange={hasRange} hasBackingTrack={hasBackingTrack} … />` below the notation
surface, move the existing play/pause `Button` into its `playButton` prop, and add the new attributes to
the status element. Derive `hasBackingTrack` from the loaded score — `api.score?.backingTrack != null` is
the expected source; confirm on the bundled sample (which has none) and on a Guitar Pro 8 file with an
embedded recording that the property is non-null only when a recording really is present, before
trusting it to gate the two toggles:

```tsx
        data-duration={durationMs}
        data-looping={looping}
        data-metronome={metronome}
        data-countin={countIn}
```

- [ ] **Step 6: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS — including Plan A's cases, which must not regress.

- [ ] **Step 7: 🧑 HUMAN GATE — hand back to the maintainer. Verify by ear; this is what criterion 5 actually asks**

```bash
pnpm --filter @notation-hero/web run dev
```

On `/play` with the sample loaded: turn Metronome on and confirm you **hear a click**; turn Count-In on, press play, and confirm you hear a count before the music; select a bar range in the notation with the mouse, turn Loop on, and confirm the range repeats. Then, **with the score paused and again while it plays, drag the scrubber to the middle and confirm the notation cursor jumps to the matching bar and continues from there** — nothing in CI observes the cursor, and `seek` writes `setPositionMs(ms)` optimistically, so the Scrubber shows the requested value whether or not AlphaTab accepted it — which is exactly why the CI assertion reads the engine's clock rather than the app's state. Headless Chromium is silent, so the CI lane can only prove the state flipped — the sound is yours to confirm.

A–B range selection is **mouse-only**: AlphaTab builds it from `mousedown`/`mousemove`/`mouseup` and registers no touch or pointer handlers, so on a touch screen a drag across bars scrolls instead of selecting. The Loop toggle itself works everywhere. That is expected, not a bug.

- [ ] **Step 8: Commit**

```bash
git add client/src/index.ts web/app/play/TransportRow.tsx web/app/play/PlayerShell.tsx \
  web/e2e/player.e2e.ts
git commit -m "feat(web): wire the transport row — loop, metronome, count-in and seek (NH-291)"
```

---

### Task 7: Wire the tempo control into the header

**Files:**

- Extract: `web/app/play/PlayerHeader.tsx` — Plan A Task 11 Step 3 already renders this header inline in `PlayerShell.tsx`. Move it out rather than building a second one, preserving `data-testid="loaded-notation-name"` and `data-file` (Plan A's e2e tests assert on both).
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `TempoControl` (Task 5); `scoreTempo`, which `PlayerShell` already holds live from `midiLoaded` + `playerPositionChanged` (Task 6 Step 5) — never `score.tempo`; the score title and open file name, both already held by `PlayerShell` (Plan A).
- Produces: `data-speed` on `player-status`. No new title path — Plan A Task 11 Step 3 already put the open score's title in `PlayerShell`.

- [ ] **Step 1: Write the failing test**

Add to `web/e2e/player.e2e.ts`:

```ts
test('the header tempo stepper changes playback speed', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  // The readout is a real input now (Base UI NumberField), so read its value, not its text.
  const value = page.getByRole('textbox', { name: 'Tempo' });
  const shown = Number(await value.inputValue());
  expect(shown).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Increase tempo' }).click();
  await expect(value).toHaveValue(String(shown + 1));
  // Off written speed now, and the button still holds focus, so the percentage is visible.
  await expect(page.getByTestId('tempo-control')).toHaveAttribute('data-off-speed', 'true');
  await expect(page.getByTestId('tempo-percent')).toBeVisible();

  // And the engine actually took it.
  await expect
    .poll(async () => Number(await page.getByTestId('player-status').getAttribute('data-speed')))
    .toBeGreaterThan(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "tempo stepper"`
Expected: FAIL — no `Tempo` input.

- [ ] **Step 3: Extract the header**

Plan A Task 11 Step 3 renders this header inline, as the first child of `<main>` in `PlayerShell.tsx`: the wordmark, then the score title with the file name in a tooltip behind it. Move that markup into `web/app/play/PlayerHeader.tsx`, keeping its STRUCTURE and both `data-` attributes, and add the tempo pill beside it. The classes below are deliberately restyled for a standalone bar — the wordmark takes the brand colour, the title takes `flex-1` so the pill sits right, and the `<header>` gains its own height, border and padding, which the inline version inherited from `<main>`. Where the prose and the code below disagree, the code wins. Both `data-testid="loaded-notation-name"` and `data-file` must survive the move — Plan A's e2e tests assert on them, so dropping either turns that lane red.

```tsx
'use client';

import { TempoControl, Tooltip, TooltipContent, TooltipTrigger } from '@notation-hero/client';

interface PlayerHeaderProps {
  scoreTitle: string;
  fileName: string;
  scoreTempo: number;
  speed: number;
  onSpeedChange: (next: number) => void;
  disabled: boolean;
}

// The header bar. Tempo lives here, not in the transport row, so the player has exactly one tempo
// control (spec §7).
//
// The wordmark, the title and its tooltip came from Plan A Task 11 Step 3, which rendered them inline
// in PlayerShell. The STRUCTURE and both data- attributes move across unchanged — Plan A's e2e tests
// read them — while the classes are restyled for a standalone bar. The tempo pill is what this adds.
//
// Deliberately absent in v0: the Auto-Speed toggle (a practice feature — it needs the v0.2 scoring
// work) and the MIDI status icon (no Web MIDI until v0.2). The Settings gear arrives in Plan C.
export function PlayerHeader({
  scoreTitle,
  fileName,
  scoreTempo,
  speed,
  onSpeedChange,
  disabled,
}: Readonly<PlayerHeaderProps>) {
  return (
    <header className="flex h-16 items-center gap-8 border-b border-border px-6">
      <span className="font-bold text-primary">Notation Hero</span>
      <Tooltip>
        <TooltipTrigger
          render={
            // A real <button> so the tooltip is reachable by keyboard, not only by hover. It does
            // nothing on click; min-h-11/min-w-11 keeps it over the 44 px hit area.
            <button
              type="button"
              data-testid="loaded-notation-name"
              data-file={fileName}
              className="min-h-11 min-w-11 flex-1 truncate px-1 text-left text-muted-foreground"
            >
              {scoreTitle || fileName}
            </button>
          }
        />
        <TooltipContent>{fileName}</TooltipContent>
      </Tooltip>
      <TempoControl
        scoreTempo={scoreTempo}
        speed={speed}
        onSpeedChange={onSpeedChange}
        disabled={disabled}
      />
    </header>
  );
}
```

- [ ] **Step 4: Wire the shell**

In `PlayerShell.tsx`'s `Player`:

```tsx
const [speed, setSpeed] = useState(1);
// `scoreTempo` is already declared in Task 6 Step 5 — seeded from `api.midiLoaded` and kept live by
// `playerPositionChanged`, never from `score.tempo`. This task only reads it. Do not redeclare it.

// The title and the file name are Plan A's — Task 11 Step 3 already declares `openFileName` in this
// scope and `notation.score.title` is the shell's own state. Do NOT redeclare either: a second
// `const openFileName` is TS2451. The existing bindings just move from the inline <header> into the
// <PlayerHeader …> props below.

// The ONLY writer of api.playbackSpeed in the app — see Global Constraints. Plan C's Settings
// Player-group row must call this, not the settings-JSON accessor path.
const applySpeed = useCallback(
  (next: number) => {
    setSpeed(next);
    if (api) api.playbackSpeed = next;
  },
  [api],
);

// A new score keeps the speed the drummer chose: the BPM readout moves because the score's own
// tempo changed, not because the multiplier was reset.
```

Replace Plan A's inline `<header>` with `<PlayerHeader scoreTitle={notation?.score.title ?? ''} fileName={openFileName} … />`, and add `data-speed={speed}` to the status element. `NotationSurface` is untouched by this task. Drop `Tooltip`, `TooltipContent` and `TooltipTrigger` from `PlayerShell.tsx`'s `@notation-hero/client` import in the same edit — Plan A Task 11 Step 3 added them for the inline header and nothing else in the file uses them, so leaving them behind fails `eslint . --max-warnings 0` (`@typescript-eslint/no-unused-vars` is an error). `Button` and `toast` stay.

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 6: 🧑 HUMAN GATE — hand back to the maintainer. Verify by ear**

With the sample playing, press `+` several times and confirm the music genuinely speeds up (not just the number). Press `−` past the floor and confirm it stops at 12.5 %.

- [ ] **Step 7: Commit**

```bash
git add web/app/play/PlayerHeader.tsx web/app/play/PlayerShell.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): add the header tempo control and drive playbackSpeed (NH-291)"
```

---

### Task 8: The soundfont progress bar

This covers the **soundfont only** — 302 KB gzip of the ~1.6 MB first-load payload — so do not frame it as a whole-payload bar. It cannot even start until the engine has already downloaded.

**Files:**

- Modify: `web/app/play/NotationSurface.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `Progress` (Task 2); `useAlphaTabEvent` (Plan A). No new error code: a soundfont failure surfaces as `api.error`, which Plan A already handles as `PLAYER_ERROR.engineRuntime`.
- Produces: `onSoundFontProgress: (fraction: number | null) => void` on `NotationSurface`.

- [ ] **Step 1: Write the failing test**

Add to `web/e2e/player.e2e.ts`:

```ts
test('shows a soundfont progress bar while the sounds download, then hides it', async ({
  page,
}) => {
  // Stretch the soundfont TRANSFER so the bar is observable — it is otherwise a sub-second
  // window, and Task 8 Step 4 only mounts the bar once progress has run past a 300 ms delay.
  // Delaying the START of the request (page.route + setTimeout + route.continue) does not help:
  // it shifts the same sub-second transfer later, and AlphaTab's soundFontLoad events only fire
  // while bytes arrive. Throttle the network at the browser level instead, BEFORE navigating.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    // ~150 KB/s: the ~302 KB soundfont then takes roughly two seconds to arrive, which is
    // comfortably past the 300 ms appear-delay and well inside the 30 s visibility timeout.
    downloadThroughput: 150 * 1024,
    uploadThroughput: 150 * 1024,
  });

  await page.goto('/play');

  const bar = page.getByRole('progressbar', { name: /sound/i });
  await expect(bar).toBeVisible({ timeout: 30_000 });

  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await expect(bar).toHaveCount(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "soundfont progress"`
Expected: FAIL — no progressbar.

- [ ] **Step 3: Subscribe to all three soundfont events**

In `NotationSurface.tsx`, beside its existing `useAlphaTabEvent(api, 'error', …)` and
`useAlphaTabEvent(api, 'renderFinished', …)` calls — they are top-level hook calls, not `.on()` inside
an effect. (`NotationSurface` has two `useEffect`s by then — the music-font `loadingerror` watcher and
Plan A Task 11's `renderScore` effect — and the new subscription belongs in neither.)
Widen `NotationSurfaceProps` first; Plan A finalised it as `{ api, hostRef, viewportRef, notation }`:

```tsx
  /** Soundfont download progress: a 0-1 fraction, or null when no fraction can be computed. */
  onSoundFontProgress: (fraction: number | null) => void;
```

```tsx
// AlphaTab forwards the raw XMLHttpRequest ProgressEvent, so two numeric cases are real:
//   - `total` is 0 when the response carries no Content-Length -> no fraction exists, so
//     report null and let Progress render its indeterminate style.
//   - `total` is the ENCODED length while `loaded` counts DECODED bytes when the CDN
//     compresses, so the ratio can exceed 1 -> clamp.
// Vercel's compression of .sf3 is unverified (spec Q2), so BOTH branches are reachable.
useAlphaTabEvent(api, 'soundFontLoad', (progress) => {
  onSoundFontProgress(progress.total > 0 ? Math.min(1, progress.loaded / progress.total) : null);
});
```

`soundFontLoad` is progress only. The two terminal events are wired in `PlayerShell` beside the
`playerPositionChanged` subscription **this plan's Task 6 Step 5 adds** (Plan A creates none), because the callback above is typed
`(fraction: number | null) => void` and **cannot carry the `undefined` that means "not downloading"**:

```tsx
useAlphaTabEvent(api, 'soundFontLoaded', () => setSoundFontProgress(undefined));

// Without this the bar freezes at whatever fraction it last reported, forever, with nothing on
// screen saying why — for a failure the spec already handles like the corrupt-file toast.
//
// There is NO `showFailureToast` helper, and there is no soundfont-specific event to subscribe to
// either: `soundFontLoadFailed` belongs to AlphaSynthBase/IAlphaSynth, NOT to AlphaTabApiBase, so
// `useAlphaTabEvent(api, 'soundFontLoadFailed', …)` is not in `keyof AlphaTabApiEvents` and is a
// TS2345 compile error. AlphaTabApiBase forwards the failure itself
// (`player.soundFontLoadFailed.on((e) => { this.onError(e); })`),
// so it reaches the app as `api.error`, which Plan A ALREADY subscribes to in NotationSurface and
// reports as PLAYER_ERROR.engineRuntime — whose own doc comment reads "AlphaTab raised its own error
// event — in practice, the soundfont download". So do NOT add an E205 member to player-errors.ts:
// the message already exists. Clear the bar from the handler that already exists:
useAlphaTabEvent(api, 'error', () => setSoundFontProgress(undefined));
```

- [ ] **Step 4: Render the bar**

In `PlayerShell.tsx`, hold `soundFontProgress: number | null | undefined` (`undefined` meaning "not
downloading"), set it from the callback, and clear it in the two terminal handlers from Step 3.

Rendering is **delay-then-hold**, not immediate. On a normal connection this download is a sub-second
window — the e2e case below has to stall the request by four seconds just to make the bar observable —
so rendering it the instant progress starts produces a strobe at exactly the moment the user is first
orienting. Show it only once the download has been running ~300 ms, and keep it mounted at least 500 ms
once shown:

```tsx
// visible === progress has run past the delay; a fast connection never shows the bar at all.
const visible = useDelayedVisibility(soundFontProgress !== undefined, {
  appearAfterMs: 300,
  holdForMs: 500,
});

{
  visible ? (
    <Progress value={soundFontProgress ?? null} label="Loading sounds" className="w-full" />
  ) : null;
}
```

Keep `useDelayedVisibility` local to `web/app/play/` — it is one small hook over two timers, not a
design-system concern, and `client/` has no other consumer for it.

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 6: 🧑 HUMAN GATE — hand back to the maintainer. Exercise the indeterminate branch by hand**

The `total === 0` branch only fires when the response carries no `Content-Length`. Force it locally to prove the code path renders rather than throwing:

```bash
pnpm --filter @notation-hero/web run dev
```

In the browser console before loading a score:

```js
// Strip Content-Length from the soundfont response so total lands as 0.
const original = window.fetch;
window.fetch = async (...args) => {
  const response = await original(...args);
  if (String(args[0]).includes('sonivox.sf3')) {
    return new Response(response.body, { status: 200, headers: {} });
  }
  return response;
};
```

AlphaTab loads the soundfont with `XMLHttpRequest`, not `fetch`, so if that override does not reach it, use DevTools' network throttling plus a proxy — or accept the branch as unit-covered by Task 2's `value={null}` test and say so in the PR. Do not claim it is verified if you did not see it.

- [ ] **Step 7: Commit**

```bash
git add web/app/play web/e2e/player.e2e.ts
git commit -m "feat(web): show soundfont download progress (NH-291)"
```

---

### Task 9: Extend the axe gate and open the PR

**Files:**

- Modify: `web/e2e/a11y.e2e.ts`

- [ ] **Step 1: Add the loaded-with-transport axe case**

Plan A's `a11y.e2e.ts` already audits `/play` loaded, but the transport did not exist then. Add a case that exercises the pressed states, because a toggle's pressed styling is where contrast usually breaks:

```ts
test('player has no axe violations with every transport toggle pressed', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('toggle-loop').click();
  await page.getByTestId('toggle-metronome').click();
  await page.getByTestId('toggle-countin').click();
  await page.getByRole('button', { name: 'Increase tempo' }).click();

  await expectNoViolations(page, 'play / transport pressed');
});
```

- [ ] **Step 2: Run it**

Run: `pnpm --filter @notation-hero/web run test:e2e a11y`
Expected: PASS. Fix any violation in the markup, never by loosening the assertion.

- [ ] **Step 3: 🧑 HUMAN GATE — hand back to the maintainer. Measure every new control's hit area**

```bash
pnpm --filter @notation-hero/web run dev
```

In the browser console on a loaded `/play`. Measure the **pointer target**, not the hidden input — a Base UI
slider's `input[type="range"]` is sized to its 16 px thumb by design and can never pass a 44 px test; the
element that receives the click is the slider's `Control`, which carries `h-11`:

```js
[
  ...document.querySelectorAll(
    'button, a[href], label[for], [role="button"], [data-slot="slider"] [class*="h-11"]',
  ),
]
  .map((el) => ({
    label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20),
    ...el.getBoundingClientRect().toJSON(),
  }))
  .filter((r) => r.width < 44 || r.height < 44);
```

Expected: an **empty array**.

- [ ] **Step 4: Run every gate**

```bash
pnpm run check:all
pnpm --filter @notation-hero/client run test:a11y
pnpm test:vr:docker
pnpm --filter @notation-hero/web run test:e2e
```

Expected: all PASS.

- [ ] **Step 5: Commit, push, open the PR**

```bash
git add web/e2e/a11y.e2e.ts
git commit -m "test(web): axe over the transport's pressed states (NH-291)"
git push
gh pr create --title "feat: v0 transport — scrubber, tempo, loop, metronome, count-in (NH-291)" --body "$(cat <<'EOF'
Implements Plan B of the v0 local-file drum player.

Spec: `docs/specs/2026-09-10-v0-local-file-player-design.md`
Plan: `docs/plans/2026-09-13-v0b-transport-plan.md`

## New design-system components

`Slider` (single-value, on Base UI `Slider`), `Progress` (determinate + indeterminate, on Base UI
`Progress`), `Scrubber`, `TransportToggle` (on Base UI `Toggle`) and `TempoControl` (on Base UI
`NumberField` — editable, wheel- and drag-scrubbable) — each with a Storybook story plus VR and axe
baselines that block merge. `Tooltip` was already built and already exported by Plan A; this PR only consumes it.

## Success criteria covered

- [x] 3 (tempo half) — the header stepper changes playback speed; per-track mute/solo is Plan C
- [x] 5 — Loop, Metronome and Count-In each audibly change playback (verified by ear; CI verifies the state)
- [x] 6 — the scrubber seeks and the cursor follows (cursor confirmed by eye; CI verifies only the reported position)

## Notes

- A–B loop markers are deliberately absent: v0 uses AlphaTab's native bar-range selection plus the Loop toggle. Range selection is mouse-only — AlphaTab registers no touch or pointer handlers — which is why A–B is not in the acceptance set.
- The metronome glyph is the stock Material Symbols `avg_pace`; Material Symbols ships no metronome icon and the mockup's inline SVG has unestablished provenance. Icon choice tracked as [NH-294](https://leocaseiro.atlassian.net/browse/NH-294).
- Playback speed does **not** survive a reload: `playbackSpeed` is an `AlphaTabApi` property, not a field in AlphaTab's `Settings` JSON, so it cannot ride the settings persistence the other preferences use. Tracked as [NH-295](https://leocaseiro.atlassian.net/browse/NH-295).
- Task 7 **extracts** `PlayerHeader.tsx` rather than creating it: Plan A Task 11 Step 3 already renders the app name and the score title as an inline `<header>` in `PlayerShell.tsx`, so Task 7 moves that markup out and adds the tempo pill. `data-testid="loaded-notation-name"` and `data-file` must survive the move — Plan A's e2e tests assert on them. This resolves [NH-296](https://leocaseiro.atlassian.net/browse/NH-296).

## Open items tracked outside this plan

| Ticket | Item |
| --- | --- |
| [NH-294](https://leocaseiro.atlassian.net/browse/NH-294) | Decide the Metronome toggle's glyph — `avg_pace` is a flagged placeholder |
| [NH-295](https://leocaseiro.atlassian.net/browse/NH-295) | Decide whether playback speed survives a reload |
| [NH-296](https://leocaseiro.atlassian.net/browse/NH-296) | **Resolved 2026-09-19** — it does duplicate. Task 7 now extracts Plan A's inline `<header>` instead of creating a second one |
| [NH-297](https://leocaseiro.atlassian.net/browse/NH-297) | `alphaTabWebsite` fork: `score.tempo` mis-times its hit windows (not a notation-hero change) |

## Pulumi preview

safe — no `infra/` changes in this PR.
EOF
)"
gh run watch
```

- [ ] **Step 6: Update the decision registry**

Add a Change-log entry in `docs/decisions/decision-registry.md` and commit it in this PR so it lands
atomically on merge. It must record:

- The design system gained `Slider`, `Progress`, `Scrubber`, `TransportToggle` and `TempoControl`, all
  gated by VR + axe. (`Tooltip` was already public — Plan A exported it.)
- **Every new control is built on a Base UI primitive** (`Slider`, `Progress`, `Toggle`, `NumberField`)
  rather than hand-rolled — the standing convention, ratified again in the 2026-09-13 plan review.
- The **Spec Delta** on the tempo control: percentage on hover/focus and never at 100 %, `± 1` with
  hold-to-repeat instead of `± 5`, and a 3 s linger — superseding the "only while adjusting, ±5" line in
  `docs/specs/2026-09-10-v0-local-file-player-design.md` §7.
- The vocabulary decision: a piece of music is a **`score`**, a **`notation`** is the score file, and
  "chart" is not used.

---

## Self-Review

**Spec coverage.** §7 `client/` list → Tasks 1-5 (playback scrubber, tempo control, Loop/Metronome/Count-In toggles, soundfont progress bar, `Slider`). §7 `web/` "transport row layout" → Task 6. §7 tempo-in-the-header rule → Task 7. §7 "12.5–200 % slider lives in the Settings popover" → explicitly deferred to Plan C in Global Constraints. §7 "Deferred: A/B loop markers" → stated in Global Constraints and in `Scrubber`'s own comment. §4 soundfont progress, both numeric edge cases → Tasks 2 and 8. §8 criteria 3, 5, 6 → Tasks 6, 7. **One documented exception to criterion 5:** on a score that carries an embedded recording AlphaTab's backing-track player discards metronome events, so Metronome and Count-In render disabled with an explanatory tooltip rather than silently doing nothing (Global Constraints). **One Spec Delta**, recorded in Task 5 and in the registry step: the tempo control's percentage rule and step size supersede §7's "only while adjusting, ±5". **Deliberately not covered here:** `Accordion`, the settings and tracks rows, the two popovers and settings persistence (Plan C); the engine, file opening and the test lane (Plan A).

**Base UI first.** Every new control sits on a Base UI primitive rather than a hand-rolled equivalent — `Slider` on `Slider`, `Progress` on `Progress`, `TransportToggle` on `Toggle`, `TempoControl` on `NumberField`. Each choice deletes hand-written ARIA, clamping or interaction code the primitive already owns. `Scrubber` is the one composition (it wraps `Slider`), and `Tooltip` already existed.

**Placeholder scan.** Several Step 5 blocks describe a stories file by its shape rather than transcribing it — each names the exact template file to copy (`RangeSlider.stories.tsx`), the exact story ids, and the exact helper config values, so nothing is left to invent. The metronome glyph is a named, shipped default (`avg_pace`) with a flagged design question, not a TODO. One conditional fallback is named explicitly rather than left open: if Base UI rejects `max === min`, fix `Scrubber` not the test. The other two round-1 fallbacks are gone because the questions behind them were settled against the installed packages on 2026-09-19 — `NumberField.Input` does report `textbox`, and the doubled `group-data-[…]` variant does compose. Task 5's note carries both proofs.

**Verified against the installed packages, not assumed.** Every AlphaTab member in Global Constraints resolves in `@coderline/alphatab` 1.8.4's `dist/alphaTab.d.ts`, and the four behaviours marked **observed** were confirmed by running the real synth headless: `score.tempo` reporting the opening tempo for a whole 90→120→60 score, `originalTempo` tracking automations at sub-bar granularity, the `fireOnRegister` 120/120 stub replaying on subscribe, and the post-seek stale-event burst carrying `isSeek: false`. Every `runVrStories` / `runA11yStories` option this plan passes exists in `client/src/vr-helpers.ts` and `a11y-helpers.ts`, and `animate-skeleton-pulse` plus `bg-skeleton` exist in `styles.css` / `Skeleton.tsx`.

**Type consistency.** `Slider`'s `onChange: (next: number) => void` is the same signature `Scrubber` calls. `Scrubber`'s `onSeek` reports **milliseconds** everywhere — the unit `api.timePosition` takes — while its internal bar works in seconds; that conversion lives in one place. `TempoControl` owns `speed` (a multiplier), never BPM, in both the component and `PlayerShell`, and converts BPM↔speed only at its own boundary — which is what keeps it in sync with Plan C's Player settings group. `Progress`'s `value` is a **fraction 0–1 or null** in the component, its test, and the `soundFontLoad` handler; the `undefined` that means "not downloading" lives only in `PlayerShell`, because `onSoundFontProgress` cannot carry it. `TransportToggle`'s `pressed` / `onPressedChange` pair is spelled identically in the component, its test, and all three call sites.

**Four steps a machine cannot do.** Task 6 Step 7, Task 7 Step 6, Task 8 Step 6 and Task 9 Step 3 need human ears or a human browser console. Each is marked `🧑 HUMAN GATE`; an agentic worker stops and hands back rather than self-certifying, and the PR-body box each one backs is ticked only after a person confirms.
