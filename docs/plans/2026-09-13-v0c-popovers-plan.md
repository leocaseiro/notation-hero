# v0 Plan C — Settings and Tracks Popovers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player its two popovers — Settings (the header gear: eight accordion sections of rows that change the rendered score, and that survive a reload) and Tracks (the transport's mixer: one row per track in the score, with solo, mute, volume, render-select, the per-staff display toggles and both transposition sliders).

**Architecture:** Two new presentation-only components in `client/` (`Accordion` and `SettingRow`) plus a `TrackRow`, each gated by a Storybook story with VR and axe baselines. `web/` owns the schema of groups with an accessor per row, the React context that feeds it the loaded AlphaTab namespace, and both popover compositions. Neither popover blocks the player: a drummer can change a setting while the score plays.

**Tech Stack:** `@base-ui/react` 1.6 (`accordion`, `popover`, `slider`), Tailwind 4 tokens, Storybook 10, Playwright 1.61.1 + axe.

**Spec:** [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) — §7 from "Two popovers, not modals" to the end is this plan's brief.

**Reference (read-only):** the `rhythm-game` fork at `/Users/leocaseiro/Sites/alphaTabWebsite`, branch `rhythm-game` — `src/components/AlphaTabRhythmGame/playground-settings.tsx` (1,279 lines) is the settings panel this ports. **Clean-room: read it, copy nothing.** No files, no code blocks, no label strings. Write original code and original label copy. That is decision D4 and the [2026-06-18 licensing spike](../spikes/2026-06-18-file-formats-and-licensing.md); the fork is MPL-2.0 and stays open for reference only.

**Depends on:** [Plan A](2026-09-13-v0a-engine-and-first-sound-plan.md) (engine context, `/play`, the `AlphaTabApi` handle, the Playwright lane) and [Plan B](2026-09-13-v0b-transport-plan.md) (`Slider`, and the transport row this hangs the Tracks button on).

