import { runVrStories } from '../../../vr-helpers';
import { RANGE_SLIDER_STORY_IDS } from './RangeSlider.story-ids';

// VR for RangeSlider — every story in light + dark, plus focus (the focus-visible ring) and hover
// (the hover ring) snapshots on the non-disabled stories. Base UI renders each thumb as a styled
// div (visible, carries `data-index`) with a nested native `<input type="range">` (implicit
// role="slider", full-size but visually clipped) — focus targets the input (the actual focusable
// element), hover targets the visible div (it paints on top and intercepts pointer events).
//
// KNOWN VR-TOOLING LIMITATION, macOS-LOCAL ONLY (verified, not a real UX bug, not a CI gap): the
// thumb's `has-focus-visible:ring-3` (see RangeSlider.tsx) renders correctly for real keyboard
// users, in a raw/full-page screenshot, AND in the Linux VR container — the committed `-linux`
// `-focus-` baselines correctly differ from `-resting-` (238 differing pixels, matching the
// pre-migration Radix baseline's diff). Only the **darwin** baseline is pixel-identical to
// `-resting-`: `expect(locator).toHaveScreenshot()`'s internal stability sampling appears to lose
// the ring specifically on macOS for this "ring on an ancestor of the focused element via `:has()`"
// pattern (confirmed via direct DOM/computed-style inspection and a manual full-page
// `page.screenshot()` diff, which both show the ring present). Since local macOS dev is compared
// against `-darwin` and CI against `-linux` (see AGENTS.md), the actually-gating baseline is
// correct — this only affects what a developer sees when eyeballing the local `-darwin` PNG.
runVrStories({
  name: 'RangeSlider',
  storyPrefix: 'ui-rangeslider',
  filePrefix: 'rangeslider',
  storyIds: RANGE_SLIDER_STORY_IDS,
  slotSelector: '[data-slot="range-slider"]',
  states: ['resting', 'focus', 'hover'],
  focusSelector: 'input[type="range"]',
  hoverSelector: '[data-index]',
  stateStory: (story, state) => state === 'resting' || story !== 'disabled',
});
