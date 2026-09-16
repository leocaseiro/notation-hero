# v0 Transport — Implementation Plan B "Playback Control" (2 of 3)

> **🧑 HUMAN GATES.** Four steps in this plan cannot be performed by a machine — they need human ears
> (Task 6 Step 7, Task 7 Step 7) or a human browser console (Task 8 Step 6, Task 9 Step 3). Each is marked
> `🧑 HUMAN GATE`. An agentic worker must **stop at each one and hand back**, never self-certify it and
> never tick the checklist item it backs. This repo's `pr-checklist` gate is presence-only — it checks that
> a box is ticked, not that the claim is true — so a ticked box is the artefact a reviewer trusts.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player its transport — a seek bar that scrubs, a tempo control in the header, Loop / Metronome / Count-In toggles that audibly change playback, and a determinate progress bar for the soundfont download.

**Architecture:** Five new presentation-only components in `client/` (`Slider`, `Progress`, `Scrubber`, `TransportToggle`, `TempoControl`), each built on a Base UI primitive and each with a Storybook story plus the VR and axe baselines that block merge. The already-built `Tooltip` is exported alongside them. `web/` composes them into the transport row and the header pill and wires each to an `AlphaTabApi` accessor. Nothing in `client/` imports `@coderline/alphatab` — that is what keeps the gate real, because a `client/` story has no engine instance to provide.

**Tech Stack:** `@base-ui/react` 1.6 — `Slider`, `Progress`, `Toggle` and `NumberField` primitives; every new control is built on one of them rather than hand-rolled. Tailwind 4 tokens, Storybook 10, Playwright 1.61.1 + axe.

**Spec:** [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) — §7 is the component split; §4 is the soundfont progress behaviour.

**Depends on:** [v0 Engine and First Sound — Plan A (1 of 3)](2026-09-13-v0a-engine-and-first-sound-plan.md) — the engine context, the `/play` screen, the `AlphaTabApi` handle and the `web` Playwright lane must all exist first.

