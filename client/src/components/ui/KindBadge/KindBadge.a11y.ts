import { runA11yStories } from '../../../a11y-helpers';
import { KIND_BADGE_STORY_IDS } from './KindBadge.story-ids';

// axe coverage for KindBadge — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'KindBadge',
  storyPrefix: 'ui-kindbadge',
  storyIds: KIND_BADGE_STORY_IDS,
  slotSelector: '[data-slot="kind-badge"]',
});
