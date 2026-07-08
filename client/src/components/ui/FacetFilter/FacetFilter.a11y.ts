import { runA11yStories } from '../../../a11y-helpers';
import { FACET_FILTER_STORY_IDS } from './FacetFilter.story-ids';

// axe coverage for FacetFilter — every INTERACTIVE story x {light,dark} x {resting,hover}. The open
// stories render the Base UI Combobox inline, so axe also checks the search box, the option list
// and Clear. The transient `loading` / `empty` states are excluded: the input keeps role=combobox +
// aria-controls even when the listbox is momentarily empty, which can trip axe's combobox-empty
// check (not our markup). Those states are plain-text status and stay covered by VR.
const A11Y_STORY_IDS = FACET_FILTER_STORY_IDS.filter((id) => id !== 'loading' && id !== 'empty');

runA11yStories({
  name: 'FacetFilter',
  storyPrefix: 'ui-facetfilter',
  storyIds: A11Y_STORY_IDS,
  slotSelector: '[data-slot="facet-filter"]',
  iconFontStory: () => true,
});
