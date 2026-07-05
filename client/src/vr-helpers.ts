import { expect, test } from '@playwright/test';

// Visual-regression companion to a11y-helpers.ts. Each new catalog filter component snapshots
// every story in BOTH themes (light + dark) and, where it changes the pixels, in hover / focus
// states — the coverage asked for on this work. Existing components keep their own inline
// *.vr.ts; this helper is opt-in for the components that need the fuller matrix. Theme is driven
// via Storybook's `globals` query param -> the preview decorator's `.dark` class, so the snapshot
// captures the real rendered colors (same mechanism as runA11yStories).
const THEMES = ['light', 'dark'] as const;

export type VrState = 'resting' | 'hover' | 'focus';

export interface VrStoriesConfig {
  /** Component label for the test title: `${name} / ${story} / ${theme}`. */
  name: string;
  /** Storybook iframe id prefix, e.g. 'ui-searchinput'. */
  storyPrefix: string;
  /** Snapshot filename prefix, e.g. 'searchinput'. */
  filePrefix: string;
  /** Shared story-id list (lockstep with a11y + the component's *.stories.tsx). */
  storyIds: readonly string[];
  /** CSS selector for the component root to snapshot. */
  slotSelector: string;
  /** Interaction states to capture per story. Defaults to ['resting']. */
  states?: readonly VrState[];
  /** Element to focus for the 'focus' state; defaults to slotSelector. */
  focusSelector?: string;
  /** Element to hover for the 'hover' state; defaults to slotSelector. */
  hoverSelector?: string;
  /** Gate a (story, state) pair out — e.g. skip focus on a disabled story. Defaults to all. */
  stateStory?: (story: string, state: VrState) => boolean;
}

const RESET_TRANSITIONS =
  '*, *::before, *::after { transition: none !important; animation: none !important; }';

// Generate the VR suite for a component: one snapshot per story x {light, dark} x each requested
// state. Story IDs come from the shared *.story-ids list so VR and a11y stay in lockstep.
export function runVrStories({
  name,
  storyPrefix,
  filePrefix,
  storyIds,
  slotSelector,
  states = ['resting'],
  focusSelector,
  hoverSelector,
  stateStory = () => true,
}: Readonly<VrStoriesConfig>): void {
  for (const theme of THEMES) {
    for (const story of storyIds) {
      test(`${name} / ${story} / ${theme}`, async ({ page }) => {
        await page.goto(
          `/iframe.html?id=${storyPrefix}--${story}&viewMode=story&globals=theme:${theme}`,
        );
        const target = page.locator(slotSelector).first();
        await target.waitFor();
        if (theme === 'dark') {
          await page.locator('html.dark').waitFor();
        }
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await page.addStyleTag({ content: RESET_TRANSITIONS });

        for (const state of states) {
          if (!stateStory(story, state)) {
            continue;
          }
          // Reset the previous interaction so states don't leak into the next snapshot.
          await page.mouse.move(0, 0);
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
          if (state === 'hover') {
            await page
              .locator(hoverSelector ?? slotSelector)
              .first()
              .hover();
          }
          if (state === 'focus') {
            await page
              .locator(focusSelector ?? slotSelector)
              .first()
              .focus();
          }
          const suffix = state === 'resting' ? '' : `-${state}`;
          await expect(target).toHaveScreenshot(`${filePrefix}-${story}-${theme}${suffix}.png`);
        }
      });
    }
  }
}
