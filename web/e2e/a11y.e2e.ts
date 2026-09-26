import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Same WCAG tag set the client/ suite runs, so one repo has one bar.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    // Base UI renders focus-guard sentinels around every open popup — the standard focus-trap
    // technique. axe flags them as aria-hidden-focus because it cannot tell a deliberate sentinel
    // from a mistake; exclude exactly that selector so the rule stays live for real content.
    .exclude('[data-base-ui-focus-guard]')
    .withTags(TAGS)
    .analyze();

  const report = violations
    .map(
      (v) =>
        `[${v.id}] ${v.help}\n` +
        v.nodes.map((n) => `    ${n.failureSummary?.replaceAll(/\s+/g, ' ').trim()}`).join('\n'),
    )
    .join('\n');

  expect(violations, `${label}\n${report}`).toEqual([]);
}

// axe cannot catch this: the tag set above is wcag2a/2aa/21a/21aa, none of which carries a
// target-size rule. For the record on the bar — WCAG 2.5.8 AA asks only 24x24 CSS px; 44 px is
// 2.5.5 AAA and the platform HIG, and it is what this player's own constraints demand. The
// stricter rule is enforced here deliberately, and in the lane rather than by eye, so a later
// control cannot quietly shrink below it.
async function expectHitAreas(page: Page, label: string): Promise<void> {
  const tooSmall = await page.evaluate(() =>
    [
      // The last selector is the seek rail. A Base UI slider's 44 px pointer target is neither a
      // button nor a link: the nested input[type="range"] is sized to its 16 px thumb by design
      // and can never pass, while the element that actually takes the click is the slider's
      // Control. Found by its own data-slot, NOT by `[class*="h-11"]`: keying the gate to the
      // Tailwind class it is measuring means rewriting that class in any equivalent way
      // (min-h-11, h-[44px], padding) makes the selector match nothing and the gate pass
      // silently over whatever the rail became.
      ...document.querySelectorAll(
        'button, a[href], label[for], [role="button"], [data-slot="slider-control"]',
      ),
    ]
      .filter((el) => {
        // Skip controls that are not rendered at all: `display:none` generates no box, so
        // getClientRects() is empty. A control that IS laid out but collapsed to 0 px in either
        // dimension is NOT skipped — a seek rail painted 0 px wide cannot be clicked at all, and
        // the old `r.width > 0 && r.height > 0` guard let exactly that worst case through while
        // still failing a milder 1 px one.
        if (el.getClientRects().length === 0) return false;
        const r = el.getBoundingClientRect();
        // A control clipped OUTSIDE the viewport still reports its full layout box here —
        // getBoundingClientRect ignores an ancestor's overflow:hidden — so a toggle pushed off the
        // screen by the shell would pass the size check below. Fail it on position too: anything
        // past an edge (0.5px tolerance for sub-pixel rounding) cannot be reached by a pointer.
        if (
          r.right > globalThis.innerWidth + 0.5 ||
          r.left < -0.5 ||
          r.bottom > globalThis.innerHeight + 0.5 ||
          r.top < -0.5
        ) {
          return true;
        }
        return r.width < 44 || r.height < 44;
      })
      .map((el) => ({
        id: (el as HTMLElement).dataset.testid ?? el.textContent?.trim().slice(0, 24) ?? '?',
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      })),
  );
  expect(tooSmall, `${label}: controls under the 44px minimum`).toEqual([]);
}

// A toast that is still fading in is sampled by axe at PARTIAL OPACITY, and axe folds that into
// its effective-contrast maths: measured 2.88:1 for a success toast caught at opacity 0.64, from
// exactly the same text and surface colours that pass at rest. Wait for the animation to settle so
// the gate measures the rendered UI rather than a transitional frame. (The toast's resting state
// is gated too, by client/'s own Sonner stories.)
async function settleToasts(page: Page): Promise<void> {
  // Every toast, not just the front one. Sonner PREPENDS, so `.first()` is the newest — settling
  // it says nothing about the ones behind, and those are the ones still transitioning. Polling to
  // '1' is also wrong for a background or dismissed card: its resting opacity is legitimately 0,
  // so waiting for 1 would time out on a page that is perfectly settled.
  const toasts = page.locator('[data-sonner-toast]');
  if ((await toasts.count()) === 0) return;
  await expect
    .poll(
      () =>
        toasts.evaluateAll((nodes) => {
          const painted = nodes.flatMap((node) => [node, ...node.children]);
          const opacities = painted.map((el) => globalThis.getComputedStyle(el).opacity);
          return opacities.every((opacity) => opacity === '1' || opacity === '0');
        }),
      { timeout: 5000 },
    )
    .toBe(true);
}

