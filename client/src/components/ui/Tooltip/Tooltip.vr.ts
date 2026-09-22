import { runVrStories } from '../../../vr-helpers';
import { TOOLTIP_STORY_IDS } from './Tooltip.story-ids';

// The stories are interactive (closed at rest). `resting` guards the trigger + that the tooltip is
// NOT showing; `open` drives the `open` control via URL args so the panel shows deterministically.
// Base UI portals the content outside the slot, so capture the padded union of the trigger + the
// portalled panel (not the whole viewport) to keep the compare area to the meaningful pixels.
runVrStories({
  name: 'Tooltip',
  storyPrefix: 'ui-tooltip',
  snapshotSlug: 'tooltip',
  storyIds: TOOLTIP_STORY_IDS,
  slotSelector: '[data-slot="tooltip-trigger"]',
  captureSelectors: ['[data-slot="tooltip-trigger"]', '[data-slot="tooltip-content"]'],
  states: ['resting', 'open'],
  openWaitSelector: '[data-slot="tooltip-content"]',
});
