import { runA11yStories } from '../../../a11y-helpers';
import { SLIDER_STORY_IDS } from './Slider.story-ids';

// axe coverage for Slider — every story x {light,dark} x {resting,hover}. Skip hover on the
// disabled story (the thumb is inert).
runA11yStories({
  name: 'Slider',
  storyPrefix: 'ui-slider',
  storyIds: SLIDER_STORY_IDS,
  slotSelector: '[data-slot="slider"]',
  hoverStory: (story) => story !== 'disabled',
});