test('landing page has no axe violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
  await expectNoViolations(page, 'landing');
  await expectHitAreas(page, 'landing');
});

// There is no empty state to audit: the page opens on the bundled beat, so this is the
// state a first-time visitor actually meets.
test('player has no axe violations on the score it opens with', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  await expectNoViolations(page, 'play / bundled beat');
  await expectHitAreas(page, 'play / bundled beat');
});

// The sample renders 185 px tall and never scrolls; Punk.gp's two drum tracks render 1,026 px at
// this lane's width, so the 420 px notation box scrolls. Without this case axe's
// scrollable-region-focusable rule never meets a scrolling surface, and dropping the host's
// tabIndex would pass the gate.
test('player has no axe violations with a score long enough to scroll', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  const surface = page.getByTestId('notation-surface');
  await expect(surface.locator('svg').first()).toBeVisible({ timeout: 30_000 });
  // Prove the state this case exists for: the box really scrolls.
  await expect
    .poll(() => surface.evaluate((el) => el.scrollHeight > el.clientHeight), { timeout: 30_000 })
    .toBe(true);
  await settleToasts(page);
  await expectNoViolations(page, 'play / scrolling score');
  await expectHitAreas(page, 'play / scrolling score');
});

// The first-visit Skeleton is reachable because the engine import is a real request the lane can
// stall — this is exactly why that state is auditable here and the replacement loading toast is
// not.
test('player has no axe violations while the first-visit Skeleton is up', async ({ page }) => {
  await page.route('**/alphatab/esm/alphaTab.mjs', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.continue();
  });

  await page.goto('/play');
  // NotationSurface is mounted from the first paint, and the stalled import keeps `engine` null,
  // so the Skeleton is up on a bare /play — no interaction needed to reach this state.
  await expect(page.getByTestId('notation-skeleton')).toBeVisible();
  await expectNoViolations(page, 'play / skeleton');
  await expectHitAreas(page, 'play / skeleton');
});

// The engine-error state is reachable and permanent — abort the engine module the way the case
// above stalls it. Its `role="alert"` sits on the one player surface no gate has measured: a
// color-mix(in oklab, …) destructive tint.
test('player has no axe violations when the engine fails to load', async ({ page }) => {
  await page.route('**/alphatab/esm/alphaTab.mjs', (route) => route.abort());
  await page.goto('/play');
  await expect(page.getByTestId('engine-error')).toBeVisible({ timeout: 15_000 });
  await expectNoViolations(page, 'play / engine error');
  await expectHitAreas(page, 'play / engine error');
});

// A toggle's pressed styling is where contrast usually breaks, and the transport did not exist
// when the cases above were written.
test('player has no axe violations with every transport toggle pressed', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('toggle-loop').click();
  await page.getByTestId('toggle-metronome').click();
  await page.getByTestId('toggle-countin').click();
  await page.getByRole('button', { name: 'Increase tempo' }).click();

  // The same trap settleToasts() exists for: the percentage FADES in, and axe folds partial
  // opacity into its contrast maths — measured 1.28:1 (#d2e7e6 on white) from a teal that passes
  // at rest. Wait for the fade to finish so the gate measures the rendered UI, not a tween.
  await expect
    .poll(() =>
      page.getByTestId('tempo-percent').evaluate((el) => globalThis.getComputedStyle(el).opacity),
    )
    .toBe('1');

  await expectNoViolations(page, 'play / transport pressed');
  await expectHitAreas(page, 'play / transport pressed');
});

// Every other case here runs at the config's 1280px, so this is the one case that exercises the
// transport-row shrink fix (min-w-0 on the flex column). At ~700px the row could not shrink below
// its content before that fix, and the metronome and count-in toggles were clipped off-screen. The
// containment check in expectHitAreas above is what lets this fail on a control pushed past the
// viewport edge rather than one merely painted small. Pinned at 700px, the width the regression was
// reported at; narrower phone-portrait widths are a known gap tracked in NH-321.
test('every transport control stays on-screen in a narrow 700px window', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 });
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  // The two controls the shrink bug hid first — assert they are fully in the viewport by name,
  // then run the full hit-area gate (size + the new containment check) over every control.
  await expect(page.getByTestId('toggle-metronome')).toBeInViewport();
  await expect(page.getByTestId('toggle-countin')).toBeInViewport();
  await expectHitAreas(page, 'play / narrow 700px');
});
