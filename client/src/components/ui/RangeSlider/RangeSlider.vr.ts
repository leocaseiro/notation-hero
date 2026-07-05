import { runVrStories } from '../../../vr-helpers';
import { RANGE_SLIDER_STORY_IDS } from './RangeSlider.story-ids';

// VR for RangeSlider — every story in light + dark, plus a focus snapshot (the focus-visible ring)
// on the non-disabled stories. Focus targets a thumb (Radix maps it to role="slider").
runVrStories({
  name: 'RangeSlider',
  storyPrefix: 'ui-rangeslider',
  filePrefix: 'rangeslider',
  storyIds: RANGE_SLIDER_STORY_IDS,
  slotSelector: '[data-slot="range-slider"]',
  states: ['resting', 'focus'],
  focusSelector: '[role="slider"]',
  stateStory: (story, state) => state === 'resting' || story !== 'disabled',
});
