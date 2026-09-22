import { runA11yStories } from '../../../a11y-helpers';
import { SKELETON_STORY_IDS } from './Skeleton.story-ids';

// axe coverage for Skeleton — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Skeleton',
  storyPrefix: 'ui-skeleton',
  storyIds: SKELETON_STORY_IDS,
  slotSelector: '[data-slot^="skeleton"]',
});