**Jira:** epic [NH-291](https://leocaseiro.atlassian.net/browse/NH-291).

**Closes success criteria:** 3 (tempo half), 5 (Loop, Metronome, Count-In each audibly change playback), 6 (the scrubber seeks and the cursor follows).

---

## Global Constraints

Every task's requirements implicitly include this section, plus **all of Plan A's Global Constraints**, which still bind.

- **Every `client/` component here is presentation-only**: `value` in, `onChange` out, option lists as plain arrays, and **no import from `@coderline/alphatab`**. `client/` has no AlphaTab dependency and a Storybook story has no engine instance, so a control that read its options off the library would be gated while rendering fabricated options.
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
    `api.soundFontLoadFailed: IEventEmitterOfT<Error>` is the failure path. All three must be handled —
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

| File                               | Change                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `client/src/index.ts`              | Export the five new components.                                                                         |
| `web/app/play/PlayerShell.tsx`     | Hold transport and soundfont-progress state; render the transport row, the header and the progress bar. |
| `web/app/play/TransportRow.tsx`    | _(new)_ The row layout, wired to the api.                                                               |
| `web/app/play/PlayerHeader.tsx`    | _(new)_ The header bar carrying the tempo pill.                                                         |
| `web/app/play/NotationSurface.tsx` | Report the parsed score's tempo and the soundfont progress upward.                                      |
| `web/e2e/player.e2e.ts`            | Cases for criteria 3, 5 and 6.                                                                          |
| `web/e2e/a11y.e2e.ts`              | Axe over the loaded state now that the transport exists.                                                |

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

Create `client/src/components/ui/Slider/Slider.tsx`. Keep the thumb classes byte-identical to `RangeSlider.tsx`'s so the two read as one system:

```tsx
'use client';

import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/utils';

// Shared with RangeSlider so the two read as one system and cannot drift apart. Exported from
// slider-classes.ts and imported by BOTH components; the earlier plan said to keep the thumb
// classes "byte-identical" by hand, which is exactly the duplication that drifts.
export const SLIDER_CONTROL_CLASS = 'flex h-11 w-full items-center';
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
> deletes a manual clamp, a manual `aria-valuenow` omission, and the hand-written ARIA wiring.

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
// fraction can exceed 1. Base UI clamps to max; this asserts we pass the fraction through correctly.
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
// ARIA defines as "value unknown"; rendering 0 would announce "0 percent" forever) and clamps the
// value into [min, max] for us. This wrapper only paints the track/indicator and adds data-slot.
//
// The indeterminate fill reuses the repo's skeleton keyframe AS-IS. Do not stack a `bg-*` tint on
// it: `animate-skeleton-pulse` animates `background-color` across the whole cycle, so a keyframe
// declaration outranks a normal utility on the same element and the tint is simply never painted —
// while `runVrStories` freezes animations before snapshotting, so the committed baseline would show
// the tint the live page never renders. `Skeleton.tsx` pairs the animation with `bg-skeleton`.
const Progress = ({ value, label, className }: Readonly<ProgressProps>) => (
  <ProgressPrimitive.Root
    value={value === null ? null : value * 100}
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

`TransportToggle.story-ids.ts`: `['default', 'pressed', 'disabled', 'with-tooltip']`. Stories under `title: 'UI/TransportToggle'`, each passing a Material Symbols glyph as `icon`. In `TransportToggle.a11y.ts` set `iconFontStory: () => true` — every story renders a glyph, and that flag makes the helper assert the icon font actually loaded, so a failed load cannot pass silently as ligature fallback text. VR: `states: ['resting', 'focus', 'hover']`, `statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover'])`.

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

> Two things to verify while building, rather than assume: that `NumberField.Input` reports
> `role="textbox"` to Testing Library in the installed version (adjust the queries if it exposes
> `spinbutton` instead), and that `group-data-[…]` nesting resolves as written under Tailwind 4 — if the
> doubled `group-*` variant does not compose, hoist the gate to a single `data-percent` attribute
> computed in TypeScript rather than fighting the variant syntax.

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

- Consumes: `Scrubber`, `TransportToggle` (Tasks 3, 4); the `AlphaTabApi` handle from Plan A's `PlayerShell`.
- Produces: test hooks `data-testid="toggle-loop"`, `"toggle-metronome"`, `"toggle-countin"`, and `data-position` / `data-duration` / `data-looping` / `data-metronome` / `data-countin` on `player-status`.

- [ ] **Step 1: Write the failing tests**

Add to `web/e2e/player.e2e.ts`:

```ts
test('Loop, Metronome and Count-In each flip the engine state', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
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
  await page.getByTestId('load-sample').click();
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

  await expect
    .poll(async () => Number(await status.getAttribute('data-position')))
    .toBeGreaterThanOrEqual(4_000);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "Loop, Metronome|scrubber seeks"`
Expected: FAIL — no `toggle-loop`, no `Seek` slider.

- [ ] **Step 3: Export the new components**

Append to `client/src/index.ts`:

```ts
// The v0 transport (Plan B):
export { Slider } from './components/ui/Slider/Slider';
export { Progress } from './components/ui/Progress/Progress';
export { Scrubber } from './components/ui/Scrubber/Scrubber';
export { TransportToggle } from './components/ui/TransportToggle/TransportToggle';
export { TempoControl } from './components/ui/TempoControl/TempoControl';
// Already built, tested, and carrying committed VR + axe baselines — it was simply never exported.
// The transport's icon-only toggles and the tempo steppers all use it.
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './components/ui/Tooltip/Tooltip';
```

Note the file's own header comment says the Phase 1 surface is "ONLY Button (NH-275 one-component
proof)" and defers the full barrel to Phase 2. These six exports are a deliberate, scoped widening for
v0 — update that comment in the same edit rather than leaving it contradicting the file.

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
        icon={<Glyph name="avg_pace" />}
        disabled={disabled}
      />
      <TransportToggle
        data-testid="toggle-countin"
        pressed={countIn}
        onPressedChange={onCountInChange}
        label="Count-In"
        icon={<Glyph name="timer" />}
        disabled={disabled}
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
const [durationMs, setDurationMs] = useState(0);
const [looping, setLooping] = useState(false);
const [metronome, setMetronome] = useState(false);
const [countIn, setCountIn] = useState(false);
// Whether AlphaTab currently holds a bar-range selection — drives the Loop toggle's label only.
const [hasRange, setHasRange] = useState(false);
```

Extend the `playerPositionChanged` subscription from Plan A. It now carries three jobs — position,
length and the live tempo — and two guards that are **not** optional:

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

api.playerPositionChanged.on((args) => {
  if (args.endTime === 0) return; // guard 1

  if (pendingSeek.current) {
    // guard 2
    const expect = Math.min(pendingSeek.current.target, args.endTime);
    const matched = args.isSeek && Math.abs(args.currentTime - expect) < 1;
    if (!matched && performance.now() - pendingSeek.current.since < 250) return;
    pendingSeek.current = null;
  }

  setPositionMs(args.currentTime);
  setDurationMs(args.endTime);
  setScoreTempo(args.originalTempo); // live; score.tempo is the INITIAL tempo only
});

// The correct opening tempo, before a single frame has played. Also replays for late subscribers.
api.midiLoaded.on((args) => setScoreTempo(args.originalTempo));

// F-15: the Loop toggle's label needs to know whether a bar range is selected.
api.playbackRangeChanged.on((args) => setHasRange(args.playbackRange !== null));
```

