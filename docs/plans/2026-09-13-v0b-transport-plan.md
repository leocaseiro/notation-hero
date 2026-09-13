# v0 Plan B — Transport — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player its transport — a seek bar that scrubs, a tempo control in the header, Loop / Metronome / Count-In toggles that audibly change playback, and a determinate progress bar for the soundfont download.

**Architecture:** Five new presentation-only components in `client/` (`Slider`, `Progress`, `Scrubber`, `TransportToggle`, `TempoControl`), each with a Storybook story plus the VR and axe baselines that block merge. `web/` composes them into the transport row and the header pill and wires each to an `AlphaTabApi` accessor. Nothing in `client/` imports `@coderline/alphatab` — that is what keeps the gate real, because a `client/` story has no engine instance to provide.

**Tech Stack:** `@base-ui/react` 1.6 (Slider primitive), Tailwind 4 tokens, Storybook 10, Playwright 1.61.1 + axe.

**Spec:** [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) — §7 is the component split; §4 is the soundfont progress behaviour.

**Depends on:** [Plan A](2026-09-13-v0a-engine-and-first-sound-plan.md) — the engine context, the `/play` screen, the `AlphaTabApi` handle and the `web` Playwright lane must all exist first.

**Jira:** epic [NH-291](https://leocaseiro.atlassian.net/browse/NH-291).

**Closes success criteria:** 3 (tempo half), 5 (Loop, Metronome, Count-In each audibly change playback), 6 (the scrubber seeks and the cursor follows).

---

## Global Constraints

Every task's requirements implicitly include this section, plus **all of Plan A's Global Constraints**, which still bind.

- **Every `client/` component here is presentation-only**: `value` in, `onChange` out, option lists as plain arrays, and **no import from `@coderline/alphatab`**. `client/` has no AlphaTab dependency and a Storybook story has no engine instance, so a control that read its options off the library would be gated while rendering fabricated options.
- **Each new `client/` component needs all six files, co-located in its own folder**: `X.tsx`, `X.stories.tsx`, `X.story-ids.ts`, `X.test.tsx`, `X.a11y.ts`, `X.vr.ts`. Never a `__tests__/` or `stories/` directory — `tooling/check-layout.sh` fails the build on them.
- **VR baselines are Linux-only.** Generate them with `pnpm test:vr:docker:update` (Docker Desktop running — `open -a Docker`), never natively on macOS. Kill any Storybook already on `:6006` first, or Playwright's `reuseExistingServer` serves desynced stories and the baselines come out wrong.
- **Every control's hit area is at least 44 px**, with the glyph left at its drawn size. The mockup's transport is `w-10 h-10` (40 px) and its header `±` buttons carry no size class at all — both are too small and v0 must not copy them.
- **Tempo lives in the header, not the transport row.** Both design sources put it there, so the player has exactly one tempo control and the transport row has none.
- **The 12.5–200 % speed slider is Plan C's** — it belongs to the Settings popover's Player group, not the header pill. Plan B builds the `± 5` stepper and the `%` readout only.
- **A–B loop markers are out of scope.** v0 ships a plain seek bar; looping uses AlphaTab's native bar-range selection plus the Loop toggle. Do not build marker UI.
- `@coderline/alphatab` 1.8.4 facts this plan relies on: `api.isLooping: boolean`, `api.metronomeVolume: number`, `api.countInVolume: number`, `api.playbackSpeed: number`, `api.timePosition: number` (settable — this is the seek), `api.endTime: number`, `api.playerPositionChanged` emitting `{ currentTime, endTime, currentTick, endTick }`, and `api.soundFontLoad` emitting `{ loaded, total }`.

---

## File Structure

**Created — `client/src/components/ui/`, one folder each**

| Folder             | Responsibility                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Slider/`          | Single-value slider primitive. `RangeSlider` is dual-thumb only (`value: [number, number]`), so it cannot serve the scrubber, the tempo slider, per-track volume or the settings rows. |
| `Progress/`        | Determinate progress bar, with an indeterminate fallback. The design system has no `Progress`, `Spinner` or `Loader` at all.                                                           |
| `Scrubber/`        | Current time, seek bar, total time. Composes `Slider`.                                                                                                                                 |
| `TransportToggle/` | Icon toggle with a pressed state — one component used three times (Loop, Metronome, Count-In).                                                                                         |
| `TempoControl/`    | The header pill: `– <BPM> +` stepper, with the `%` shown only while adjusting.                                                                                                         |

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
  expect(thumb).toHaveAttribute('aria-valuemin', '0');
  expect(thumb).toHaveAttribute('aria-valuemax', '60');
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
          'relative flex h-5 w-full touch-none items-center select-none',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <SliderPrimitive.Control className="flex w-full items-center">
          <SliderPrimitive.Track className="relative h-1 grow rounded-full bg-muted">
            <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
            {/* Thumb: grab cursor + teal fill while dragging (:active); disabled keys off Base
                UI's data-disabled (a <span> can't match :disabled), which also suppresses the
                hover ring. Base UI's thumb is a styled div wrapping a real (visually-hidden)
                native <input type="range"> — the INPUT receives focus, not this div, so a plain
                focus-visible: utility would never match; has-focus-visible: reads the nested
                input's focus state instead. */}
            <SliderPrimitive.Thumb
              index={0}
              aria-label={label}
              className={cn(
                'block size-4 cursor-grab rounded-full border-2 border-primary bg-background transition-[box-shadow,background-color]',
                'hover:ring-4 hover:ring-ring/30',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-focus-visible:outline-none',
                'active:cursor-grabbing active:bg-primary',
                'data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed',
              )}
            />
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
git status --short client/src/components/ui/Slider
```

Expected: only new `slider-*-linux.png` files. **Never generate these on macOS** — darwin rasterises fonts differently and those snapshots are git-ignored.

- [ ] **Step 9: Verify nothing else moved**

Run: `pnpm test:vr:docker`
Expected: PASS, no diffs outside the new `Slider` snapshots.

- [ ] **Step 10: Commit**

```bash
git add client/src/components/ui/Slider
git commit -m "feat(client): add a single-value Slider primitive (NH-291)"
```

---

### Task 2: `Progress` — the determinate bar

**Files:**

- Create: `client/src/components/ui/Progress/Progress.tsx`
- Create: `client/src/components/ui/Progress/Progress.stories.tsx`
- Create: `client/src/components/ui/Progress/Progress.story-ids.ts`
- Create: `client/src/components/ui/Progress/Progress.test.tsx`
- Create: `client/src/components/ui/Progress/Progress.a11y.ts`
- Create: `client/src/components/ui/Progress/Progress.vr.ts`

**Interfaces:**

- Consumes: `cn` from `@/lib/utils`.
- Produces: `<Progress value={number | null} label={string} className? />`, `data-slot="progress"`. `value` is a **fraction 0–1**, or `null` for the indeterminate style. Task 8 consumes it.

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
// no Content-Length. The caller maps that to null, and this renders the indeterminate style —
// which, per ARIA, means NO aria-valuenow at all.
test('renders indeterminate with no aria-valuenow when value is null', () => {
  render(<Progress value={null} label="Loading sounds" />);
  const bar = screen.getByRole('progressbar', { name: 'Loading sounds' });
  expect(bar).not.toHaveAttribute('aria-valuenow');
});

// `total` is the ENCODED length while `loaded` counts decoded bytes when the CDN compresses, so
// the fraction can exceed 1. Clamping is the component's job as well as the caller's.
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
import { cn } from '@/lib/utils';

interface ProgressProps {
  /**
   * Completion as a fraction from 0 to 1, or null for the indeterminate style.
   *
   * Null is a real case, not a guard: AlphaTab forwards the raw XMLHttpRequest ProgressEvent, and
   * `total` is 0 whenever the response carries no Content-Length — so there is genuinely no
   * fraction to show. Values above 1 are real too (a compressed response reports the ENCODED
   * total against DECODED loaded bytes), hence the clamp.
   */
  value: number | null;
  /** Accessible name — required; a bare progressbar tells a screen-reader user nothing. */
  label: string;
  className?: string;
}

const clampPercent = (value: number): number => Math.round(Math.min(1, Math.max(0, value)) * 100);

// Determinate progress bar with an indeterminate fallback. The design system has no Progress,
// Spinner or Loader at all, so this is the first of its kind — keep it presentation-only.
//
// The indeterminate branch omits aria-valuenow entirely, which is what ARIA defines as "the value
// is unknown"; rendering 0 instead would announce "0 percent" forever.
const Progress = ({ value, label, className }: Readonly<ProgressProps>) => {
  const percent = value === null ? null : clampPercent(value);

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      {...(percent === null ? {} : { 'aria-valuenow': percent })}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      {percent === null ? (
        <div className="animate-skeleton-pulse absolute inset-0 bg-primary/40" />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
      )}
    </div>
  );
};

