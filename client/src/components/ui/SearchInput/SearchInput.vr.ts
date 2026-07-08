import { runVrStories } from '../../../vr-helpers';
import { SEARCH_INPUT_STORY_IDS } from './SearchInput.story-ids';

// VR for SearchInput — every story in light + dark, plus a focus snapshot (the focus-within ring)
// on the non-disabled stories. Focus tabs to the inner input (the first focusable element, so the
// default single Tab reaches it).
runVrStories({
  name: 'SearchInput',
  storyPrefix: 'ui-searchinput',
  snapshotSlug: 'searchinput',
  storyIds: SEARCH_INPUT_STORY_IDS,
  slotSelector: '[data-slot="search-input"]',
  states: ['resting', 'focus'],
  focusExpect: '[data-slot="search-input"] input',
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus']),
});
