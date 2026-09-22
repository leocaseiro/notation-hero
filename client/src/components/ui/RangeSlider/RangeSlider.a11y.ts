import { runA11yStories } from '../../../a11y-helpers';
import { RANGE_SLIDER_STORY_IDS } from './RangeSlider.story-ids';

// axe coverage for RangeSlider — every story x {light,dark} x {resting,hover}. Skip hover on the
// disabled story (thumbs are inert).
runA11yStories({
  name: 'RangeSlider',
  storyPrefix: 'ui-rangeslider',
  storyIds: RANGE_SLIDER_STORY_IDS,
  slotSelector: '[data-slot="range-slider"]',
  hoverStory: (story) => story !== 'disabled',
});
