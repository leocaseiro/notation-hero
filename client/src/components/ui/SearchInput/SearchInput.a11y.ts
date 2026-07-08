import { runA11yStories } from '../../../a11y-helpers';
import { SEARCH_INPUT_STORY_IDS } from './SearchInput.story-ids';

// axe coverage for SearchInput — every story x {light,dark} x {resting,hover}. Skip hover on the
// disabled story (no interactive affordance to hover).
runA11yStories({
  name: 'SearchInput',
  storyPrefix: 'ui-searchinput',
  storyIds: SEARCH_INPUT_STORY_IDS,
  slotSelector: '[data-slot="search-input"]',
  iconFontStory: () => true,
  hoverStory: (story) => story !== 'disabled',
});