export { Progress };
```

> `animate-skeleton-pulse` is the repo's existing keyframe (see `Skeleton.tsx` and `styles.css`). Confirm the class name still exists before relying on it; if it has been renamed, use whatever `Skeleton.tsx` uses today rather than inventing a new animation.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/Progress`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`Progress.story-ids.ts`:

```ts
// Shared list of Progress story IDs (kebab) so VR and a11y stay in lockstep with the stories file.
export const PROGRESS_STORY_IDS = ['default', 'complete', 'indeterminate'] as const;
```

Stories: `title: 'UI/Progress'`, four exports matching those ids (`Default` at 0.42, `Complete` at 1, `Indeterminate` at null). Model the file on `RangeSlider.stories.tsx`.

`Progress.a11y.ts` and `Progress.vr.ts` follow the Task 1 shape with `storyPrefix: 'ui-progress'`, `snapshotSlug: 'progress'`, `slotSelector: '[data-slot="progress"]'`. A progress bar has no focus or hover state, so use `states: ['resting']` in VR and set `hoverStory: () => false` in a11y.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "Progress"
open -a Docker
pnpm test:vr:docker:update
pnpm test:vr:docker
```

Expected: a11y PASS; only new `progress-*-linux.png` files; the second VR run clean.

> The indeterminate story animates. If VR flakes on it, `runVrStories` already freezes transitions and animations before snapshotting — check `vr-helpers.ts` rather than adding a bespoke freeze.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/Progress
git commit -m "feat(client): add a determinate Progress bar (NH-291)"
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
  expect(bar).toHaveAttribute('aria-valuemin', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '260');
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

// A chart that has not loaded yet has no length; the bar must not render NaN or a 1-second song.
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
// field — no practice chart runs that long, and a third field would jitter the row's width.
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
// misleading aria-valuemax of 260000.
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
pnpm test:vr:docker
```

