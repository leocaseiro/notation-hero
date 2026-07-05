import { runA11yStories } from '../../../a11y-helpers';
import { FACET_FILTER_STORY_IDS } from './FacetFilter.story-ids';

// axe coverage for FacetFilter — every story x {light,dark} x {resting,hover}. The open stories
// render the popover inline (no Portal), so axe scoped to #storybook-root also checks the search
// box, the checkbox/radio list and the Clear button. Every story renders the expand_more glyph.
runA11yStories({
  name: 'FacetFilter',
  storyPrefix: 'ui-facetfilter',
  storyIds: FACET_FILTER_STORY_IDS,
  slotSelector: '[data-slot="facet-filter"]',
  iconFontStory: () => true,
});
