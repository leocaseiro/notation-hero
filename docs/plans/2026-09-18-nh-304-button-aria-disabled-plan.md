---
title: Accessible Disabled Button (NH-304) - Plan
type: feat
date: 2026-09-18
jira: NH-304
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Accessible Disabled Button (NH-304) - Plan

**Jira:** [NH-304](https://leocaseiro.atlassian.net/browse/NH-304) — blocks the file-open focus behaviour in the v0 Plan A player (NH-291).

---

## Goal Capsule

- **Objective:** A design-system `Button` that receives `disabled` stays reachable by Tab, by screen readers and by `ref.current.focus()`, and cannot be activated. Every consumer gets this with no code of its own.
- **Authority:** the NH-304 description, then this plan's Requirements, then the Key Technical Decisions. Where this plan records a deviation from the ticket wording (KTD6), the plan wins. A unit never overrides an R-ID or a KTD.
- **Execution profile:** one PR, three units, test-first for the component. Visual-regression (VR) baselines are Linux-only and are generated through Docker.
- **Stop conditions:** stop and report if any existing VR baseline other than the two new disabled-focus files changes, or if evidence shows KTD1 or KTD2 cannot work.
- **Tail ownership:** the calling pipeline owns commit, push, PR and CI.

---

## Product Contract

### Summary

`Button` renders `aria-disabled="true"` in place of the native `disabled` attribute and blocks activation inside the component.
The dimmed look does not change.
Elements that reuse `buttonVariants` with native `disabled` keep their look too.

### Problem Frame

A native `disabled` button leaves the tab order and cannot take focus.
A screen-reader user who moves through the page with Tab never meets the control, so they cannot learn that it exists or why it is unavailable.
Code that moves focus onto a control that is unavailable for a moment fails without an error: `ref.current.focus()` does nothing and focus falls back to `<body>`.

The concrete case is the player route.
Play is disabled until the audio engine is ready.
When a score file opens, focus must move to Play, but in the first seconds after page load the call does nothing.

### Requirements

**Semantics and focus**

- R1. When `disabled` is true, Button renders `aria-disabled="true"` and never the native `disabled` attribute. This holds for a `<button>` and for a `render` element such as `<a>`.
- R2. A disabled Button stays in the tab order, accepts `ref.current.focus()`, keeps its accessible name, and shows a keyboard focus ring as strong as the ring of an enabled Button.
- R3. When `disabled` is false or not set, Button renders no `aria-disabled` attribute. The DOM of an enabled Button does not change.
- R4. A change of `disabled` does not remount the element. Focus stays on it in both directions.

**Activation blocking**

- R5. While disabled, these handlers, when a consumer or a trigger passes them to Button, never run: `onClick`, `onKeyDown`, `onKeyUp`, `onMouseDown`, `onPointerDown`.
- R6. While disabled, the default action of a click and of an Enter or Space keydown is prevented. A `type="submit"` Button does not submit its form, also when Enter is pressed in a sibling input. A `render={<a href>}` Button does not navigate on click or Enter.
- R7. While disabled, Tab, Shift+Tab, Escape, arrow keys and scroll keys keep their default action. `onFocus` and `onBlur` still run. The component does not withhold hover handlers, but `pointer-events-none` (KTD7) keeps real pointer events away from a disabled Button, so they do not fire for a mouse user.
- R8. Consumers need no guard of their own. A Base UI trigger that renders `<Button disabled />` does not open its popup on click, Enter, Space or ArrowDown.

**Styling**

- R9. The disabled look is the same for every variant and size. The existing disabled resting VR baselines stay pixel-identical.
- R10. Elements that put `buttonVariants` on a natively disabled element keep their dimmed look.

**Compatibility**

- R11. `render={<a href>}` keeps `role=link`. No `role="button"`, no extra attributes, no dev console error.
- R12. The public API (`Button`, `buttonVariants`, `ButtonProps`), the default `type="button"`, the ref path and `'use client'` stay as they are.

### Acceptance Examples

- AE1. **Covers R1, R2.** Given `<Button disabled>Play</Button>`, when the user presses Tab, then the button has focus, carries `aria-disabled="true"` and has no `disabled` attribute.
- AE2. **Covers R5, R6.** Given a disabled `type="submit"` Button in a form with a text input, when the user presses Enter in the input, then `onSubmit` is not called. With the Button enabled, `onSubmit` is called one time.
- AE3. **Covers R4, R5.** Given an enabled Button with focus, when Space goes down, the Button becomes disabled, and Space goes up, then `onClick` is not called and focus stays on the Button.
- AE4. **Covers R8.** Given `<DropdownMenuTrigger render={<Button disabled />}>`, when the user clicks it or presses Enter, Space or ArrowDown on it, then the menu stays closed.
- AE5. **Covers R6, R11.** Given `<Button disabled render={<a href="/play" />}>Go</Button>`, when the user clicks it, then the click default is prevented, the element still has `role=link`, and it has no `disabled` attribute.

### Scope Boundaries

- Pagination keeps its native `<button disabled>` controls. The W3C ARIA Authoring Practices name a Previous control next to a Next control as the case where native `disabled` is fine.
- No new Button props. There is no opt-out that brings back native `disabled`.
- No change to `client/src/a11y-helpers.ts`, `client/src/vr-helpers.ts`, the Playwright configs, `client/vitest.setup.ts` or `client/.storybook/`.
- Known limits, to be listed in the PR body:
  - A disabled as-link Button keeps its `href`, because `href` lives on the `render` element. Navigation through the context-menu key stays possible. Middle-click is blocked by `pointer-events-none` only.
  - A handler placed on the `render` element itself, or owned by a component passed as `render`, merges last and is not guarded. Capture-phase handlers such as `onClickCapture` are not withheld.
  - Space on a disabled as-link Button does not scroll the page, because the Space keydown default is prevented for every rendered element.
  - Under `opacity-50` the 1px focus border renders at half strength. Only the ring reaches parity (KTD9).
  - A Button inside `<fieldset disabled>` stays natively disabled and out of reach.
  - No automated check can prove what a screen reader says. The nearest proxy is the Playwright role query in U2.

#### Deferred to Follow-Up Work

- A "why is this disabled" tooltip for mouse users. It needs a wrapper trigger, or hover classes gated on the disabled state plus the cursor rule at `client/src/styles.css:227`.
- A `loading` pattern for Button (`aria-busy`, live region). R4 is its base.
- `client/src/components/ui/Tabs/Tabs.tsx:53` styles `disabled:`, but Base UI Tab renders `aria-disabled`, so the dim likely never matches.
- The comment at `client/src/components/ui/InputGroup/InputGroup.tsx:99-101` says a bare Button defaults to `type="submit"`. That is wrong today: `useRender` already adds `type="button"`.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **The fix lives inside the design-system Button.** (session-settled: user-directed — chosen over per-consumer guards or per-consumer `aria-disabled` handling: every consumer that passes `disabled` gets the accessible behaviour with no code of its own.)
- KTD2. **`aria-disabled="true"` replaces the native `disabled` attribute, and the component blocks activation.** (session-settled: user-directed — chosen over keeping native `disabled`, with or without tabindex workarounds: native `disabled` removes the button from the tab order and makes `focus()` do nothing.)
- KTD3. **Write the guard by hand in the existing `useRender` + `mergeProps` wrapper. Do not adopt `@base-ui/react/button`.** The primitive's own docs say it must not render links, and this repo ships a tested, VR-gated as-link Button. With `nativeButton` true it logs a dev error and puts `type="button"` on the anchor. With `nativeButton` false it adds `role="button"` and breaks `getByRole('link')`. It also adds `aria-disabled="false"` and `tabindex="0"` to every enabled Button, and it prevents every key except Tab while disabled. `docs/decisions/2026-07-07-radix-to-base-ui-migration.md:33` already records that the primitive does not fit link rendering. `@base-ui/react/internals/use-button` carries no stability promise. Change this decision if Button stops rendering links or starts to live inside Base UI composite roots.
- KTD4. **Withhold the consumer's handlers; do not rely on a guard merged beside them.** Base UI `mergeProps` runs the rightmost handler first, and the consumer's props are rightmost. A guard merged to the left runs after the consumer's handler has fired. Button takes the five handlers named in R5 out of `props` and passes them on only when enabled. Trigger props arrive inside `props`, so the same step covers R8. There is one `useRender` call, and only its props change with `disabled`, which gives R4. The object that carries `aria-disabled` sits last, so a spread `aria-disabled={false}` cannot win.
- KTD5. **`preventDefault` runs on click and on Enter or Space keydown only.** The click guard is the layer that does the work: mouse, Enter, Space keyup, a programmatic `.click()`, implicit form submission and a press that starts enabled and ends disabled all arrive as a click. The keydown guard is the second layer. All other keys keep their default action (R7).
- KTD6. **Keep the `disabled:` selectors and add `aria-disabled:` next to them.** The ticket says the selectors move; a literal move removes the dim from Pagination's native `<button disabled>` controls and from any Button inside `<fieldset disabled>`, and it changes six Pagination baselines. `client/src/components/ui/Sidebar/Sidebar.tsx:469` already carries both sets. Tailwind v4 builds `aria-disabled:` in, with the same specificity and a later position than `hover:`, so the pixels match.
- KTD7. **Keep `pointer-events-none` on the aria-disabled state.** It is part of the guard, not only styling. Hover-open popups attach native listeners through the ref, which the prop guard cannot withhold. It also blocks middle-click, the right-click menu and the `:active` shift, and it stops the `hover:` classes from restyling a dimmed button. Cost: a mouse user gets no tooltip on a disabled Button. A keyboard user still gets one on focus.
- KTD8. **Proof uses the three gates that CI already runs.** Unit tests prove the behaviour. The VR `focus` state presses Tab and asserts `toBeFocused()` before the screenshot, so it proves Tab reach in a real browser. The a11y suite runs axe in light and dark. No story in the repo has a `play` function and no CI lane would run one, so none is added.
- KTD9. **The disabled focus ring gets double alpha, so it matches the enabled ring.** `opacity-50` dims the whole element, ring included. With the repo tokens the ring falls from about 1.51:1 to 1.22:1 against the light background, and from 1.90:1 to 1.29:1 in dark. The base string gains `aria-disabled:focus-visible:ring-ring`: full alpha under 50% opacity equals the enabled `ring-ring/50`. The `destructive` variant sets its own ring colour, so it gains `aria-disabled:focus-visible:ring-destructive/40` and `dark:aria-disabled:focus-visible:ring-destructive/80`, which double its `/20` and `/40`. `tailwind-merge` inside `cn` drops the base ring class when the variant class has the same variant set, as it does today for `focus-visible:ring-*`. The classes match only on aria-disabled plus focus-visible, so resting pixels do not change. Rejected: accept the dimmed ring, because no gate checks it and keyboard reach is the purpose of the ticket.

### High-Level Technical Design

Guard matrix while `disabled` is true:

| Event                  | Consumer or trigger handler | Default action | Reason                                                             |
| ---------------------- | --------------------------- | -------------- | ------------------------------------------------------------------ |
| click                  | withheld                    | prevented      | blocks activation, submit and `href` navigation                    |
| keydown Enter, Space   | withheld                    | prevented      | second layer; stops the key from producing a click                 |
| keydown, other keys    | withheld                    | kept           | Tab leaves, Escape bubbles, ArrowDown must not open a Menu trigger |
| keyup                  | withheld                    | kept           | consumer key logic must not run                                    |
| mousedown, pointerdown | withheld                    | kept           | Menu triggers open on mousedown                                    |
| focus, blur            | called                      | kept           | tooltip on focus is the reason to stay focusable                   |
| mouseenter, mouseleave | not withheld                | kept           | `pointer-events-none` (KTD7) stops them from firing in a browser   |

While `disabled` is false, all handlers pass through and no `aria-disabled` attribute is set.

### System-Wide Impact

The change reaches every Button and every reuse of the `buttonVariants` class string.

| Surface                                                                                                  | Effect                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<Button disabled>` call sites: the `Disabled` story, `Button.test.tsx`, the InputGroup `Disabled` story | become focusable and aria-disabled; no production code passes `disabled` today                                                                                                                                                                    |
| Wrappers that spread props into Button: `InputGroupButton`, `SidebarTrigger`                             | get the guard for free; `SidebarTrigger`'s wrapped `onClick` (with `toggleSidebar()`) is withheld too                                                                                                                                             |
| Base UI triggers that render a Button (Tooltip, DropdownMenu, HoverCard, Sheet, Popover)                 | a disabled trigger's Button becomes aria-disabled; click, Enter, Space and ArrowDown do not open the popup (R8), mouse hover is stopped by `pointer-events-none` (KTD7), and focus handlers still run, so a Tooltip still opens on keyboard focus |
| Pagination's native `<button disabled>` with `buttonVariants`                                            | no change, because the `disabled:` selectors stay (KTD6)                                                                                                                                                                                          |
| `MenubarTrigger`, the LevelFilter and FacetFilter triggers, `BreadcrumbLink`, Popover stories            | no change while enabled; an aria-disabled one would now dim                                                                                                                                                                                       |
| `web/app/page.tsx`                                                                                       | renders enabled Buttons only; the new classes already exist in the scanned sources through Sidebar                                                                                                                                                |

### Assumptions

These are agent bets that no one confirmed. Review them in the PR.

- `aria-disabled` passed without `disabled` passes through as styling only. `disabled` is the one API that turns the guard on. One test pins this.
- The guard does not call `stopPropagation`. A synthetic click on a disabled Button inside a clickable ancestor still bubbles, as a mouse click already does today through `pointer-events-none`.
- Button does not emit `data-disabled`. No selector in `client/src` keys on a Button's disabled state.
- In the InputGroup `Disabled` story the button becomes a tab stop while its input stays skipped. That is accepted; only the stale VR comment changes.
- A disabled Button now counts as tabbable, so it can become a Dialog's first focus target or honour `autoFocus`. No current usage does this.

### Open Questions

Both are deferred to implementation and do not block it.

- **`:active` shift on Space (deferred).** Check in a real browser that a Space press on a focused disabled Button does not move it by 1px. Neutralise `active:translate-y-px` for the aria-disabled state only if the shift shows.
- **Tooltip-on-focus proof in jsdom (deferred).** No test in the repo opens a Base UI Tooltip by focus today. If jsdom cannot model the focus-open, prove the U1 tooltip scenario in the same real-browser check and say so in the unit report.

### Risks

| Risk                                                                                | Mitigation                                                                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `--update-snapshots` silently re-blesses a regressed baseline.                      | Generate through compare mode (`pnpm test:vr:docker`), which writes only missing files. Require exactly 2 new PNGs and 0 modified. |
| A stale Storybook on port 6006 serves old stories to the native a11y run.           | Kill the listener on 6006 before `test:a11y`.                                                                                      |
| Later components copy the guard incorrectly.                                        | The decision-registry entry (U3) records the contract and the `toBeDisabled()` trap.                                               |
| A disabled `MenubarTrigger` starts to dim through the new `aria-disabled:` classes. | Intended side effect. No story or test disables one today.                                                                         |

### Sources & Research

- Base UI 1.6.0 source, read as the reference for the guard: `@base-ui/react/internals/use-button/useButton.mjs`, `utils/useFocusableWhenDisabled.mjs`, `merge-props/mergeProps.mjs`, `internals/useRenderElement.mjs:153-160` (default `type="button"`).
- axe-core 4.12.1 treats `aria-disabled="true"` as disabled and skips `color-contrast` for it (`isDisabled`, `colorContrastMatches`).
- jest-dom `toBeDisabled()` checks the native attribute only. Repo precedent for the attribute assertion: `client/src/components/ui/Tabs/Tabs.test.tsx:67-69`.
- Playwright `toBeDisabled()` and `getByRole(..., { disabled: true })` do honour `aria-disabled`.
- [APG: Focusability of disabled controls](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_disabled_controls), [MDN: aria-disabled](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled), [WCAG 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).

---

## Implementation Units

### U1. Guard and classes in Button, test-first

- **Goal:** Button renders `aria-disabled`, blocks activation, and keeps the dim for both selector sets.
- **Requirements:** R1, R2, R3, R4, R5, R6, R7, R8, R10, R11, R12. Implements KTD1 and KTD2 through KTD3 to KTD7, and KTD9.
- **Dependencies:** none.
- **Files:**
  - `client/src/components/ui/Button/Button.tsx`
  - `client/src/components/ui/Button/Button.test.tsx`
- **Approach:**
  1. Rewrite the existing "does not fire onClick when disabled" test and add the scenarios below. Run them and see them fail.
  2. In the cva base string, add `aria-disabled:pointer-events-none aria-disabled:opacity-50` next to the `disabled:` pair (KTD6, KTD7), and add the KTD9 ring classes to the base string and to the `destructive` variant. Keep `bg-clip-padding`; CI greps the built web CSS for it. Write the new classes as literal strings so the `web/` `@source` scan generates them.
  3. Take `disabled` and the five R5 handlers out of `props`. Build the last `mergeProps` argument by condition, per KTD4 and the guard matrix. While disabled it carries `aria-disabled: true` plus the KTD5 click and keydown `preventDefault` handlers. While enabled it carries the five handlers.
  4. Do not use `import.meta.env`; `web/` compiles this file under its own tsconfig.
- **Execution note:** Start with the failing tests. The old disabled test passed without testing the component, because a native disabled button never receives a click.
- **Patterns to follow:** `useButton.mjs` for the guard shape; `client/src/components/ui/Sidebar/Sidebar.tsx:469` for the two selector sets; `Button.test.tsx:58-66` for the `userEvent` keyboard idiom; `Tabs.test.tsx:67-69` for the attribute assertion.
- **Test scenarios:**
  - Covers AE1. A disabled Button has `aria-disabled="true"` and no `disabled` attribute; `user.tab()` gives it focus.
  - `ref.current.focus()` gives a disabled Button focus.
  - An enabled Button has no `aria-disabled` attribute (R3).
  - `disabled` with a spread `aria-disabled={false}` still renders `aria-disabled="true"`.
  - `aria-disabled` without `disabled`: the click still calls `onClick` (pins the pass-through assumption).
  - A click, Enter and Space on a disabled Button do not call `onClick`.
  - A consumer `onKeyDown` is not called for any key while disabled; `onFocus` is called.
  - Tab moves focus away from a disabled Button to the next control.
  - `rerender` from enabled to disabled and back keeps `toHaveFocus()` (R4).
  - Covers AE3. Space down while enabled, `rerender` with `disabled`, Space up: `onClick` is not called.
  - Covers AE2. Explicit `type="submit"` in a `<form onSubmit>` whose handler calls `preventDefault`: a click does not submit; Enter in a sibling input does not submit; the enabled control submits one time.
  - Covers AE5. Disabled as-link: `role=link` stays, no `disabled` attribute on the `<a>`, the click event has `defaultPrevented` true.
  - Covers AE4. `<DropdownMenuTrigger render={<Button disabled />}>` stays closed on click, Enter, Space and ArrowDown; the enabled control opens.
  - The cva output contains both the `disabled:` and the `aria-disabled:` classes (R10), and the KTD9 ring classes: the base class for `default`, the two destructive classes for `destructive`.
  - A disabled Button with `aria-describedby` keeps its accessible description (`toHaveAccessibleDescription`).
  - `<TooltipTrigger render={<Button disabled />}>` opens its tooltip when Tab gives the Button focus (pins the KTD7 claim; see Open Questions).
- **Verification:** the client unit suite, typecheck and lint pass; the existing enabled-state tests pass with no edits.

### U2. VR and a11y gates for the focusable disabled state

- **Goal:** CI proves Tab reach, the unchanged dim, and the accessible disabled state in a real browser.
- **Requirements:** R2, R9, R10.
- **Dependencies:** U1.
- **Files:**
  - `client/src/components/ui/Button/Button.vr.ts`
  - `client/src/components/ui/Button/Button.a11y.ts`
  - `client/src/components/ui/Button/Button.stories.tsx`
  - `client/src/components/ui/Button/Button.vr.ts-snapshots/button-disabled-light-focus-chromium-linux.png` (new)
  - `client/src/components/ui/Button/Button.vr.ts-snapshots/button-disabled-dark-focus-chromium-linux.png` (new)
  - `client/src/components/ui/InputGroup/InputGroup.vr.ts` (comment only)
- **Approach:**
  1. In `Button.vr.ts`, give the `disabled` story `['resting', 'focus']` and rewrite its comment: hover is still a no-op, keyboard focus now works.
  2. In `Button.a11y.ts`, keep `hoverStory: story !== 'disabled'`; Playwright `.hover()` fails its actionability check under `pointer-events-none`. Add one hand-written test for the `ui-button--disabled` story: `getByRole('button', { name: 'Button', disabled: true })` is visible. U1 already proves the attribute pair and the VR focus state already proves Tab reach, so the test asserts nothing more. `client/src/components/ui/Sonner/Sonner.a11y.ts` is the precedent for a hand-written test in an a11y file.
  3. Add a short comment on the `Disabled` story that states the contract. No new story, so `Button.story-ids.ts` does not change.
  4. Correct the one InputGroup comment that says the disabled button is skipped by Tab (`InputGroup.vr.ts:19`). The `Disabled` story comment in `InputGroup.stories.tsx` stays true and does not change.
  5. Start Docker, run `pnpm test:vr:docker` one time to write the two missing baselines, then run it again and see it pass.
  6. View the two new baselines: the ring on the disabled Button must look as strong as the ring in `button-default-{light,dark}-focus`. Resolve the Open Questions with a real-browser check. Put both outcomes in the unit's final report, so the calling pipeline can copy them into the PR body.
- **Test scenarios:**
  - VR `disabled` story, `focus` state, light and dark: Tab lands on `[data-slot="button"]` and the snapshot matches.
  - The a11y role query test passes in a real browser.
  - axe passes for `Button / disabled / light` and `Button / disabled / dark`.
  - `button-disabled-{light,dark}-resting`, all `pagination-*` and `input-group-disabled-*` baselines are unchanged.
- **Verification:** the first compare run fails on exactly the two missing files and writes them; the second run is green; `git status` shows exactly 2 new PNGs and 0 modified PNGs.

### U3. Decision registry entry and consumer note

- **Goal:** the new convention is recorded where the project keeps its decisions, and consumers can find the contract.
- **Requirements:** R8, R10. Records KTD1, KTD2, KTD6, KTD7, KTD9.
- **Dependencies:** U1, U2.
- **Files:**
  - `docs/decisions/decision-registry.md`
  - `client/README.md`
- **Approach:**
  1. Add a Change-log entry at the top, in the format of the entries at lines 15-43: `### 2026-09-18 — <title> (NH-304)`, what, why, the rejected options (per-consumer guards, native `disabled`, the Base UI Button primitive, a literal selector move), then the `**Status:**` line. Enforcement is machine-checked through the Button unit tests and the VR disabled-focus snapshots. The entry amends the NH-264 rule "buttons = `disabled:pointer-events-none disabled:opacity-50`" recorded at `docs/handoffs/2026-07-07-nh-264-base-ui-migration.md:57-58`, and cites that path. The handoff file itself does not change. Use underscore italics; the file is linted by markdownlint.
  2. Add a short "Disabled buttons" note to `client/README.md`: pass `disabled` as before; assert `aria-disabled` in unit tests because jest-dom `toBeDisabled()` reads the native attribute only; Playwright `toBeDisabled()` works; the known limits from Scope Boundaries. The note also says: `disabled` is the one API that turns the guard on, and `aria-disabled` alone styles the Button only. Button makes a disabled control discoverable but does not say why it is unavailable; the consumer gives the reason with `aria-describedby`, because the Tooltip sets no description and opens for keyboard focus only. With a Tooltip, put `disabled` on the Button inside `render`, not on `TooltipTrigger`, whose own `disabled` prop turns the tooltip off. For a control whose state a user can infer from a neighbour (Previous next to Next), use a native `<button disabled>` with `buttonVariants`, as Pagination does.
- **Test expectation:** none -- documentation only.
- **Verification:** markdownlint, cspell and the Prettier check pass for both files.

---

## Verification Contract

| Gate                    | Command                                                                                                 | Applies to | Done signal                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| Unit tests              | `pnpm --filter @notation-hero/client test`                                                              | U1         | all pass, new scenarios included                        |
| Typecheck, all packages | `pnpm run typecheck`                                                                                    | U1         | no errors; `web/` compiles the client source            |
| Lint                    | `pnpm run lint`                                                                                         | U1, U2     | zero warnings                                           |
| a11y (axe + role test)  | `pnpm --filter @notation-hero/client test:a11y` after killing any listener on port 6006                 | U2         | all pass                                                |
| VR compare              | `pnpm test:vr:docker` with Docker Desktop running                                                       | U2         | green on the second run; exactly 2 new PNGs, 0 modified |
| Full local gate         | `pnpm run check:all`                                                                                    | U1, U2, U3 | passes                                                  |
| CI                      | `ci-green` on the PR, which includes `vr`, `a11y`, `e2e`, the web `@source` sentinel and `pr-checklist` | all        | green                                                   |

Never pass `--no-verify`. Do not run `pnpm test:vr:docker:update`. If the two new files must be made again, delete them and run compare mode again, so the run still writes missing files only.

---

## Definition of Done

- R1 to R12 hold, and each Acceptance Example has a passing test.
- Every gate in the Verification Contract passes.
- The PR body lists the known limits, the two Open Question outcomes, the deviation from the ticket wording in KTD6, the focus-ring decision in KTD9, and the Assumptions for review.
- The decision-registry entry is in the same PR.
- No abandoned experiment code, debug output or unused import stays in the diff.
- The remote branch is not deleted after merge.