and add the three accessors, each writing to the api and mirroring into state:

```tsx
const applyLooping = useCallback((next: boolean) => {
  setLooping(next);
  const api = apiRef.current;
  if (api) api.isLooping = next;
}, []);

// Metronome and Count-In are VOLUMES in AlphaTab, not booleans: 0 is off and 1 is the normal
// level, so the toggle maps to the two ends rather than calling a method.
const applyMetronome = useCallback((next: boolean) => {
  setMetronome(next);
  const api = apiRef.current;
  if (api) api.metronomeVolume = next ? 1 : 0;
}, []);

const applyCountIn = useCallback((next: boolean) => {
  setCountIn(next);
  const api = apiRef.current;
  if (api) api.countInVolume = next ? 1 : 0;
}, []);

const seek = useCallback((ms: number) => {
  const api = apiRef.current;
  if (api) api.timePosition = ms;
  setPositionMs(ms); // optimistic; the guard above reconciles on the echo
  pendingSeek.current = { target: ms, since: performance.now() };
}, []);
```

Render `<TransportRow … />` below the notation surface, move the existing play/pause `Button` into its `playButton` prop, and add the new attributes to the status element:

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

On `/play` with the sample loaded: turn Metronome on and confirm you **hear a click**; turn Count-In on, press play, and confirm you hear a count before the music; select a bar range in the notation with the mouse, turn Loop on, and confirm the range repeats. Then, **with the score paused and again while it plays, drag the scrubber to the middle and confirm the notation cursor jumps to the matching bar and continues from there** — nothing in CI observes the cursor, and `seek` writes `setPositionMs(ms)` unconditionally, so `data-position` reports the requested value whether or not AlphaTab accepted it. Headless Chromium is silent, so the CI lane can only prove the state flipped — the sound is yours to confirm.

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

