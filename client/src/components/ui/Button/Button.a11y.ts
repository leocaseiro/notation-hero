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
  hoverStory: (story) => story !== 'disabled',
});
