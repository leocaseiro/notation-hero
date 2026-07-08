import { runVrStories } from '../../../vr-helpers';
import { RANGE_SLIDER_STORY_IDS } from './RangeSlider.story-ids';

// VR for RangeSlider — every story in light + dark, plus focus (the focus-visible ring) and hover
// (the hover ring) snapshots on the non-disabled stories. Base UI renders each thumb as a styled
// div (visible, carries `data-index`) with a nested native `<input type="range">` (implicit
// role="slider", full-size but visually clipped) — focus tabs to the input (the actual focusable
// element), hover targets the visible div (it paints on top and intercepts pointer events). The
// thumb's `has-focus-visible:ring-3` (see RangeSlider.tsx) is guarded by the Linux `-focus-` baseline.
runVrStories({
  name: 'RangeSlider',
  storyPrefix: 'ui-rangeslider',
  snapshotSlug: 'rangeslider',
  storyIds: RANGE_SLIDER_STORY_IDS,
  slotSelector: '[data-slot="range-slider"]',
  states: ['resting', 'focus', 'hover'],
  focusExpect: 'input[type="range"]',
  hoverSelector: '[data-index]',
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover']),
});
