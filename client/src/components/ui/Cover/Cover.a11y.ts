import { runA11yStories } from '../../../a11y-helpers';
import { COVER_STORY_IDS } from './Cover.story-ids';

// axe coverage for Cover — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Cover',
  storyPrefix: 'ui-cover',
  storyIds: COVER_STORY_IDS,
  slotSelector: '[data-slot="cover"]',
  iconFontStory: () => true,
});
