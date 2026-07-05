import { runVrStories } from '../../../vr-helpers';
import { SEARCH_INPUT_STORY_IDS } from './SearchInput.story-ids';

// VR for SearchInput — every story in light + dark, plus a focus snapshot (the focus-within ring)
// on the non-disabled stories. Focus targets the inner input.
runVrStories({
  name: 'SearchInput',
  storyPrefix: 'ui-searchinput',
  filePrefix: 'searchinput',
  storyIds: SEARCH_INPUT_STORY_IDS,
  slotSelector: '[data-slot="search-input"]',
  states: ['resting', 'focus'],
  focusSelector: '[data-slot="search-input"] input',
  stateStory: (story, state) => state === 'resting' || story !== 'disabled',
});
