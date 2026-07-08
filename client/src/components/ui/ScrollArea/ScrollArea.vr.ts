import { runVrStories } from '../../../vr-helpers';
import { SCROLL_AREA_STORY_IDS } from './ScrollArea.story-ids';

// One resting snapshot per story x {light, dark}. The story's content overflows its container, so
// Base UI mounts the horizontal scrollbar + thumb — visible and deterministic for the capture
// (Base UI has no hover-reveal `type`; the bar shows whenever there is overflow). The bar is a
// child of the Root, so the slot box already frames it; the padded clip keeps the bar's bottom
// edge in view.
runVrStories({
  name: 'ScrollArea',
  storyPrefix: 'ui-scrollarea',
  snapshotSlug: 'scroll-area',
  storyIds: SCROLL_AREA_STORY_IDS,
  slotSelector: '[data-slot="scroll-area"]',
  states: ['resting'],
});
