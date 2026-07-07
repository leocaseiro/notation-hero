import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;

// The interactive states a component can be snapshotted in. `resting` is the settled
// default; `hover`/`focus` drive the pointer/keyboard states so their tokens (hover fills,
// focus-visible rings) are pixel-guarded too. `open` forces an overlay (tooltip/menu/sheet)
// open via a Storybook control (URL `args`), so the story stays interactive+closed for humans
// while VR still captures the open panel deterministically — no hover/click timing to flake.
export type VrState = 'resting' | 'hover' | 'focus' | 'open';

// Padding (CSS px) added around the captured region. Focus-visible rings and UA outlines
// render OUTSIDE an element's border box, so a tight element screenshot clips them — capture a
// padded region of the page instead, so the whole ring/shadow is in frame.
const CAPTURE_PADDING = 12;

const ICON_FONT = '1rem "Material Symbols Outlined Variable"';

export interface VrStoriesConfig {
  /** Component label for the test title: `${name} / ${story} / ${theme} / ${state}`. */
  name: string;
  /** Storybook iframe id prefix, e.g. 'ui-breadcrumb'. */
  storyPrefix: string;
  /** Snapshot filename slug: `${snapshotSlug}-${story}-${theme}-${state}.png`. */
  snapshotSlug: string;
  /** Shared story-id list (lockstep with a11y + the component's *.stories.tsx). */
  storyIds: readonly string[];
  /** CSS selector for the component root, e.g. '[data-slot="breadcrumb"]'. Used to wait for
   *  render and, by default, as the capture region. */
  slotSelector: string;
  /**
   * States to capture per story, in BOTH themes. Defaults to `['resting']`. Interactive
   * components pass `['resting', 'hover', 'focus']` so every state is pixel-guarded.
   */
  states?: readonly VrState[];
  /**
   * Selectors whose union bounding box (plus padding) is captured. Defaults to
   * `[slotSelector]`. Pass extra selectors for portalled content Radix renders outside the
   * slot (e.g. a tooltip trigger + its portalled panel) so both are framed WITHOUT snapshotting
   * the whole viewport. Missing selectors are skipped.
   */
  captureSelectors?: readonly string[];
  /**
   * Per-story override of `states` — return the states to capture for a given story. Use when one
   * story's element can't reach a state (e.g. a disabled input can't be Tab-focused). Falls back to
   * `states` when omitted.
   */
  statesForStory?: (story: string) => readonly VrState[];
  /** Element to hover for the `hover` state; defaults to the slot's first match. */
  hoverSelector?: string;
  /**
   * Number of Tab presses to reach the element under test for the `focus` state. Driving focus
   * with the keyboard (not `.focus()`) is what makes `:focus-visible` match, so the ring
   * actually renders. Stories put the target first, so the default of 1 reaches it.
   */
  focusTabs?: number;
  /**
   * Selector the `focus` state expects to be focused after the Tab press(es). Asserted with
   * `toBeFocused()` BEFORE the snapshot, so a Storybook/tab-order change that lands focus on the
   * wrong element fails loudly at generation time instead of silently re-baselining a
   * wrong-element ring. Defaults to `slotSelector`.
   */
  focusExpect?: string;
  /**
   * Stories that render a Material Symbols glyph — asserts the icon font FAMILY loaded for these
   * (via `document.fonts.check`) so a wholesale font-load failure is caught. Note: this checks
   * family availability, not per-glyph coverage; the pixel snapshot is the real guard against a
   * ligature falling back to literal text. Defaults to none.
   */
  iconFontStory?: (story: string) => boolean;
  /**
   * Storybook `args` expression appended to the URL for the `open` state, so a controlled
   * overlay opens deterministically (e.g. `'open:!true'`, or `'value:file'` for a Menubar whose
   * open menu is a `value`). Booleans use Storybook's `!true`/`!false` encoding; separate multiple
   * with `;`. Pass a `(story) => string` when stories open different things (e.g. a Menubar whose
   * stories each open a different menu). Defaults to `'open:!true'`.
   */
  openArgs?: string | ((story: string) => string);
  /**
   * Selector to wait for in the `open` state before capturing — the portalled panel that only
   * exists once open (e.g. `[data-slot="dropdown-menu-content"]`). Defaults to the LAST
   * `captureSelectors` entry (conventionally the panel).
   */
  openWaitSelector?: string;
}

