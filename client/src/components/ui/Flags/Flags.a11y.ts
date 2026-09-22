import { runA11yStories } from '../../../a11y-helpers';
import { FLAGS_STORY_IDS } from './Flags.story-ids';

// axe coverage for Flags — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Flags',
  storyPrefix: 'ui-flags',
  storyIds: FLAGS_STORY_IDS,
  slotSelector: '[data-slot="flags"]',
  iconFontStory: () => true,
});
