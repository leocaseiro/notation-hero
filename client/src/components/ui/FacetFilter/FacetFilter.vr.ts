import { runVrStories } from '../../../vr-helpers';
import { FACET_FILTER_STORY_IDS } from './FacetFilter.story-ids';

// VR for FacetFilter. Snapshot the whole canvas (#storybook-root) so the open popover panel is
// captured; wait for the always-present trigger first. Hover/focus states apply to the closed
// 'default' story (the trigger chip); the open stories are captured resting.
runVrStories({
  name: 'FacetFilter',
  storyPrefix: 'ui-facetfilter',
  filePrefix: 'facetfilter',
  storyIds: FACET_FILTER_STORY_IDS,
  slotSelector: '#storybook-root',
  readySelector: '[data-slot="facet-filter"]',
  states: ['resting', 'hover', 'focus'],
  hoverSelector: '[data-slot="facet-filter"]',
  focusSelector: '[data-slot="facet-filter"]',
  stateStory: (story, state) => state === 'resting' || story === 'default',
});
