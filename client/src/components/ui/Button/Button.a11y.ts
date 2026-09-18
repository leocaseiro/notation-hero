import { expect, test } from '@playwright/test';

import { runA11yStories } from '../../../a11y-helpers';
import { BUTTON_STORY_IDS } from './Button.story-ids';

// axe coverage for Button — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Button',
  storyPrefix: 'ui-button',
  storyIds: BUTTON_STORY_IDS,
  slotSelector: '[data-slot="button"]',
  iconFontStory: (story) => story.includes('icon'),
  // The disabled button keeps pointer-events-none, so Playwright's hover() would fail its
  // actionability check — skip the hover pass for it.
  hoverStory: (story) => story !== 'disabled',
});

// NH-304: the nearest machine check to "announces as unavailable". Playwright's `disabled` role
// filter honours aria-disabled, so this finds the button by its accessible name AND its disabled
// state. Button.test.tsx proves the attribute pair; the VR focus state proves Tab reach.
test('Button / disabled / exposed as a disabled button by role', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-button--disabled&viewMode=story');
  await expect(page.getByRole('button', { name: 'Button', disabled: true })).toBeVisible();
});
