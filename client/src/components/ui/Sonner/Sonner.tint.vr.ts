import { expect, test } from '@playwright/test';

import { SONNER_STORY_IDS } from './Sonner.story-ids';

// Guards the STATUS TINT HUE that the VR *screenshots* cannot see. Each status toast tints its
// token 10% over `--popover` (see Sonner.tsx). At 10% the pink `in oklch` bug (RGB ~246,236,237)
// vs the green `in oklab` fix (RGB ~233,241,237) differ by less than Playwright's default
// screenshot threshold, so `toHaveScreenshot` passes either way — a status-colour regression would
// slip through Sonner.vr.ts. This asserts the *computed* colour instead: deterministic and
// OS-independent (no pixels), so reverting `in oklab` → `in oklch` (whose cylindrical hue
// interpolation drags the mix toward `--popover`'s hue) fails CI.
//
// Runs in the `chromium` project (testMatch **/*.vr.{ts,tsx}); it is assertion-based, so it
// creates no baseline snapshot.

const STATUS = [
  { story: 'success', token: '--success' },
  { story: 'warning', token: '--warning' },
  { story: 'error-toast', token: '--destructive' },
] as const;

const THEMES = ['light', 'dark'] as const;

// Fail loudly if a story id is renamed out from under this guard (keeps it in lockstep with the
// shared story list, same discipline as Sonner.vr.ts).
for (const { story } of STATUS) {
  if (!SONNER_STORY_IDS.includes(story)) {
    throw new Error(
      `Sonner.tint.vr: unknown story id '${story}' — update STATUS to match Sonner.story-ids.`,
    );
  }
}

for (const { story, token } of STATUS) {
  for (const theme of THEMES) {
    test(`Sonner tint / ${story} / ${theme} is the oklab mix, not oklch`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ui-sonner--${story}&viewMode=story&globals=theme:${theme}`);
      await page.locator('#storybook-root').waitFor();
      const toast = page.locator('[data-sonner-toast]').first();
      await toast.waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }

      // Resolve both candidate mixes in the SAME document (identical --popover/token values) via a
      // throwaway probe, then compare the toast's real background against them. Same-browser
      // serialisation makes the strings directly comparable.
      const { rendered, oklab, oklch } = await toast.evaluate((el, tok) => {
        const mix = (space: string) => {
          const probe = document.createElement('div');
          probe.style.backgroundColor = `color-mix(in ${space}, var(${tok}) 10%, var(--popover))`;
          document.body.append(probe);
          const value = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return value;
        };
        return {
          rendered: getComputedStyle(el).backgroundColor,
          oklab: mix('oklab'),
          oklch: mix('oklch'),
        };
      }, token);

      expect(rendered, `${story} tint should equal the oklab mix of ${token} over --popover`).toBe(
        oklab,
      );
      expect(
        rendered,
        `${story} tint must NOT be the oklch mix (its hue drifts toward --popover)`,
      ).not.toBe(oklch);
    });
  }
}
