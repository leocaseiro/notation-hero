import { runA11yStories } from '../../../a11y-helpers';
import { LEVEL_FILTER_STORY_IDS } from './LevelFilter.story-ids';

// axe coverage for LevelFilter — every story x {light,dark} x {resting,hover}. The open stories
// render the popover inline, so axe also checks the "difficulty range" caption, the Min/Max
// selects (each with an accessible name) and Clear. Every story renders the expand_more glyph.
runA11yStories({
  name: 'LevelFilter',
  storyPrefix: 'ui-levelfilter',
  storyIds: LEVEL_FILTER_STORY_IDS,
  slotSelector: '[data-slot="level-filter"]',
  iconFontStory: () => true,
});
