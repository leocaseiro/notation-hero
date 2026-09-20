import { runVrStories } from '../../../vr-helpers';
import { SLIDER_STORY_IDS } from './Slider.story-ids';

// VR for Slider — every story in light + dark, plus focus and hover on the non-disabled stories.
// Focus tabs to the nested native input (the actual focusable element); hover targets the visible
// thumb div, which paints on top and intercepts pointer events.
runVrStories({
  name: 'Slider',
  storyPrefix: 'ui-slider',
  snapshotSlug: 'slider',
  storyIds: SLIDER_STORY_IDS,
  slotSelector: '[data-slot="slider"]',
  states: ['resting', 'focus', 'hover'],
  focusExpect: 'input[type="range"]',
  hoverSelector: '[data-index]',
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover']),
});