**Jira:** epic [NH-291](https://leocaseiro.atlassian.net/browse/NH-291).

**Closes success criteria:** 3 (per-track mute/solo half) and 7 (the Settings rows change the rendered score; the Tracks popover lists every track and its rows work in both directions).

---

## Global Constraints

Every task's requirements implicitly include this section, plus **all of Plan A's Global Constraints**, which still bind.

- **Clean-room port.** Read the fork to learn the group list, the row set and the accessor pattern; write everything yourself. No copied code, no copied label strings. If you cannot restate a row's purpose in your own words, you do not understand it well enough to port it.
- **Both popovers, never modals.** Neither blocks the player — that is the single reason v0 chose a popover, and v0.1 keeps it. `Dialog` is not built and is not needed.
- **Every `client/` component here is presentation-only**: `value` in, `onChange` out, option lists as plain arrays, and **no import from `@coderline/alphatab`**. A `client/` Storybook story has no engine instance, so a row that read its options off the library would be gated while rendering fabricated options. The schema of accessors and the context carrying the namespace live in `web/`.
- **Each new `client/` component needs all six co-located files** (`X.tsx`, `X.stories.tsx`, `X.story-ids.ts`, `X.test.tsx`, `X.a11y.ts`, `X.vr.ts`) in its own folder. Never `__tests__/` or `stories/`.
- **VR baselines are Linux-only** — `pnpm test:vr:docker:update` with Docker Desktop running (`open -a Docker`), never natively on macOS. Kill any `:6006` Storybook first.
- **Every control's hit area is at least 44 px.**
- **Solo is not exclusive**, as in AlphaTab and the fork. Soloing a second track does not un-solo the first.
- **Volume is applied as a RATIO, not an absolute**: `api.changeTrackVolume([track], next / track.playbackInfo.volume)`, and the ratio must guard a zero denominator. `next` uses `playbackInfo.volume`'s own **0–16** scale.
- **Accepted coupling:** `changeTrackVolume` sets the volume on the track's primary **and secondary** MIDI channels, so tracks sharing a channel move together. `Punk.gp`'s two drum tracks are both on channel 9, so its Drumkit and Drumkit Left sliders are **not** independent. That is expected v0 behaviour — do not "fix" it, and do not write a test that asserts independence.
- **The tablature toggle appears only for a stringed staff that has a tuning.** The pinned 1.8.4 cannot render percussion tablature at all: `Staff.finish()` forces `showTablature = false` on any percussion staff, and `TabBarRendererFactory` sets `hideOnPercussionTrack = true` and requires `staff.tuning.length > 0`. `Punk.gp` confirms it — its two drum staves report `showTablature=false, tuningLen=0` while its guitar staff reports `true, 6`. Piano and vocal staves carry no tuning either, so they are ruled out too.
- **Transpose Audio and Transpose Full are two separate controls and must stay separate.** Fusing them drops the notation-transposing path entirely.
- **`Settings` has `fillFromJson` but no `toJson`.** There is no way to ask AlphaTab for its current settings as JSON, so the app holds its own `SettingsJson`-shaped object as the edit state and pushes it into the live settings. That object is both the UI state and the persisted value.
- **Restore through `Settings.fillFromJson(parsed)`, never by assignment.** `JSON.parse` returns plain objects, but `RenderingResources` holds real `model.Color` and `model.Font` instances — a plain object assigned into the settings tree breaks rendering **without throwing**, so a `try`/`catch` would never fire and the Colors and Fonts groups would silently stop working. `fillFromJson` is public and `@target web` in 1.8.4 and rebuilds both through their `fromJson` helpers.
- `@coderline/alphatab` 1.8.4 facts this plan relies on: `api.settings: Settings`, `api.updateSettings()`, `api.render()`, `api.renderTracks(tracks: Track[])`, `api.changeTrackMute(tracks, mute)`, `api.changeTrackSolo(tracks, solo)`, `api.changeTrackVolume(tracks, ratio)`, `api.changeTrackTranspositionPitch(tracks, semitones)`, `settings.notation.transpositionPitches: number[]` (indexed by track), `track.playbackInfo.volume` (0–16), `staff.showStandardNotation | showSlash | showNumbered | showTablature`, `staff.tuning: number[]`.

---

## File Structure

**Created — `client/src/components/ui/`**

| Folder        | Responsibility                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accordion/`  | Collapsible sections. The third and last of the spec's three new design-system components, and the one v0.1's settings search builds on.                 |
| `SettingRow/` | One settings row: label left, control right. Renders a toggle, a number input, a number-with-slider, a text input or a dropdown from a plain descriptor. |
| `TrackRow/`   | One mixer row: an always-visible primary cluster plus a disclosure holding the display toggles and both transposition sliders.                           |

**Created — `web/`**

| File                                   | Responsibility                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `web/lib/alphatab/settings-schema.ts`  | The eight groups and their rows, each with a `get`/`set` accessor over the settings object. No JSX. |
| `web/lib/alphatab/settings-storage.ts` | Read, merge, validate and write the persisted settings JSON.                                        |
| `web/app/play/SettingsPopover.tsx`     | The gear popover: accordion sections of `SettingRow`s, driven by the schema.                        |
| `web/app/play/TracksPopover.tsx`       | The mixer popover: one `TrackRow` per track in the score.                                           |

**Modified**

| File                                                                                              | Change                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/index.ts`                                                                             | Export `Accordion`, `SettingRow`, `TrackRow`, `Popover*`, `Field*`, `Checkbox`, `NativeSelect`, `Input`, `ScrollArea`, `Separator`. |
| `client/src/components/ui/{Popover,Field,Checkbox,NativeSelect,Input,ScrollArea,Separator}/*.tsx` | Add `'use client'` where absent.                                                                                                    |
| `web/app/play/PlayerHeader.tsx`                                                                   | Add the Settings gear.                                                                                                              |
| `web/app/play/TransportRow.tsx`                                                                   | Add the Tracks / mixer button.                                                                                                      |
| `web/app/play/PlayerShell.tsx`                                                                    | Hold settings + track state; restore on mount; persist on change.                                                                   |
| `web/app/play/NotationSurface.tsx`                                                                | Report the parsed score's tracks upward.                                                                                            |
| `web/e2e/player.e2e.ts`, `web/e2e/a11y.e2e.ts`                                                    | Cases for criteria 3 and 7, and axe with each popover open.                                                                         |

---

### Task 1: `Accordion`

**Files:**

- Create: `client/src/components/ui/Accordion/` (six files)

**Interfaces:**

- Consumes: `@base-ui/react/accordion`, `cn`.
- Produces: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` — a Radix-shaped composite over Base UI's `Root / Item / Header / Trigger / Panel`. `data-slot="accordion"`. Tasks 5 and 3 consume it.

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
    openMultiple
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

> Two things to check against the installed Base UI 1.6 before moving on. (1) The open-state data attribute on the trigger — the chevron rotation keys off `data-panel-open`; run `pnpm --filter @notation-hero/client run storybook`, open the story and inspect the trigger element to confirm the real attribute name, then fix the selector if it differs. (2) `openMultiple` — if `AccordionRoot` does not accept it, the equivalent is controlling `value` as an array; the fourth test is what tells you.

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

- Consumes: `Field`, `FieldLabel`, `Checkbox`, `Input`, `NativeSelect`, `Slider` (Plan B), `cn`.
- Produces:

```ts
type SettingControl =
  | { kind: 'toggle' }
  | { kind: 'number'; min?: number; max?: number; step?: number }
  | { kind: 'range'; min: number; max: number; step?: number }
  | { kind: 'text' }
  | { kind: 'select'; options: readonly { value: string; label: string }[] };

interface SettingRowProps {
  id: string;
  label: string;
  control: SettingControl;
  value: string | number | boolean;
  onChange: (next: string | number | boolean) => void;
  description?: string;
  disabled?: boolean;
}
```

`data-slot="setting-row"`. Tasks 5 and 7 consume it.

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/SettingRow`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/SettingRow/SettingRow.tsx`. Compose the primitives that already exist — `Field` with `orientation="horizontal"` gives the label-left / control-right layout, and none of `Checkbox`, `Input`, `NativeSelect` or `Slider` is new work:

```tsx
'use client';

import { Checkbox } from '../Checkbox/Checkbox';
import { Field, FieldDescription, FieldLabel } from '../Field/Field';
import { Input } from '../Input/Input';
import { NativeSelect } from '../NativeSelect/NativeSelect';
import { Slider } from '../Slider/Slider';

export type SettingControl =
  | { kind: 'toggle' }
  | { kind: 'number'; min?: number; max?: number; step?: number }
  | { kind: 'range'; min: number; max: number; step?: number }
  | { kind: 'text' }
  | { kind: 'select'; options: readonly { value: string; label: string }[] };

export type SettingValue = string | number | boolean;

interface SettingRowProps {
  /** Unique within the popover; ties the label to its control. */
  id: string;
  label: string;
  control: SettingControl;
  value: SettingValue;
  onChange: (next: SettingValue) => void;
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
  description,
  disabled = false,
}: Readonly<SettingRowProps>) => {
  const labelId = `${id}-label`;

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
      className="py-1.5"
    >
      <FieldLabel htmlFor={id} id={labelId}>
        {label}
      </FieldLabel>

      {control.kind === 'toggle' ? (
        <Checkbox
          id={id}
          aria-labelledby={labelId}
          checked={Boolean(value)}
          onCheckedChange={(next) => onChange(Boolean(next))}
          disabled={disabled}
        />
      ) : null}

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
          className="w-28"
        />
      ) : null}

      {control.kind === 'text' ? (
        <Input
          id={id}
          type="text"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-40"
        />
      ) : null}

      {control.kind === 'select' ? (
        <NativeSelect
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-44"
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
            value={String(value)}
            onChange={(event) => reportNumber(event.target.value)}
            disabled={disabled}
            className="w-28 self-end"
          />
          <Slider
            value={Number(value)}
            onChange={onChange}
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

> Check `Checkbox`'s real prop names before running — it wraps Base UI's `Checkbox.Root`, so the callback may be `onCheckedChange` or `onChange`. Open `client/src/components/ui/Checkbox/Checkbox.tsx` and use what it forwards.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/SettingRow`
Expected: PASS — 6 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`SettingRow.story-ids.ts`: `['toggle', 'number', 'range', 'text', 'select', 'disabled']` — one story per control kind, so every branch carries a VR and axe baseline. `storyPrefix: 'ui-settingrow'`, `snapshotSlug: 'settingrow'`, `slotSelector: '[data-slot="setting-row"]'`, a `w-96` decorator.

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

- Consumes: `Accordion` is _not_ used here — the disclosure is a single collapsible, so use `@base-ui/react/collapsible` directly or a plain conditional; `Checkbox`, `Slider`, `Button`, `Field`.
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
}
```

`data-slot="track-row"`. Task 7 consumes it.

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TrackRow`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `client/src/components/ui/TrackRow/TrackRow.tsx`. Keep it presentation-only: no AlphaTab import, no ratio arithmetic (the caller does that), no knowledge of MIDI channels.

Requirements the tests encode, all of which must be visible in the code:

- The primary cluster is one flex line: name, a render-select `Checkbox` labelled for the track, a solo toggle, a mute toggle, a `Slider` for volume with `min={0} max={16} step={1}` and an accessible name that includes the track (`aria-label={`${name} volume`}`), and the expand control.
- Solo and mute are `aria-pressed` toggle buttons (reuse Plan B's `TransportToggle` if its `data-testid` forwarding landed; otherwise a `Button` with `aria-pressed`). Their handlers report `!current`, which is what makes solo non-exclusive.
- The expand control is a `Button` with `aria-expanded={expanded}` and `aria-controls` pointing at the disclosure panel's id.
- The disclosure renders per staff: a `Checkbox` for `showStandardNotation`, one for `showSlash`, one for `showNumbered`, and one for `showTablature` **only when `staff.tablatureAvailable`**.
- Below the staff toggles, two `Slider`s with distinct names — "Transpose audio" and "Transpose full" — each `min={-12} max={12} step={1}`, wired to their own callbacks. They are separate controls in the fork and must stay separate; fusing them drops the notation-transposing path entirely.
- Every control's hit area is at least 44 px.

Add this comment above the volume slider, because it is the behaviour a future reader will otherwise file as a bug:

```tsx
{
  /* 0-16 is playbackInfo.volume's own scale. The caller converts this to the RATIO
            changeTrackVolume takes. Note the coupling v0 accepts: changeTrackVolume sets the
            volume on the track's primary AND secondary MIDI channels, so tracks sharing a channel
            move together — Punk.gp's two drum tracks are both on channel 9, so its Drumkit and
            Drumkit Left sliders are not independent. That is expected, not a defect. */
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/client exec vitest run src/components/ui/TrackRow`
Expected: PASS — 8 tests.

- [ ] **Step 5: Write the story-ids, stories, a11y and VR files**

`TrackRow.story-ids.ts`: `['collapsed', 'expanded', 'stringed-expanded', 'muted', 'soloed']`. The `stringed-expanded` story is what proves the tablature toggle renders for a tuned staff, so it earns its own baseline. `storyPrefix: 'ui-trackrow'`, `snapshotSlug: 'trackrow'`, `slotSelector: '[data-slot="track-row"]'`, `iconFontStory: () => true`, a `w-[30rem]` decorator.

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

**Files:**

- Create: `web/lib/alphatab/settings-schema.ts`
- Modify: `client/src/index.ts`

**Interfaces:**

- Consumes: `AlphaTabEngine` (Plan A); `SettingControl` (Task 2).
- Produces:

```ts
/** The persisted edit state: a partial of AlphaTab's own SettingsJson shape. */
export type PlayerSettingsJson = Record<string, unknown>;

export interface SettingDescriptor {
  id: string;
  label: string;
  /** Dot path into the settings JSON, e.g. 'display.scale'. */
  path: string;
  control: SettingControl;
  /** Re-render the score after this changes. False for player-only settings. */
  rerender: boolean;
}

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
```

Tasks 5 and 6 consume all of it.

- [ ] **Step 1: Read the fork and list the rows**

Open the reference panel and work through it:

```bash
sed -n '266,700p' /Users/leocaseiro/Sites/alphaTabWebsite/src/components/AlphaTabRhythmGame/playground-settings.tsx
```

It defines seven groups plus a separate Tools block, ~90 rows in total:

| Group              | Rows                         |
| ------------------ | ---------------------------- |
| Display ▸ General  | 8                            |
| Display ▸ Colors   | 6                            |
| Display ▸ Fonts    | 14                           |
| Display ▸ Paddings | 15                           |
| Notation           | 7                            |
| Player             | 27                           |
| Stylesheet         | 13                           |
| Tools              | action buttons, not settings |

**The groups stay exactly these** — v0.1 is search plus tabs over rows that already exist, not a re-grouping. Write down each row's setting path and control kind as you read. **Write original label copy** — do not reuse the fork's strings, and do not borrow strings from any reference product.

- [ ] **Step 2: Write the failing test for the path helpers**

The schema itself is data, but the two path helpers are logic and they are where a silent settings corruption would start. `web/` has no unit-test runner, so test them through the `tooling` lane, which already runs `node --test` in CI. Create `tooling/settings-path.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readSettingValue, writeSettingValue } from '../web/lib/alphatab/settings-paths.mjs';

test('reads a nested value by dot path', () => {
  assert.equal(readSettingValue({ display: { scale: 1.4 } }, 'display.scale'), 1.4);
});

test('returns undefined for a missing path instead of throwing', () => {
  assert.equal(readSettingValue({}, 'display.scale'), undefined);
  assert.equal(readSettingValue({ display: {} }, 'display.resources.staffLineColor'), undefined);
});

test('writes a nested value without mutating the input', () => {
  const before = { display: { scale: 1 } };
  const after = writeSettingValue(before, 'display.scale', 2);

  assert.equal(after.display.scale, 2);
  assert.equal(before.display.scale, 1, 'the original must not be mutated');
});

test('creates missing intermediate objects', () => {
  const after = writeSettingValue({}, 'display.resources.staffLineColor', '#2DD4BF');
  assert.equal(after.display.resources.staffLineColor, '#2DD4BF');
});

test('leaves sibling keys intact', () => {
  const after = writeSettingValue({ display: { scale: 1, stretchForce: 1 } }, 'display.scale', 2);
  assert.equal(after.display.stretchForce, 1);
});
```

> The helpers live in a plain `.mjs` file so this test can import them with no build step; `settings-schema.ts` re-exports them for the typed callers. If you would rather add Vitest to `web/`, that is a bigger change than this plan scopes — raise it rather than doing it silently.

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test tooling/settings-path.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the path helpers**

Create `web/lib/alphatab/settings-paths.mjs`:

```js
/**
 * Dot-path read/write over the settings JSON.
 *
 * Immutable on write: React state holds this object, and mutating it in place would leave the
 * popover showing a stale value while the engine had the new one.
 */

export function readSettingValue(json, path) {
  let current = json;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object' || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

export function writeSettingValue(json, path, value) {
  const parts = path.split('.');
  const [head, ...rest] = parts;
  if (rest.length === 0) return { ...json, [head]: value };
  const child = json[head];
  const base = child !== null && typeof child === 'object' ? child : {};
  return { ...json, [head]: writeSettingValue(base, rest.join('.'), value) };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tooling/settings-path.test.mjs`
Expected: PASS — 5 tests.

- [ ] **Step 6: Write the schema**

Create `web/lib/alphatab/settings-schema.ts`. It takes the engine so it can turn an AlphaTab enum into plain `{ value, label }` pairs before handing them to a `client/` row:

```ts
import type { SettingControl } from '@notation-hero/client';

import { readSettingValue, writeSettingValue } from './settings-paths.mjs';
import type { AlphaTabEngine } from './engine';

export { readSettingValue, writeSettingValue };

export type PlayerSettingsJson = Record<string, unknown>;

export interface SettingDescriptor {
  id: string;
  label: string;
  /** Dot path into the settings JSON, e.g. 'display.scale'. */
  path: string;
  control: SettingControl;
  /** Re-render the score after this changes. Player-only settings set this false. */
  rerender: boolean;
}

export interface SettingGroup {
  id: string;
  title: string;
  settings: SettingDescriptor[];
}

/**
 * Turns an AlphaTab enum object into the plain option array a client/ row takes.
 *
 * TypeScript's numeric enums are bidirectional, so Object.entries yields both the name->value and
 * the value->name pairs; keeping only the non-numeric keys drops the reverse half.
 */
function enumOptions(
  enumObject: Record<string, string | number>,
): { value: string; label: string }[] {
  return Object.entries(enumObject)
    .filter(([key]) => Number.isNaN(Number(key)))
    .map(([key, value]) => ({ value: String(value), label: key }));
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
          label: 'Zoom',
          path: 'display.scale',
          control: { kind: 'range', min: 0.25, max: 3, step: 0.05 },
          rerender: true,
        },
        {
          id: 'display-layout-mode',
          label: 'Layout',
          path: 'display.layoutMode',
          control: { kind: 'select', options: enumOptions(engine.LayoutMode) },
          rerender: true,
        },
        // …the remaining six rows of this group.
      ],
    },
    // …the other seven groups.
  ];
}

