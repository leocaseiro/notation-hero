import { runVrStories } from '../../../vr-helpers';
import { FACET_FILTER_STORY_IDS } from './FacetFilter.story-ids';

// VR for FacetFilter. The open stories render the combobox open (defaultOpen), so capture the padded
// union of the trigger chip + the portalled panel (Base UI portals it into #storybook-root). The
// closed 'default' story has no panel — its clip is just the trigger, and it also guards the
// trigger's hover + focus-visible states (a single Tab reaches the trigger).
runVrStories({
  name: 'FacetFilter',
  storyPrefix: 'ui-facetfilter',
  snapshotSlug: 'facetfilter',
  storyIds: FACET_FILTER_STORY_IDS,
  slotSelector: '[data-slot="facet-filter"]',
  captureSelectors: ['[data-slot="facet-filter"]', '[data-slot="facet-filter-content"]'],
  states: ['resting'],
  hoverSelector: '[data-slot="facet-filter"]',
  focusExpect: '[data-slot="facet-filter"]',
  statesForStory: (story) => (story === 'default' ? ['resting', 'hover', 'focus'] : ['resting']),
});
