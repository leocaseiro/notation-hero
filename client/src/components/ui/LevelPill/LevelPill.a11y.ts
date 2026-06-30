import { runA11yStories } from '../../../a11y-helpers';
import { LEVEL_PILL_STORY_IDS } from './LevelPill.story-ids';

// axe coverage for LevelPill — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'LevelPill',
  storyPrefix: 'ui-levelpill',
  storyIds: LEVEL_PILL_STORY_IDS,
  slotSelector: '[data-slot="level-pill"]',
});