/**
 * The values the app ships with. Only keys the UI can edit belong here — this is the fallback a
 * corrupt stored value is merged against, so a key missing from it can never be restored.
 */
export const DEFAULT_PLAYER_SETTINGS: PlayerSettingsJson = {
  display: { scale: 1 },
  // …one entry per schema row, matching its path.
};
```

**Fill in every row before moving on.** The two shown are the pattern; the list comes from Step 1's reading, and a group left as a comment is an unfinished task, not a deferral. Cross-check as you go: every `path` in the schema must have a matching entry in `DEFAULT_PLAYER_SETTINGS`, and every entry there must correspond to a row.

- [ ] **Step 7: Export the row components and the primitives the popovers need**

Append to `client/src/index.ts`:

```ts
// The v0 popovers (Plan C):
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './components/ui/Accordion/Accordion';
export { SettingRow } from './components/ui/SettingRow/SettingRow';
export type { SettingControl, SettingValue } from './components/ui/SettingRow/SettingRow';
export { TrackRow } from './components/ui/TrackRow/TrackRow';
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from './components/ui/Popover/Popover';
export { ScrollArea } from './components/ui/ScrollArea/ScrollArea';
export { Separator } from './components/ui/Separator/Separator';
```

Add `'use client'` to `Popover.tsx`, `Field.tsx`, `Checkbox.tsx`, `NativeSelect.tsx`, `Input.tsx`, `ScrollArea.tsx` and `Separator.tsx` wherever it is absent — each is now a `web/` consumer's dependency. Check `ScrollArea`'s and `Separator`'s real export names before writing the lines above.

- [ ] **Step 8: Verify the packages are clean**

```bash
pnpm --filter @notation-hero/client run lint
pnpm --filter @notation-hero/client run typecheck
pnpm --filter @notation-hero/web run typecheck
node --test tooling/settings-path.test.mjs
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add web/lib/alphatab/settings-paths.mjs web/lib/alphatab/settings-schema.ts \
  tooling/settings-path.test.mjs client/src/index.ts client/src/components/ui
