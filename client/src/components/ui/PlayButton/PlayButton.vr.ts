import { expect, test } from '@playwright/test';

import { PLAY_BUTTON_STORY_IDS } from './PlayButton.story-ids';

// One visual snapshot per PlayButton story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared PlayButton.story-ids list, so VR
// and a11y stay in lockstep with PlayButton.stories.tsx. PlayButton renders a Button,
// so the target slot is `button`.
for (const story of PLAY_BUTTON_STORY_IDS) {
  test(`PlayButton / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-playbutton--${story}&viewMode=story`);
    const target = page.locator('[data-slot="button"]').first();
    await target.waitFor();
    // Wait for web fonts so the play_circle glyph renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`play-button-${story}.png`);
  });
}