Expected: a11y PASS; only new `scrubber-*-linux.png`; the second VR run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/Scrubber
git commit -m "feat(client): add the playback Scrubber (NH-291)"
```

---

### Task 4: `TransportToggle` — one component, three uses

**Files:**

- Create: `client/src/components/ui/TransportToggle/` (six files)

**Interfaces:**

- Consumes: `Button`, `cn`.
- Produces: `<TransportToggle pressed={boolean} onPressedChange={(next: boolean) => void} label={string} icon={ReactNode} disabled? />`, `data-slot="transport-toggle"`. Task 6 renders it three times.

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

import type { ReactNode } from 'react';

import { Button } from '../Button/Button';

import { cn } from '@/lib/utils';

interface TransportToggleProps {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  /** Accessible name — the control is icon-only, so this is the only label a reader gets. */
  label: string;
  /** The glyph. Pass it aria-hidden; `label` carries the name. */
  icon: ReactNode;
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
  disabled = false,
  className,
}: Readonly<TransportToggleProps>) => (
  <Button
    data-slot="transport-toggle"
    type="button"
    variant="ghost"
    size="icon"
    aria-pressed={pressed}
    aria-label={label}
    disabled={disabled}
    onClick={() => onPressedChange(!pressed)}
    className={cn('size-11 rounded-lg', pressed && 'bg-secondary text-primary', className)}
  >
    {icon}
  </Button>
);

export { TransportToggle };
```

