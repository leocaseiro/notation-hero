import { runA11yStories } from '../../../a11y-helpers';
import { SCRUBBER_STORY_IDS } from './Scrubber.story-ids';

// axe coverage for Scrubber — every story x {light,dark} x {resting,hover}. Skip hover on the
// empty story (the bar is disabled, so the thumb is inert).
runA11yStories({
  name: 'Scrubber',
  storyPrefix: 'ui-scrubber',
  storyIds: SCRUBBER_STORY_IDS,
  slotSelector: '[data-slot="scrubber"]',
  hoverStory: (story) => story !== 'empty',
});
