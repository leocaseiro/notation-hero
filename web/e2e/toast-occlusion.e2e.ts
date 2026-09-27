/**
 * A persistent error toast must never sit on top of a control.
 *
 * Nothing else in CI can see this. The a11y gate measures each control's own size and whether it
 * is inside the viewport; both stay perfectly valid for a button with a toast painted over it.
 * `document.elementFromPoint` is the only thing that answers "what would actually receive this
 * click", so that is what this asserts — at the three widths where the answer differed.
 *
 * It exists because the answer HAS differed, twice: at sonner's default bottom offset a single
 * error covered three transport controls, and at its default top offset it covered the entire
 * header on a phone. Both were found by hand. This runs the same measurement on every PR so a
 * change to the header or the transport row cannot quietly reintroduce it.
 */
import { test, expect, type Page } from '@playwright/test';

/** Raises a real, persistent E103 and waits for it to stop animating. */
async function raisePersistentError(page: Page) {
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'not-a-score.gp5',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('this is not a guitar pro file'),
  });
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /Error E103/ })
      .first(),
  ).toBeVisible({ timeout: 20_000 });
  // Resting state only. A toast caught mid-fade is still growing, so it is measured in the wrong
  // place and an occlusion could be missed.
  await page.waitForFunction(() => {
    const toast = document.querySelector('[data-sonner-toast]');
    return !!toast && globalThis.getComputedStyle(toast).opacity === '1';
  });
}

for (const width of [1280, 700, 375]) {
  test(`a persistent error toast covers no control at ${String(width)}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/play');
    await expect(page.getByTestId('open-file-input')).toBeAttached({ timeout: 60_000 });
    await raisePersistentError(page);

    const result = await page.evaluate(() => {
      const toaster = document.querySelector('[data-sonner-toaster]');
      if (!toaster) return { painted: 0, controls: 0, blocked: ['NO TOASTER IN THE DOM'] };

      // A dismissed toast lingers with data-removed="true"; counting it would count a toast
      // nobody can see, and the empty `blocked` list below would then mean nothing.
      const painted = [...document.querySelectorAll<HTMLElement>('[data-sonner-toast]')].filter(
        (toast) => toast.dataset.removed !== 'true',
      ).length;

      // Typed as HTMLElement so `dataset` resolves: the lint rule rewrites getAttribute into
      // dataset, which does not exist on the bare Element that querySelectorAll returns.
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          'button, [role="button"], [role="slider"], input, select, textarea, a[href]',
        ),
      ].filter((el) => {
        if (toaster.contains(el)) return false;
        const rect = el.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top < globalThis.innerHeight &&
          rect.bottom > 0 &&
          rect.left < globalThis.innerWidth &&
          rect.right > 0
        );
      });

      const blocked: string[] = [];
      for (const el of controls) {
        const rect = el.getBoundingClientRect();
        const x = Math.min(Math.max(rect.left + rect.width / 2, 1), globalThis.innerWidth - 1);
        const y = Math.min(Math.max(rect.top + rect.height / 2, 1), globalThis.innerHeight - 1);
        const hit = document.elementFromPoint(x, y);
        if (hit && toaster.contains(hit)) {
          blocked.push(el.dataset.testid ?? el.getAttribute('aria-label') ?? el.tagName);
        }
      }
      return { painted, controls: controls.length, blocked };
    });

    // Prove the measurement actually ran before trusting an empty `blocked` list: with no toast
    // on screen, or no controls found, "nothing is covered" is vacuously true and guards nothing.
    expect(result.painted).toBeGreaterThan(0);
    expect(result.controls).toBeGreaterThan(0);
    expect(result.blocked).toEqual([]);
  });
}
