import { runA11yStories } from '../../../a11y-helpers';
import { BADGE_STORY_IDS } from './Badge.story-ids';

// axe coverage for Badge — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Badge',
  storyPrefix: 'ui-badge',
  storyIds: BADGE_STORY_IDS,
  slotSelector: '[data-slot="badge"]',
});
