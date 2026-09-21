import { runA11yStories } from '../../../a11y-helpers';
import { PROGRESS_STORY_IDS } from './Progress.story-ids';

// axe coverage for Progress — every story x {light,dark}. A progress bar has no hover state.
runA11yStories({
  name: 'Progress',
  storyPrefix: 'ui-progress',
  storyIds: PROGRESS_STORY_IDS,
  slotSelector: '[data-slot="progress"]',
  hoverStory: () => false,
});