// Union bounding box of the given selectors (first match each), expanded by `pad` and clamped to
// the viewport, as a Playwright screenshot clip rect. Returns null if none are present.
async function paddedClip(
  page: Page,
  selectors: readonly string[],
  pad: number,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const boxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    const box = await locator.boundingBox();
    if (box) boxes.push(box);
  }
  if (boxes.length === 0) return null;
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  // Raw (unpadded) union of the captured elements. If the CONTENT itself spills outside the
  // viewport, the clamp below would silently crop it and bless a truncated baseline — so fail
  // loudly instead (e.g. a popover Radix flipped off-screen, or a story grown too large).
  const rawMinX = Math.min(...boxes.map((b) => b.x));
  const rawMinY = Math.min(...boxes.map((b) => b.y));
  const rawMaxX = Math.max(...boxes.map((b) => b.x + b.width));
  const rawMaxY = Math.max(...boxes.map((b) => b.y + b.height));
  if (rawMinX < 0 || rawMinY < 0 || rawMaxX > viewport.width || rawMaxY > viewport.height) {
    throw new Error(
      `VR capture region [${Math.round(rawMinX)},${Math.round(rawMinY)} -> ${Math.round(rawMaxX)},${Math.round(rawMaxY)}] ` +
        `exceeds the ${viewport.width}x${viewport.height} viewport — the snapshot would be truncated. ` +
        `Reposition the story or shrink its content.`,
    );
  }
  const minX = Math.max(0, rawMinX - pad);
  const minY = Math.max(0, rawMinY - pad);
  const maxX = Math.min(viewport.width, rawMaxX + pad);
  const maxY = Math.min(viewport.height, rawMaxY + pad);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Generate the full-state VR suite for a component: one screenshot per story x {light, dark} x
// each requested state (resting/hover/focus). Story IDs come from the shared *.story-ids list so
// VR and a11y stay in lockstep with the *.stories.tsx file. Theme is driven via Storybook's
// `globals` query param -> the preview decorator's `.dark` class, so the snapshot captures the
// real themed colors. Each snapshot is a padded clip of the captured elements (see paddedClip)
// so focus rings and portalled panels are framed without whole-viewport brittleness.
export function runVrStories({
  name,
  storyPrefix,
  snapshotSlug,
  storyIds,
  slotSelector,
  states = ['resting'],
  statesForStory,
  captureSelectors,
  hoverSelector,
  focusTabs = 1,
  focusExpect,
  iconFontStory = () => false,
  openArgs = 'open:!true',
  openWaitSelector,
}: Readonly<VrStoriesConfig>): void {
  const regionSelectors = captureSelectors ?? [slotSelector];
  // The panel to wait for in the `open` state (only present once the overlay opens). Defaults to
  // the last capture selector, which is conventionally the portalled panel.
  const openWait = openWaitSelector ?? regionSelectors.at(-1) ?? slotSelector;
  for (const theme of THEMES) {
    for (const story of storyIds) {
      const resolvedStates = statesForStory ? statesForStory(story) : states;
      if (resolvedStates.length === 0) {
        // Fail loudly at collection time: an empty return would register ZERO tests for this
        // story and pass silently (unguarded pixels, false-green). Remove it from storyIds instead.
        throw new Error(
          `runVrStories: statesForStory('${story}') returned no states — remove the story from storyIds instead of returning [].`,
        );
      }
      for (const state of resolvedStates) {
        test(`${name} / ${story} / ${theme} / ${state}`, async ({ page }) => {
          // `open` forces the controlled overlay open via a Storybook arg (same URL mechanism as
          // the theme global); every other state renders the story at its interactive default.
          const resolvedOpenArgs = typeof openArgs === 'function' ? openArgs(story) : openArgs;
          const argsParam = state === 'open' ? `&args=${resolvedOpenArgs}` : '';
          await page.goto(
            `/iframe.html?id=${storyPrefix}--${story}&viewMode=story&globals=theme:${theme}${argsParam}`,
          );
          await page.locator('#storybook-root').waitFor();
          await page.locator(slotSelector).first().waitFor();
          if (theme === 'dark') {
            await page.locator('html.dark').waitFor();
          }
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
          if (iconFontStory(story)) {
            const iconFontLoaded = await page.evaluate(
              (font) => document.fonts.check(font),
              ICON_FONT,
            );
            expect(iconFontLoaded, 'Material Symbols font family failed to load').toBe(true);
          }
          // Freeze transitions/animations so hover/focus/open states snapshot a settled frame,
          // not a mid-`transition-all` tween (which would flake the pixel compare).
          await page.addStyleTag({
            content:
              '*, *::before, *::after { transition: none !important; animation: none !important; }',
          });

          switch (state) {
            case 'hover': {
              await page
                .locator(hoverSelector ?? slotSelector)
                .first()
                .hover();

              break;
            }
            case 'focus': {
              // Keyboard modality (Tab), not `.focus()`, so `:focus-visible` matches and the ring renders.
              for (let i = 0; i < focusTabs; i += 1) {
                await page.keyboard.press('Tab');
              }
              // Fail loudly if focus landed on the wrong element (tab-order drift) rather than
              // silently blessing a wrong-element ring when baselines are regenerated.
              await expect(page.locator(focusExpect ?? slotSelector).first()).toBeFocused();

              break;
            }
            case 'open': {
              // The `args` in the URL opened the overlay; wait for the portalled panel to mount
              // before capturing, so the clip frames it (not just the still-visible trigger).
              await page.locator(openWait).first().waitFor();

              break;
            }
            // No default
          }

          const clip = await paddedClip(page, regionSelectors, CAPTURE_PADDING);
          if (!clip) {
            throw new Error(`no capture region found for ${regionSelectors.join(', ')}`);
          }
          await expect(page).toHaveScreenshot(`${snapshotSlug}-${story}-${theme}-${state}.png`, {
            clip,
          });
        });
      }
    }
  }
}
