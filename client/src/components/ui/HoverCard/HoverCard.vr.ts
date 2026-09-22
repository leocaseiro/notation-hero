import { runVrStories } from '../../../vr-helpers';
import { HOVER_CARD_STORY_IDS } from './HoverCard.story-ids';

// The story is interactive (closed at rest). `resting` guards the trigger + that the card is NOT
// showing; `open` drives the `open` control via URL args so the panel shows deterministically.
// Radix portals the content outside the slot, so capture the padded union of the trigger + the
// portalled panel (not the whole viewport) to keep the compare area to the meaningful pixels.
runVrStories({
  name: 'HoverCard',
  storyPrefix: 'ui-hovercard',
  snapshotSlug: 'hover-card',
  storyIds: HOVER_CARD_STORY_IDS,
  slotSelector: '[data-slot="hover-card-trigger"]',
  captureSelectors: ['[data-slot="hover-card-trigger"]', '[data-slot="hover-card-content"]'],
  states: ['resting', 'open'],
  openWaitSelector: '[data-slot="hover-card-content"]',
});
