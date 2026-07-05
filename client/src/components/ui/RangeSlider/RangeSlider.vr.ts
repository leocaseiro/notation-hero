import { runVrStories } from '../../../vr-helpers';
import { RANGE_SLIDER_STORY_IDS } from './RangeSlider.story-ids';

// VR for RangeSlider — every story in light + dark, plus focus (the focus-visible ring) and hover
// (the hover ring) snapshots on the non-disabled stories. Both target a thumb (Radix maps it to
// role="slider").
runVrStories({
  name: 'RangeSlider',
  storyPrefix: 'ui-rangeslider',
  filePrefix: 'rangeslider',
  storyIds: RANGE_SLIDER_STORY_IDS,
  slotSelector: '[data-slot="range-slider"]',
  states: ['resting', 'focus', 'hover'],
  focusSelector: '[role="slider"]',
  hoverSelector: '[role="slider"]',
  stateStory: (story, state) => state === 'resting' || story !== 'disabled',
});