- Create: `web/app/play/PlayerHeader.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/app/play/NotationSurface.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `TempoControl` (Task 5); the parsed score's `tempo`.
- Produces: `onScoreLoaded: (score: { title: string }) => void` on `NotationSurface`; `data-speed` on `player-status`.

- [ ] **Step 1: Write the failing test**

Add to `web/e2e/player.e2e.ts`:

```ts
test('the header tempo stepper changes playback speed', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
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

- [ ] **Step 3: Report the score's title upward**

In `NotationSurface.tsx`, add an `onScoreLoaded` prop and call it from the score effect right after a successful parse, before `renderScore`:

```tsx
// Title only. The TEMPO deliberately does not travel this path: `score.tempo` is AlphaTab's
// INITIAL tempo and is wrong from the first tempo automation onward (see Global Constraints).
// PlayerShell sources the live tempo from `midiLoaded` + `playerPositionChanged` instead.
onScoreLoaded({ title: score.title });
```

- [ ] **Step 4: Write the header**

Create `web/app/play/PlayerHeader.tsx`:

```tsx
'use client';

import { TempoControl } from '@notation-hero/client';

interface PlayerHeaderProps {
  scoreTitle: string;
  scoreTempo: number;
  speed: number;
  onSpeedChange: (next: number) => void;
  disabled: boolean;
}

// The header bar. Tempo lives here, not in the transport row, so the player has exactly one tempo
// control (spec §7).
//
// Deliberately absent in v0: the Auto-Speed toggle (a practice feature — it needs the v0.2 scoring
// work) and the MIDI status icon (no Web MIDI until v0.2). The Settings gear arrives in Plan C.
export function PlayerHeader({
  scoreTitle,
  scoreTempo,
  speed,
  onSpeedChange,
  disabled,
}: Readonly<PlayerHeaderProps>) {
  return (
    <header className="flex h-16 items-center gap-8 border-b border-border px-6">
      <span className="font-bold text-primary">Notation Hero</span>
      <span className="flex-1 truncate text-muted-foreground">{scoreTitle}</span>
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

- [ ] **Step 5: Wire the shell**

In `PlayerShell.tsx`'s `Player`:

```tsx
const [speed, setSpeed] = useState(1);
// Seeded from `api.midiLoaded` and kept live by `playerPositionChanged` (Task 6 Step 5), never from
// `score.tempo`. The 120 here is only the pre-load placeholder.
const [scoreTempo, setScoreTempo] = useState(120);
const [scoreTitle, setScoreTitle] = useState('');

// The ONLY writer of api.playbackSpeed in the app — see Global Constraints. Plan C's Settings
// Player-group row must call this, not the settings-JSON accessor path.
const applySpeed = useCallback((next: number) => {
  setSpeed(next);
  const api = apiRef.current;
  if (api) api.playbackSpeed = next;
}, []);

const handleScoreLoaded = useCallback(({ title }: { title: string }) => {
  setScoreTitle(title);
  // A new score keeps the speed the drummer chose — the BPM readout moves because the score's
  // own tempo changed, not because the multiplier was reset.
}, []);
```

Render `<PlayerHeader … />` above the notation surface, pass `onScoreLoaded={handleScoreLoaded}` to `NotationSurface`, and add `data-speed={speed}` to the status element.

- [ ] **Step 6: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 7: 🧑 HUMAN GATE — hand back to the maintainer. Verify by ear**

With the sample playing, press `+` several times and confirm the music genuinely speeds up (not just the number). Press `−` past the floor and confirm it stops at 12.5 %.

- [ ] **Step 8: Commit**

```bash
git add web/app/play/PlayerHeader.tsx web/app/play/PlayerShell.tsx \
  web/app/play/NotationSurface.tsx web/e2e/player.e2e.ts
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

- Consumes: `Progress` (Task 2).
- Produces: `onSoundFontProgress: (fraction: number | null) => void` on `NotationSurface`.

- [ ] **Step 1: Write the failing test**

Add to `web/e2e/player.e2e.ts`:

```ts
test('shows a soundfont progress bar while the sounds download, then hides it', async ({
  page,
}) => {
  // Stall the soundfont so the bar is observable — it is otherwise a sub-second window.
  await page.route('**/alphatab/soundfont/sonivox.sf3', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4_000));
    await route.continue();
  });

  await page.goto('/play');
  await page.getByTestId('load-sample').click();

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

In `NotationSurface.tsx`'s mount effect, beside the existing `api.error` and `api.renderFinished` subscriptions:

```tsx
// AlphaTab forwards the raw XMLHttpRequest ProgressEvent, so two numeric cases are real:
//   - `total` is 0 when the response carries no Content-Length -> no fraction exists, so
//     report null and let Progress render its indeterminate style.
//   - `total` is the ENCODED length while `loaded` counts DECODED bytes when the CDN
//     compresses, so the ratio can exceed 1 -> clamp.
// Vercel's compression of .sf3 is unverified (spec Q2), so BOTH branches are reachable.
api.soundFontLoad.on((progress) => {
  onSoundFontProgress(progress.total > 0 ? Math.min(1, progress.loaded / progress.total) : null);
});
```

`soundFontLoad` is progress only. The two terminal events are wired in `PlayerShell` beside the
`playerPositionChanged` subscription, because the callback above is typed
`(fraction: number | null) => void` and **cannot carry the `undefined` that means "not downloading"**:

```tsx
api.soundFontLoaded.on(() => setSoundFontProgress(undefined));

// Without this the bar freezes at whatever fraction it last reported, forever, with nothing on
// screen saying why — for a failure the spec already handles like the corrupt-file toast.
api.soundFontLoadFailed.on((error) => {
  setSoundFontProgress(undefined);
  showFailureToast(error); // the same path the corrupt-file and engine-import failures use
});
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
  await page.getByTestId('load-sample').click();
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
baselines that block merge. `Tooltip` was already built, with committed VR and axe baselines; this PR only exports it.

## Success criteria covered

- [x] 3 (tempo half) — the header stepper changes playback speed; per-track mute/solo is Plan C
- [x] 5 — Loop, Metronome and Count-In each audibly change playback (verified by ear; CI verifies the state)
- [x] 6 — the scrubber seeks and the cursor follows (cursor confirmed by eye; CI verifies only the reported position)

## Notes

- A–B loop markers are deliberately absent: v0 uses AlphaTab's native bar-range selection plus the Loop toggle. Range selection is mouse-only — AlphaTab registers no touch or pointer handlers — which is why A–B is not in the acceptance set.
- The metronome glyph is the stock Material Symbols `avg_pace`; Material Symbols ships no metronome icon and the mockup's inline SVG has unestablished provenance. Icon choice tracked as [NH-294](https://leocaseiro.atlassian.net/browse/NH-294).
- Playback speed does **not** survive a reload: `playbackSpeed` is an `AlphaTabApi` property, not a field in AlphaTab's `Settings` JSON, so it cannot ride the settings persistence the other preferences use. Tracked as [NH-295](https://leocaseiro.atlassian.net/browse/NH-295).
- Task 7 creates `PlayerHeader.tsx` carrying the app name, the score title and the tempo pill. If Plan A already renders app chrome on `/play`, that becomes a merge rather than a create — tracked as [NH-296](https://leocaseiro.atlassian.net/browse/NH-296).

## Open items tracked outside this plan

| Ticket | Item |
| --- | --- |
| [NH-294](https://leocaseiro.atlassian.net/browse/NH-294) | Decide the Metronome toggle's glyph — `avg_pace` is a flagged placeholder |
| [NH-295](https://leocaseiro.atlassian.net/browse/NH-295) | Decide whether playback speed survives a reload |
| [NH-296](https://leocaseiro.atlassian.net/browse/NH-296) | Check Plan A's `/play` chrome does not duplicate Task 7's header |
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
  gated by VR + axe, and `Tooltip` became part of the public surface.
- **Every new control is built on a Base UI primitive** (`Slider`, `Progress`, `Toggle`, `NumberField`)
  rather than hand-rolled — the standing convention, ratified again in the 2026-09-13 plan review.
- The **Spec Delta** on the tempo control: percentage on hover/focus and never at 100 %, `± 1` with
  hold-to-repeat instead of `± 5`, and a 3 s linger — superseding the "only while adjusting, ±5" line in
  `docs/specs/2026-09-10-v0-local-file-player-design.md` §7.
- The vocabulary decision: a piece of music is a **`score`**, a **`notation`** is the score file, and
  "chart" is not used.

---

## Self-Review

**Spec coverage.** §7 `client/` list → Tasks 1-5 (playback scrubber, tempo control, Loop/Metronome/Count-In toggles, soundfont progress bar, `Slider`). §7 `web/` "transport row layout" → Task 6. §7 tempo-in-the-header rule → Task 7. §7 "12.5–200 % slider lives in the Settings popover" → explicitly deferred to Plan C in Global Constraints. §7 "Deferred: A/B loop markers" → stated in Global Constraints and in `Scrubber`'s own comment. §4 soundfont progress, both numeric edge cases → Tasks 2 and 8. §8 criteria 3, 5, 6 → Tasks 6, 7. **One Spec Delta**, recorded in Task 5 and in the registry step: the tempo control's percentage rule and step size supersede §7's "only while adjusting, ±5". **Deliberately not covered here:** `Accordion`, the settings and tracks rows, the two popovers and settings persistence (Plan C); the engine, file opening and the test lane (Plan A).

**Base UI first.** Every new control sits on a Base UI primitive rather than a hand-rolled equivalent — `Slider` on `Slider`, `Progress` on `Progress`, `TransportToggle` on `Toggle`, `TempoControl` on `NumberField`. Each choice deletes hand-written ARIA, clamping or interaction code the primitive already owns. `Scrubber` is the one composition (it wraps `Slider`), and `Tooltip` already existed.

**Placeholder scan.** Several Step 5 blocks describe a stories file by its shape rather than transcribing it — each names the exact template file to copy (`RangeSlider.stories.tsx`), the exact story ids, and the exact helper config values, so nothing is left to invent. The metronome glyph is a named, shipped default (`avg_pace`) with a flagged design question, not a TODO. Three conditional fallbacks are named explicitly rather than left open: if Base UI rejects `max === min`, fix `Scrubber` not the test; if `NumberField.Input` reports `spinbutton` rather than `textbox`, adjust the queries; if the doubled `group-data-[…]` variant does not compose under Tailwind 4, hoist the gate to a single computed attribute.

**Verified against the installed packages, not assumed.** Every AlphaTab member in Global Constraints resolves in `@coderline/alphatab` 1.8.4's `dist/alphaTab.d.ts`, and the four behaviours marked **observed** were confirmed by running the real synth headless: `score.tempo` reporting the opening tempo for a whole 90→120→60 score, `originalTempo` tracking automations at sub-bar granularity, the `fireOnRegister` 120/120 stub replaying on subscribe, and the post-seek stale-event burst carrying `isSeek: false`. Every `runVrStories` / `runA11yStories` option this plan passes exists in `client/src/vr-helpers.ts` and `a11y-helpers.ts`, and `animate-skeleton-pulse` plus `bg-skeleton` exist in `styles.css` / `Skeleton.tsx`.

**Type consistency.** `Slider`'s `onChange: (next: number) => void` is the same signature `Scrubber` calls. `Scrubber`'s `onSeek` reports **milliseconds** everywhere — the unit `api.timePosition` takes — while its internal bar works in seconds; that conversion lives in one place. `TempoControl` owns `speed` (a multiplier), never BPM, in both the component and `PlayerShell`, and converts BPM↔speed only at its own boundary — which is what keeps it in sync with Plan C's Player settings group. `Progress`'s `value` is a **fraction 0–1 or null** in the component, its test, and the `soundFontLoad` handler; the `undefined` that means "not downloading" lives only in `PlayerShell`, because `onSoundFontProgress` cannot carry it. `TransportToggle`'s `pressed` / `onPressedChange` pair is spelled identically in the component, its test, and all three call sites.

**Four steps a machine cannot do.** Task 6 Step 7, Task 7 Step 7, Task 8 Step 6 and Task 9 Step 3 need human ears or a human browser console. Each is marked `🧑 HUMAN GATE`; an agentic worker stops and hands back rather than self-certifying, and the PR-body box each one backs is ticked only after a person confirms.