git commit -m "feat(web): add the settings group schema and its accessors (NH-291)"
```

---

### Task 5: The Settings popover

**Files:**

- Create: `web/app/play/SettingsPopover.tsx`
- Modify: `web/app/play/PlayerHeader.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `buildSettingGroups`, `readSettingValue`, `writeSettingValue` (Task 4); `Accordion`, `SettingRow`, `Popover*`, `ScrollArea` (Tasks 1, 2, 4); `useAlphaTabEngine` (Plan A).
- Produces: test hooks `data-testid="settings-trigger"`, `data-testid="settings-popover"`.

- [ ] **Step 1: Write the failing test**

Add to `web/e2e/player.e2e.ts`:

```ts
test('a settings row changes the rendered score without stopping playback', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');

  const surface = page.getByTestId('notation-surface');
  const widthBefore = (await surface.locator('svg').first().boundingBox())?.width ?? 0;

  await page.getByTestId('settings-trigger').click();
  await expect(page.getByTestId('settings-popover')).toBeVisible();

  // Open the first group and change the zoom — a setting whose effect is measurable in the DOM.
  await page.getByRole('button', { name: 'Display: general' }).click();
  await page.getByRole('slider', { name: 'Zoom' }).fill('2');

  await expect
    .poll(async () => (await surface.locator('svg').first().boundingBox())?.width ?? 0, {
      timeout: 20_000,
    })
    .toBeGreaterThan(widthBefore);

  // The popover never blocks the player: that is the whole reason v0 chose a popover.
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "settings row"`
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
} from '@notation-hero/client';
import type { SettingValue } from '@notation-hero/client';

import { buildSettingGroups, readSettingValue } from '../../lib/alphatab/settings-schema';
import type { PlayerSettingsJson } from '../../lib/alphatab/settings-schema';
import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';

interface SettingsPopoverProps {
  settings: PlayerSettingsJson;
  onSettingChange: (path: string, value: SettingValue, rerender: boolean) => void;
  /** The playback-speed multiplier. The SAME value Plan B's header TempoControl edits. */
  speed: number;
  /** PlayerShell's `applySpeed` — the only writer of api.playbackSpeed (Plan B Global Constraints). */
  onSpeedChange: (next: number) => void;
}