> Pressed uses the solid-teal-on-secondary pairing the design system already uses for selected state (`bg-secondary` + `text-primary`), not a faint tint. If `Button`'s `ghost` variant already sets a conflicting background, override it here rather than changing `Button`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TransportToggle`
Expected: PASS — 3 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`TransportToggle.story-ids.ts`: `['default', 'pressed', 'disabled']`. Stories under `title: 'UI/TransportToggle'`, each passing a Material Symbols glyph as `icon`. In `TransportToggle.a11y.ts` set `iconFontStory: () => true` — every story renders a glyph, and that flag makes the helper assert the icon font actually loaded, so a failed load cannot pass silently as ligature fallback text. VR: `states: ['resting', 'focus', 'hover']`, `statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover'])`.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "TransportToggle"
open -a Docker
pnpm test:vr:docker:update
pnpm test:vr:docker
```

Expected: a11y PASS; only new `transporttoggle-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/TransportToggle
git commit -m "feat(client): add the TransportToggle used by Loop, Metronome and Count-In (NH-291)"
```

---

### Task 5: `TempoControl` — the header pill

`Bpm` is display-only, so the tempo control is new. The displayed number is the **chart's tempo multiplied by the playback speed**, the `±` buttons move it by 5 BPM, and the percentage shows **only while adjusting** — the shape both design sources describe.

**Files:**

- Create: `client/src/components/ui/TempoControl/` (six files)

**Interfaces:**

- Consumes: `Button`, `cn`.
- Produces: `<TempoControl chartTempo={number} speed={number} onSpeedChange={(next: number) => void} minSpeed? maxSpeed? disabled? />`, `data-slot="tempo-control"`. Task 7 consumes it. Plan C's Player settings group edits the same `speed` value, which is why it is the single source of truth rather than a BPM number.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ui/TempoControl/TempoControl.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TempoControl } from './TempoControl';

const Harness = ({ chartTempo = 120, initial = 1 }) => {
  const [speed, setSpeed] = useState(initial);
  return <TempoControl chartTempo={chartTempo} speed={speed} onSpeedChange={setSpeed} />;
};

test('shows the chart tempo scaled by the speed', () => {
  render(<TempoControl chartTempo={120} speed={1} onSpeedChange={() => {}} />);
  expect(screen.getByTestId('tempo-value')).toHaveTextContent('120');

  render(<TempoControl chartTempo={120} speed={0.5} onSpeedChange={() => {}} />);
  expect(screen.getAllByTestId('tempo-value')[1]).toHaveTextContent('60');
});

test('the plus button raises the tempo by 5 BPM and reports a SPEED back', async () => {
  const user = userEvent.setup();
  render(<Harness chartTempo={120} />);

  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  // 125 / 120 = 1.041666…, and the display rounds to 125.
  expect(screen.getByTestId('tempo-value')).toHaveTextContent('125');
});

test('the minus button lowers the tempo by 5 BPM', async () => {
  const user = userEvent.setup();
  render(<Harness chartTempo={120} />);

  await user.click(screen.getByRole('button', { name: 'Decrease tempo' }));
  expect(screen.getByTestId('tempo-value')).toHaveTextContent('115');
});

// 12.5% is AlphaTab's documented playbackSpeed floor; 200% is the ceiling the settings slider uses.
test('clamps to the 12.5 percent floor', async () => {
  const user = userEvent.setup();
  render(<Harness chartTempo={100} initial={0.13} />);

  await user.click(screen.getByRole('button', { name: 'Decrease tempo' }));
  expect(screen.getByTestId('tempo-value')).toHaveTextContent('13');
});

test('clamps to the 200 percent ceiling', async () => {
  const user = userEvent.setup();
  render(<Harness chartTempo={100} initial={1.99} />);

  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  expect(screen.getByTestId('tempo-value')).toHaveTextContent('200');
});

// "% shown only while adjusting" — the percentage is not part of the resting pill.
test('shows the percentage only after an adjustment', async () => {
  const user = userEvent.setup();
  render(<Harness chartTempo={120} />);
  expect(screen.queryByTestId('tempo-percent')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  expect(screen.getByTestId('tempo-percent')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TempoControl`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/TempoControl/TempoControl.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '../Button/Button';

import { cn } from '@/lib/utils';

interface TempoControlProps {
  /** The chart's own initial tempo in BPM. The displayed number is this times `speed`. */
  chartTempo: number;
  /** Playback speed multiplier; 1 is the chart's own tempo. */
  speed: number;
  onSpeedChange: (next: number) => void;
  /** AlphaTab's documented playbackSpeed floor. */
  minSpeed?: number;
  maxSpeed?: number;
  disabled?: boolean;
  className?: string;
}