// The header gear. A POPOVER, not a modal — it never blocks the player, so a drummer can change a
// setting while the score plays. That is the single reason v0 chose this shape, and v0.1's search
// and tabs are layered over these same rows.
//
// The 12.5-200% playback-speed slider lives in this popover's Player group, not in the header pill:
// neither design source draws a slider there, and "two popovers, not modals" leaves no third
// surface for one.
//
// SPEED IS NOT A SCHEMA ROW — it is the one control in this popover that must NOT go through
// `onSettingChange`. `playbackSpeed` is an AlphaTabApi PROPERTY, not a key in AlphaTab's
// PlayerSettingsJson (verified against 1.8.4's alphaTab.d.ts: no such key anywhere in the interface),
// so a schema row would write a path `fillFromJson` ignores. The slider would move, the % would
// update, and the audio would not change — a silent failure, not an error. It also cannot BE a schema
// row: `SettingDescriptor` requires a `path`, and Task 4 Step 6's cross-check demands every path have
// a matching DEFAULT_PLAYER_SETTINGS entry, which speed cannot have.
//
// So it renders outside the schema map and calls `onSpeedChange` — PlayerShell's `applySpeed`, which
// Plan B's Global Constraints make the SOLE writer of api.playbackSpeed. That is also what keeps this
// slider and Plan B's header BPM stepper in sync: one `speed` value, one writer, two editors.
export function SettingsPopover({
  settings,
  onSettingChange,
  speed,
  onSpeedChange,
}: Readonly<SettingsPopoverProps>) {
  const { engine } = useAlphaTabEngine();
  // The enum options come off the loaded namespace, so the groups cannot exist before it does.
  const groups = engine ? buildSettingGroups(engine) : [];

  return (
    <Popover>
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
                  {/* Outside the schema map, and deliberately first in the Player group: it is the
                      control a drummer reaches for most. See the note above for why it cannot be a
                      schema row. */}
                  {group.id === 'player' ? (
                    <SettingRow
                      id="playback-speed"
                      label="Playback speed"
                      control={{ kind: 'range', min: 0.125, max: 2, step: 0.125 }}
                      value={speed}
                      onChange={(next) => onSpeedChange(Number(next))}
                    />
                  ) : null}
                  {group.settings.map((setting) => (
                    <SettingRow
                      key={setting.id}
                      id={setting.id}
                      label={setting.label}
                      control={setting.control}
                      value={readSettingValue(settings, setting.path) ?? ''}
                      onChange={(next) => onSettingChange(setting.path, next, setting.rerender)}
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

> `PopoverTrigger`'s composition API is Base UI's: check whether it takes `render={<Button/>}` or `nativeButton`/`asChild` in the installed 1.6, and follow whatever `FacetFilter` or `TokenPicker` already does in `client/` — they are the working precedent in this repo.

- [ ] **Step 4: Apply a changed setting to the live engine**

In `PlayerShell.tsx`:

```tsx
const [settings, setSettings] = useState<PlayerSettingsJson>(DEFAULT_PLAYER_SETTINGS);

const applySetting = useCallback((path: string, value: SettingValue, rerender: boolean) => {
  setSettings((current) => {
    const next = writeSettingValue(current, path, value);
    const api = apiRef.current;
    if (api) {
      // fillFromJson, NEVER assignment. JSON.parse returns plain objects, but
      // RenderingResources holds real model.Color and model.Font instances, and a plain object
      // assigned into the settings tree breaks rendering WITHOUT throwing — so a try/catch
      // would never fire and the Colors and Fonts groups would silently stop working.
      api.settings.fillFromJson(next as never);
      api.updateSettings();
      if (rerender) api.render();
    }
    return next;
  });
}, []);
```

Pass `settings` and `applySetting` to `SettingsPopover`, and render the popover inside `PlayerHeader` beside the tempo control.

- [ ] **Step 5: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 6: Walk every group by hand**

Open each of the eight sections and change at least one row in each, watching the score. Any row that does nothing is either a wrong path or a missing `rerender` flag — fix it now, because criterion 7 says the Settings popover's rows change the rendered score, not that the popover opens.

- [ ] **Step 7: Commit**

```bash
git add web/app/play/SettingsPopover.tsx web/app/play/PlayerHeader.tsx \
  web/app/play/PlayerShell.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): add the Settings popover (NH-291)"
```

---

### Task 6: Persist the settings

One `localStorage` key holding AlphaTab's own settings JSON alongside a `version` integer. Score files and playback history are never stored — the no-recent-files rule is about scores, not preferences.

**Files:**

- Create: `web/lib/alphatab/settings-storage.ts`
- Create: `tooling/settings-storage.test.mjs`
- Modify: `web/app/play/PlayerShell.tsx`

**Interfaces:**

- Consumes: `DEFAULT_PLAYER_SETTINGS` (Task 4).
- Produces: `loadStoredSettings(raw: string | null): { settings: PlayerSettingsJson; reset: boolean }` and `serializeSettings(settings: PlayerSettingsJson): string`, plus `SETTINGS_STORAGE_KEY` and `SETTINGS_VERSION`.

- [ ] **Step 1: Write the failing test**

Create `tooling/settings-storage.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadStoredSettings, serializeSettings } from '../web/lib/alphatab/settings-storage.mjs';

const DEFAULTS = { display: { scale: 1 }, player: { enableCursor: true } };

test('a round trip preserves every stored value', () => {
  const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: false } });
  const { settings, reset } = loadStoredSettings(stored, DEFAULTS);

  assert.equal(settings.display.scale, 1.4);
  assert.equal(settings.player.enableCursor, false);
  assert.equal(reset, false);
});

test('no stored value yields the defaults and is NOT reported as a reset', () => {
  const { settings, reset } = loadStoredSettings(null, DEFAULTS);
  assert.deepEqual(settings, DEFAULTS);
  assert.equal(reset, false, 'a first visit is not a corruption');
});

// A bad stored value must never break the player, and must not vanish quietly.
test('unparseable JSON falls back to the defaults and reports a reset', () => {
  const { settings, reset } = loadStoredSettings('{not json', DEFAULTS);
  assert.deepEqual(settings, DEFAULTS);
  assert.equal(reset, true);
});

test('a wrong-shaped value falls back and reports a reset', () => {
  const { settings, reset } = loadStoredSettings('"a string"', DEFAULTS);
  assert.deepEqual(settings, DEFAULTS);
  assert.equal(reset, true);
});

// Merge PER KEY rather than discarding the whole object — v0.1 layers search over these same
// settings, so the stored shape changes soon after v0 ships.
test('an older version keeps the keys it has and fills the rest from the defaults', () => {
  const stored = JSON.stringify({ version: 0, settings: { display: { scale: 1.4 } } });
  const { settings, reset } = loadStoredSettings(stored, DEFAULTS);

  assert.equal(settings.display.scale, 1.4, 'the stored key survives');
  assert.equal(settings.player.enableCursor, true, 'the missing key comes from the defaults');
  assert.equal(reset, false, 'a partial merge is not a reset');
});

test('an unknown key in the stored value is dropped', () => {
  const stored = JSON.stringify({
    version: 1,
    settings: { display: { scale: 1.4 }, bogus: { nope: 1 } },
  });
  const { settings } = loadStoredSettings(stored, DEFAULTS);
  assert.equal(settings.bogus, undefined);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tooling/settings-storage.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the storage module**

Create `web/lib/alphatab/settings-storage.mjs` (plain `.mjs` so the `tooling` lane can import it with no build step; `settings-storage.ts` re-exports it for typed callers, exactly as Task 4 does for the path helpers):

```js
export const SETTINGS_STORAGE_KEY = 'notation-hero.player-settings';
export const SETTINGS_VERSION = 1;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Deep merge per key, keeping only keys the defaults declare. */
function mergeAgainstDefaults(stored, defaults) {
  const merged = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = isPlainObject(stored) ? stored[key] : undefined;
    if (isPlainObject(fallback)) {
      merged[key] = mergeAgainstDefaults(isPlainObject(value) ? value : {}, fallback);
    } else {
      merged[key] = value === undefined ? fallback : value;
    }
  }
  return merged;
}

export function serializeSettings(settings) {
  return JSON.stringify({ version: SETTINGS_VERSION, settings });
}

/**
 * Read the stored settings, merging per key against the shipped defaults.
 *
 * `reset` is true only when something was actually WRONG — unparseable, or the wrong shape. A
 * first visit (null) and an older version that merges cleanly are both normal, and raising a
 * "settings were reset" toast for either would cry wolf.
 *
 * Merging per key rather than discarding the whole object matters because v0.1 layers search and
 * tabs over these same settings, so the stored shape changes soon after v0 ships — a drummer who
 * upgrades should keep the colours they chose, not start over.
 */
export function loadStoredSettings(raw, defaults) {
  if (raw === null || raw === undefined) return { settings: defaults, reset: false };

  let parsed;
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tooling/settings-storage.test.mjs`
Expected: PASS — 6 tests.

- [ ] **Step 5: Restore on mount and persist on change**

In `PlayerShell.tsx`:

```tsx
// Restore once, on the client only — localStorage does not exist during the server render.
useEffect(() => {
  const { settings: restored, reset } = loadStoredSettings(
    window.localStorage.getItem(SETTINGS_STORAGE_KEY),
    DEFAULT_PLAYER_SETTINGS,
  );
  setSettings(restored);
  if (reset) {
    // Without this a drummer watches their colours and fonts revert with no way to tell it from
    // a bug. Same surface the corrupt-file and engine-failure states use.
    toast.warning('Your player settings could not be read, so they were reset to the defaults.');
  }
}, []);
```

and persist inside `applySetting`, right after computing `next`:

```tsx
try {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, serializeSettings(next));
} catch {
  // Private browsing and a full quota both throw here. Losing persistence is survivable;
  // losing the player is not, so swallow it rather than breaking the edit.
}
```

Apply the restored settings to the engine once it exists — add an effect that runs when both `engine` and `apiRef.current` are ready and calls the same `fillFromJson` + `updateSettings()` + `render()` sequence. **Wrap that call in `try`/`catch`:** an uncaught throw during restore would stop the player mounting at all, which is the one thing v0 exists to do.

- [ ] **Step 6: Verify by hand**

Change the zoom and a colour, reload the page, and confirm both survived. Then corrupt the value and confirm the toast appears and the player still mounts:

```js
localStorage.setItem('notation-hero.player-settings', '{broken');
location.reload();
```

- [ ] **Step 7: Commit**

```bash
git add web/lib/alphatab/settings-storage.mjs web/lib/alphatab/settings-storage.ts \
  tooling/settings-storage.test.mjs web/app/play/PlayerShell.tsx
git commit -m "feat(web): persist player settings across reloads (NH-291)"
```

---

### Task 7: The Tracks popover

One row for **every track in the score**, not only the rendered drum staves — every track stays audible, so all of them are controllable.

**Files:**

- Create: `web/app/play/TracksPopover.tsx`
- Modify: `web/app/play/TransportRow.tsx`
- Modify: `web/app/play/NotationSurface.tsx`
- Modify: `web/app/play/PlayerShell.tsx`
- Modify: `web/e2e/player.e2e.ts`

**Interfaces:**

- Consumes: `TrackRow` (Task 3); `Popover*`, `ScrollArea`; the score's tracks.
- Produces: test hooks `data-testid="tracks-trigger"`, `data-testid="tracks-popover"`, and `data-testid="track-row-<index>"` per row.

- [ ] **Step 1: Write the failing test**

Add to `web/e2e/player.e2e.ts`:

```ts
// Punk.gp parses to three tracks — 0:Drumkit (percussion), 1:Distortion Guitar, 2:Drumkit Left
// (percussion) — so the popover has three rows to audit, not one, even though only two render.
test('the Tracks popover lists every track in the score, not only the rendered ones', async ({
  page,
}) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  await expect(page.getByTestId('tracks-popover')).toBeVisible();
  await expect(page.getByTestId('track-row-0')).toBeVisible();
  await expect(page.getByTestId('track-row-1')).toBeVisible();
  await expect(page.getByTestId('track-row-2')).toBeVisible();
});

test('render-select changes which tracks are drawn', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  // Draw the guitar too.
  await page
    .getByTestId('track-row-1')
    .getByRole('checkbox', { name: /render/i })
    .click();

  await expect(page.getByTestId('rendered-track-count')).toHaveText('3', { timeout: 30_000 });
});

test('solo is not exclusive — two tracks can be soloed at once', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  await page.getByTestId('track-row-0').getByRole('button', { name: /solo/i }).click();
  await page.getByTestId('track-row-2').getByRole('button', { name: /solo/i }).click();

  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /solo/i }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByTestId('track-row-2').getByRole('button', { name: /solo/i }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('only a stringed staff with a tuning offers the tablature toggle', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();

  // The guitar staff reports tuningLen=6, so its row has the toggle.
  await page
    .getByTestId('track-row-1')
    .getByRole('button', { name: /more|expand/i })
    .click();
  await expect(
    page.getByTestId('track-row-1').getByRole('checkbox', { name: /tablature/i }),
  ).toBeVisible();

  // Both drum staves report showTablature=false, tuningLen=0 — 1.8.4 cannot render percussion
  // tablature at all, so the toggle must be absent rather than present-and-broken.
  await page
    .getByTestId('track-row-0')
    .getByRole('button', { name: /more|expand/i })
    .click();
  await expect(
    page.getByTestId('track-row-0').getByRole('checkbox', { name: /tablature/i }),
  ).toHaveCount(0);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @notation-hero/web run test:e2e -g "Tracks popover|render-select|solo is not exclusive|tablature toggle"`
Expected: FAIL — no `tracks-trigger`.

- [ ] **Step 3: Report the score's tracks upward**

In `NotationSurface.tsx`, widen the `onScoreLoaded` payload from Plan B to carry the track shape the popover needs. Map it into plain data at the boundary, so nothing downstream holds an AlphaTab object in React state:

```tsx
onScoreLoaded({
  tempo: score.tempo,
  title: score.title,
  tracks: score.tracks.map((track) => ({
    index: track.index,
    name: track.name,
    volume: track.playbackInfo.volume,
    staves: track.staves.map((staff, staffIndex) => ({
      id: `${track.index}-${staffIndex}`,
      showStandardNotation: staff.showStandardNotation,
      showSlash: staff.showSlash,
      showNumbered: staff.showNumbered,
      showTablature: staff.showTablature,
      // 1.8.4 forces showTablature=false on any percussion staff and requires a tuning, so
      // the toggle is offered only where it can actually do something.
      tablatureAvailable: !staff.isPercussion && staff.tuning.length > 0,
    })),
  })),
});
```

- [ ] **Step 4: Write the popover**

Create `web/app/play/TracksPopover.tsx`. It holds the per-track UI state and calls the api. The accessors that matter:

```tsx
const trackAt = (index: number) => apiRef.current?.score?.tracks[index];

const applyRendered = (index: number, next: boolean) => {
  const chosen = nextRenderedIndexes(index, next); // the new set, computed from local state
  const api = apiRef.current;
  const score = api?.score;
  if (!api || !score) return;
  // renderTracks takes Track OBJECTS (unlike renderScore, which takes indexes).
  api.renderTracks(chosen.map((i) => score.tracks[i]));
};

const applySolo = (index: number, next: boolean) => {
  const track = trackAt(index);
  // Solo is NOT exclusive, as in AlphaTab and the reference fork: this sets one track's flag and
  // leaves every other track's alone.
  if (track) apiRef.current?.changeTrackSolo([track], next);
};

const applyMute = (index: number, next: boolean) => {
  const track = trackAt(index);
  if (track) apiRef.current?.changeTrackMute([track], next);
};

const applyVolume = (index: number, next: number) => {
  const track = trackAt(index);
  if (!track) return;
  // A RATIO against the track's current value, not an absolute — that is what changeTrackVolume
  // takes. `next` is on playbackInfo.volume's own 0-16 scale. Guard the zero denominator: a
  // track sitting at 0 would divide by zero and push Infinity into the synth.
  const current = track.playbackInfo.volume;
  apiRef.current?.changeTrackVolume([track], current > 0 ? next / current : 0);
};

const applyTransposeAudio = (index: number, semitones: number) => {
  const track = trackAt(index);
  // Audio only — no re-render. This is the half that must NOT be fused with Transpose full.
  if (track) apiRef.current?.changeTrackTranspositionPitch([track], semitones);
};

const applyTransposeFull = (index: number, semitones: number) => {
  const api = apiRef.current;
  if (!api) return;
  // Notation AND audio: write the per-track entry, then push and redraw. Fusing this with
  // Transpose audio would drop the notation-transposing path entirely.
  const pitches = [...api.settings.notation.transpositionPitches];
  pitches[index] = semitones;
  api.settings.notation.transpositionPitches = pitches;
  api.updateSettings();
  api.render();
};

const applyStaffDisplay = (
  trackIndex: number,
  staffIndex: number,
  key: 'showStandardNotation' | 'showSlash' | 'showNumbered' | 'showTablature',
  next: boolean,
) => {
  const api = apiRef.current;
  const staff = api?.score?.tracks[trackIndex]?.staves[staffIndex];
  if (!api || !staff) return;
  staff[key] = next;
  api.render();
};
```

Wrap the rows in a `Popover` triggered from the transport's `instant_mix` button, put them inside a `ScrollArea` (a band score is many rows), and give each row `data-testid={`track-row-${track.index}`}`.

- [ ] **Step 5: Add the trigger to the transport row**

In `TransportRow.tsx`, add the Tracks button after the Count-In toggle, separated by the existing `Separator`, and pass the popover through as a prop the way `playButton` already is — the row stays layout-only.

- [ ] **Step 6: Run the lane to verify it passes**

Run: `pnpm --filter @notation-hero/web run test:e2e`
Expected: PASS.

- [ ] **Step 7: Verify the mix by ear, and confirm the coupling**

Load `Punk.gp`, play it, and check: mute silences a track; solo (on two tracks at once) leaves both audible and the rest silent; the volume slider changes the level. Then confirm the accepted coupling — move Drumkit's volume and watch Drumkit Left move with it, because `changeTrackVolume` writes the primary **and** secondary MIDI channels and both tracks are on channel 9. That is expected v0 behaviour; record it in the PR rather than filing it as a bug.

- [ ] **Step 8: Commit**

```bash
git add web/app/play/TracksPopover.tsx web/app/play/TransportRow.tsx \
  web/app/play/NotationSurface.tsx web/app/play/PlayerShell.tsx web/e2e/player.e2e.ts
git commit -m "feat(web): add the Tracks popover with the full mixer row (NH-291)"
```

---

### Task 8: Extend the axe gate and open the PR

**Files:**

- Modify: `web/e2e/a11y.e2e.ts`

- [ ] **Step 1: Add the two popover-open axe cases**

The spec's axe lane covers `/` and `/play` in four states, and two of them are these. Add to `web/e2e/a11y.e2e.ts`:

```ts
test('player has no axe violations with the Settings popover open', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').click();
  await expect(page.getByTestId('settings-popover')).toBeVisible();
  // Open a group so the rows themselves are audited, not just the closed headers.
  await page.getByRole('button', { name: 'Display: general' }).click();

  await expectNoViolations(page, 'play / settings open');
});

test('player has no axe violations with the Tracks popover open', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  await expect(page.getByTestId('tracks-popover')).toBeVisible();
  // Expand a row so the disclosure's controls are audited too.
  await page
    .getByTestId('track-row-0')
    .getByRole('button', { name: /more|expand/i })
    .click();

  await expectNoViolations(page, 'play / tracks open');
});
```

- [ ] **Step 2: Run it**

Run: `pnpm --filter @notation-hero/web run test:e2e a11y`
Expected: PASS. Fix violations in the markup, never by loosening the assertion. The likely ones: a row control with no accessible name, a duplicate `id` across two rows (the schema's `id` must be unique across all eight groups), and contrast on a pressed solo/mute button.

- [ ] **Step 3: Measure every popover control's hit area**

```bash
pnpm --filter @notation-hero/web run dev
```

With both popovers open in turn, in the browser console:

```js
[
  ...document.querySelectorAll(
    'button, a[href], label[for], [role="button"], [role="checkbox"], input[type="range"], select, input:not([type="range"])',
  ),
]
  .map((el) => ({
    label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 24),
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
git commit -m "test(web): axe over both open popovers (NH-291)"
git push
gh pr create --title "feat: v0 settings and tracks popovers (NH-291)" --body "$(cat <<'EOF'
Implements Plan C of the v0 local-file drum player.

Spec: `docs/specs/2026-09-10-v0-local-file-player-design.md`
Plan: `docs/plans/2026-09-13-v0c-popovers-plan.md`

## New design-system components

`Accordion`, `SettingRow`, `TrackRow` — each with a Storybook story plus VR and axe baselines that block merge. `Accordion` completes the three new components the spec called for, and it is what v0.1's settings search builds on.

## Success criteria covered

- [x] 3 (per-track mute/solo half) — solo, mute and volume change the audible mix
- [x] 7 — the Settings rows change the rendered score; the Tracks popover lists every track and its rows work in both directions (solo/mute/volume for the mix, render-select for what is drawn, display toggles and both transposition sliders for the rendered score)

Tablature is excluded from criterion 7 by the spec: 1.8.4 cannot render it on a percussion staff.

## Notes

- **The port is clean-room.** The reference fork (`rhythm-game` branch, MPL-2.0) was read, not copied — no files, no code, no label strings. All label copy is original.
- **Accepted coupling:** `changeTrackVolume` writes the track's primary AND secondary MIDI channels, so tracks sharing a channel move together. `Punk.gp`'s two drum tracks are both on channel 9, so its Drumkit and Drumkit Left volume sliders are not independent. Expected v0 behaviour, not a defect.
- Settings persist under one `localStorage` key with a version integer, restored through `Settings.fillFromJson` and merged per key against the shipped defaults. A corrupt value falls back and raises a toast rather than reverting silently.

## Pulumi preview

safe — no `infra/` changes in this PR.
EOF
)"
gh run watch
```

- [ ] **Step 6: Update the decision registry and close out v0**

Add a Change-log entry recording the three new design-system components and the settings-persistence shape, and commit it in this PR.

Then take stock of the v0 acceptance set across all three plans. Criteria 1–8 and 10 should now be met; **criterion 9 is still unverified** (no percussion-free fixture, Q7), and `.musicxml` / `.mxml` / `.xml` remain untested (Q6). Say so plainly in the epic rather than marking v0 complete.

---

## Self-Review

**Spec coverage.** §7 "Two popovers, not modals" → Tasks 5 and 7, with the non-blocking property asserted in Task 5's own test. §7 Settings groups (Display ▸ General, Colors, Fonts, Paddings, Notation, Player, Stylesheet, Tools) → Task 4, with the real row counts from the reference panel. §7 "Colors are plain text inputs for now" → `SettingRow`'s `text` kind, called out in its comment. §7 Tracks row full control set (render-select, solo, mute, volume, per-staff display toggles, both transposition sliders) → Tasks 3 and 7. §7 volume-as-ratio with a zero guard, and the 0–16 scale → Tasks 3 and 7. §7 channel coupling → stated in Global Constraints, in `TrackRow`'s comment, in Task 7's manual check and in the PR body. §7 tablature only for a tuned stringed staff → Tasks 3 and 7, each with a test. §7 eight-controls disclosure → Task 3. §7 "compose controls that already exist" → `SettingRow` composes `Field`, `Checkbox`, `Input`, `NativeSelect`, `Slider`; none is new. §7 settings persistence, `fillFromJson`, the per-key merge and the reset toast → Task 6. §7 the 12.5–200 % slider in the Player group → Task 5, rendered OUTSIDE the schema and wired to `PlayerShell`'s `applySpeed` rather than to `onSettingChange` (Plan B's single-writer constraint — `playbackSpeed` is an API property, not a settings-JSON key). §8 criteria 3 and 7 → Tasks 5 and 7. **Deliberately not covered here:** everything in Plans A and B; v0.1's search index and tab chrome; drum tablature (needs a version bump, Q5).

**Placeholder scan.** Two tasks describe rather than transcribe, and both name the exact source of the answer: Task 3's component body is specified as a requirement list plus the one comment that must appear (the test file above it is complete and is the real specification), and Task 4's schema shows two rows as the pattern with an explicit instruction that a group left as a comment is an unfinished task, not a deferral. Three steps say "check the installed API before running" — Base UI's accordion open-state attribute and `openMultiple` (Task 1), `Checkbox`'s callback name (Task 2), and `PopoverTrigger`'s composition prop (Task 5) — each naming the file or the working in-repo precedent to copy. None is deferred work.

**Type consistency.** `SettingControl` and `SettingValue` are declared once in `SettingRow.tsx`, re-exported from the barrel, and imported by `settings-schema.ts` — one definition, three users. `PlayerSettingsJson` is the same type in the schema, the storage module and `PlayerShell`. `readSettingValue` / `writeSettingValue` keep one name and one signature in the `.mjs`, the `.ts` re-export and both test files. `TrackStaffState.tablatureAvailable` is spelled identically in `TrackRow`'s props, its tests, and the mapping in `NotationSurface`. The `data-testid` values are declared in the task that creates them and reused verbatim: `settings-trigger`, `settings-popover`, `tracks-trigger`, `tracks-popover`, `track-row-<index>`.