/** One press of the stepper, in BPM. */
const STEP_BPM = 5;
/** How long the percentage stays visible after the last adjustment. */
const PERCENT_LINGER_MS = 2000;

// The header's tempo control. SPEED is the value it owns, not BPM: AlphaTab's playbackSpeed is
// what actually changes playback, and the Player settings group (Plan C) edits the same number —
// so keeping speed as the single source of truth is what stops the two controls drifting apart.
// BPM is the presentation.
//
// The percentage appears only while adjusting, per both design sources: at rest the pill is just
// `– 120 +`, and the `%` would be noise.
const TempoControl = ({
  chartTempo,
  speed,
  onSpeedChange,
  minSpeed = 0.125,
  maxSpeed = 2,
  disabled = false,
  className,
}: Readonly<TempoControlProps>) => {
  const [adjusting, setAdjusting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const displayedBpm = Math.round(chartTempo * speed);
  const percent = Math.round(speed * 1000) / 10;

  const step = (direction: 1 | -1) => {
    // The stepper moves BPM, so convert back to a speed. A chart with no tempo would divide by
    // zero, so fall back to a bare speed step.
    const nextBpm = displayedBpm + direction * STEP_BPM;
    const nextSpeed = chartTempo > 0 ? nextBpm / chartTempo : speed + direction * 0.05;
    onSpeedChange(Math.min(maxSpeed, Math.max(minSpeed, nextSpeed)));

    setAdjusting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdjusting(false), PERCENT_LINGER_MS);
  };

  return (
    <div
      data-slot="tempo-control"
      className={cn(
        'flex items-center gap-1 rounded-full border border-border bg-secondary p-1',
        className,
      )}
    >
      {/* size-11 = the 44px minimum hit area. The mockup's ± buttons carry NO size class at all,
          so their hit area is just the glyph — v0 must not copy that. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Decrease tempo"
        disabled={disabled}
        onClick={() => step(-1)}
        className="size-11 rounded-full"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          remove
        </span>
      </Button>

      <div className="flex min-w-16 flex-col items-center px-2">
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          BPM
        </span>
        <span data-testid="tempo-value" className="text-sm leading-none font-bold tabular-nums">
          {displayedBpm}
        </span>
        {adjusting ? (
          <span
            data-testid="tempo-percent"
            className="text-[10px] text-muted-foreground tabular-nums"
          >
            {percent}%
          </span>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Increase tempo"
        disabled={disabled}
        onClick={() => step(1)}
        className="size-11 rounded-full"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          add
        </span>
      </Button>
    </div>
  );
};

export { TempoControl };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TempoControl`
Expected: PASS — 6 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`TempoControl.story-ids.ts`: `['default', 'slowed', 'adjusting', 'disabled']`. The `adjusting` story must render with the percentage visible so VR and axe can see it — give the component a `defaultAdjusting` prop **only if** the story cannot reach that state otherwise; prefer driving it from the story with a click in `play()`. `storyPrefix: 'ui-tempocontrol'`, `snapshotSlug: 'tempocontrol'`, `slotSelector: '[data-slot="tempo-control"]'`, `iconFontStory: () => true`.

- [ ] **Step 6: Run the gates and generate baselines**

```bash
pkill -f "storybook.*6006" || true
pnpm --filter @notation-hero/client run test:a11y -g "TempoControl"
open -a Docker
pnpm test:vr:docker:update
pnpm test:vr:docker
```

Expected: a11y PASS; only new `tempocontrol-*-linux.png`; the second run clean.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/TempoControl
git commit -m "feat(client): add the header TempoControl stepper (NH-291)"
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
```

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
      <TransportToggle
        data-testid="toggle-loop"
        pressed={looping}
        onPressedChange={onLoopingChange}
        label="Loop"
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
          the stock glyph so nothing unlicensed ships, and raise the icon choice with leocaseiro —
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

> `TransportToggle` must forward `data-testid` to its `Button`. If it does not, add a `...rest` spread to its props in Task 4's component and re-run that task's gates — do not reach around it with a wrapper div, which would break the axe name/role checks.

- [ ] **Step 5: Wire the shell to the api**

In `web/app/play/PlayerShell.tsx`'s `Player`, add state and accessors:

```tsx
const [durationMs, setDurationMs] = useState(0);
const [looping, setLooping] = useState(false);
const [metronome, setMetronome] = useState(false);
const [countIn, setCountIn] = useState(false);
```

Extend the `playerPositionChanged` subscription from Plan A to record the length too:

```tsx
api.playerPositionChanged.on((args) => {
  setPositionMs(args.currentTime);
  setDurationMs(args.endTime);
});
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
  setPositionMs(ms);
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

- [ ] **Step 7: Verify by ear — this is what criterion 5 actually asks**

```bash
pnpm --filter @notation-hero/web run dev
```

On `/play` with the sample loaded: turn Metronome on and confirm you **hear a click**; turn Count-In on, press play, and confirm you hear a count before the music; select a bar range in the notation with the mouse, turn Loop on, and confirm the range repeats. Headless Chromium is silent, so the CI lane can only prove the state flipped — the sound is yours to confirm.

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
- Produces: `onScoreLoaded: (score: { tempo: number; title: string }) => void` on `NotationSurface`; `data-speed` on `player-status`.

- [ ] **Step 1: Write the failing test**

Add to `web/e2e/player.e2e.ts`:

```ts
test('the header tempo stepper changes playback speed', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const value = page.getByTestId('tempo-value');
  const shown = Number(await value.textContent());
  expect(shown).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Increase tempo' }).click();
  await expect(value).toHaveText(String(shown + 5));
  // The percentage appears only while adjusting.
  await expect(page.getByTestId('tempo-percent')).toBeVisible();

  // And the engine actually took it.
  await expect
    .poll(async () => Number(await page.getByTestId('player-status').getAttribute('data-speed')))
    .toBeGreaterThan(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "tempo stepper"`
Expected: FAIL — no `tempo-value`.

- [ ] **Step 3: Report the score's tempo upward**

In `NotationSurface.tsx`, add an `onScoreLoaded` prop and call it from the chart effect right after a successful parse, before `renderScore`:

```tsx
onScoreLoaded({ tempo: score.tempo, title: score.title });
```

- [ ] **Step 4: Write the header**

Create `web/app/play/PlayerHeader.tsx`:

```tsx
'use client';

import { TempoControl } from '@notation-hero/client';

interface PlayerHeaderProps {
  chartTitle: string;
  chartTempo: number;
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
  chartTitle,
  chartTempo,
  speed,
  onSpeedChange,
  disabled,
}: Readonly<PlayerHeaderProps>) {
  return (
    <header className="flex h-16 items-center gap-8 border-b border-border px-6">
      <span className="font-bold text-primary">Notation Hero</span>
      <span className="flex-1 truncate text-muted-foreground">{chartTitle}</span>
      <TempoControl
        chartTempo={chartTempo}
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
const [chartTempo, setChartTempo] = useState(120);
const [chartTitle, setChartTitle] = useState('');

const applySpeed = useCallback((next: number) => {
  setSpeed(next);
  const api = apiRef.current;
  if (api) api.playbackSpeed = next;
}, []);

const handleScoreLoaded = useCallback(({ tempo, title }: { tempo: number; title: string }) => {
  setChartTempo(tempo);
  setChartTitle(title);
  // A new chart keeps the speed the drummer chose — the BPM readout moves because the chart's
  // own tempo changed, not because the multiplier was reset.
}, []);
```

Render `<PlayerHeader … />` above the notation surface, pass `onScoreLoaded={handleScoreLoaded}` to `NotationSurface`, and add `data-speed={speed}` to the status element.

- [ ] **Step 6: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 7: Verify by ear**

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

- [ ] **Step 3: Subscribe to `soundFontLoad`**

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

- [ ] **Step 4: Render the bar**

In `PlayerShell.tsx`, hold `soundFontProgress: number | null | undefined` (`undefined` meaning "not downloading"), set it from the callback, clear it to `undefined` when `soundFontLoaded` fires, and render beneath the notation surface:

```tsx
{
  soundFontProgress !== undefined ? (
    <Progress value={soundFontProgress} label="Loading sounds" className="w-full" />
  ) : null;
}
```

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 6: Exercise the indeterminate branch by hand**

The `total === 0` branch only fires when the response carries no `Content-Length`. Force it locally to prove the code path renders rather than throwing:

```bash
pnpm --filter @notation-hero/web run dev
```

In the browser console before loading a chart:

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

- [ ] **Step 3: Measure every new control's hit area**

```bash
pnpm --filter @notation-hero/web run dev
```

In the browser console on a loaded `/play`:

```js
[...document.querySelectorAll('button, a[href], label[for], [role="button"], input[type="range"]')]
  .map((el) => ({
    label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20),
    ...el.getBoundingClientRect().toJSON(),
  }))
  .filter((r) => r.width < 44 || r.height < 44);
```

Expected: an **empty array**. The scrubber's own thumb is exempt only if its parent rail gives it a 44 px tall pointer target — check the rail, not the thumb.

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

`Slider` (single-value), `Progress` (determinate), `Scrubber`, `TransportToggle`, `TempoControl` — each with a Storybook story plus VR and axe baselines that block merge.

## Success criteria covered

- [x] 3 (tempo half) — the header stepper changes playback speed; per-track mute/solo is Plan C
- [x] 5 — Loop, Metronome and Count-In each audibly change playback (verified by ear; CI verifies the state)
- [x] 6 — the scrubber seeks and the cursor follows

## Notes

- A–B loop markers are deliberately absent: v0 uses AlphaTab's native bar-range selection plus the Loop toggle. Range selection is mouse-only — AlphaTab registers no touch or pointer handlers — which is why A–B is not in the acceptance set.
- The metronome glyph is the stock Material Symbols `avg_pace`; Material Symbols ships no metronome icon and the mockup's inline SVG has unestablished provenance. Icon choice is open for review.

## Pulumi preview

safe — no `infra/` changes in this PR.
EOF
)"
gh run watch
```

- [ ] **Step 6: Update the decision registry**

Add a Change-log entry recording that the design system gained `Slider`, `Progress`, `Scrubber`, `TransportToggle` and `TempoControl`, all gated by VR + axe, and commit it in this PR so it lands atomically on merge.

---

## Self-Review

**Spec coverage.** §7 `client/` list → Tasks 1-5 (playback scrubber, tempo control, Loop/Metronome/Count-In toggles, soundfont progress bar, `Slider`). §7 `web/` "transport row layout" → Task 6. §7 tempo-in-the-header rule → Task 7. §7 "12.5–200 % slider lives in the Settings popover" → explicitly deferred to Plan C in Global Constraints. §7 "Deferred: A/B loop markers" → stated in Global Constraints and in `Scrubber`'s own comment. §4 soundfont progress, both numeric edge cases → Tasks 2 and 8. §8 criteria 3, 5, 6 → Tasks 6, 7. **Deliberately not covered here:** `Accordion`, the settings and tracks rows, the two popovers and settings persistence (Plan C); the engine, file opening and the test lane (Plan A).

**Placeholder scan.** Three steps describe a stories file by its shape rather than transcribing it (Tasks 1, 2, 3, 5, Step 5) — each names the exact template file to copy (`RangeSlider.stories.tsx`), the exact story ids, and the exact helper config values, so nothing is left to invent. The metronome glyph is a named, shipped default (`avg_pace`) with a flagged design question, not a TODO. One conditional fallback is named explicitly: if Base UI rejects `max === min`, fix `Scrubber`, not the test.

**Type consistency.** `Slider`'s `onChange: (next: number) => void` is the same signature `Scrubber` calls. `Scrubber`'s `onSeek` reports **milliseconds** everywhere — the unit `api.timePosition` takes — while its internal bar works in seconds; that conversion lives in one place. `TempoControl` owns `speed` (a multiplier), never BPM, in both the component and `PlayerShell`, which is what keeps it in sync with Plan C's Player settings group. `Progress`'s `value` is a **fraction 0–1 or null** in the component, its test, and the `soundFontLoad` handler. `TransportToggle`'s `pressed` / `onPressedChange` pair is spelled identically in the component, its test, and all three call sites.
