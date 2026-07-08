import { runVrStories } from '../../../vr-helpers';
import { SEPARATOR_STORY_IDS } from './Separator.story-ids';

// The separator is static (no hover/focus), so one resting snapshot per story x {light, dark}.
// Base UI renders role="separator" and keeps `data-slot="separator"`; the `^=` match is robust
// either way. The capture is the slot box plus padding, which frames the surrounding demo
// content so the rule reads in context.
runVrStories({
  name: 'Separator',
  storyPrefix: 'ui-separator',
  snapshotSlug: 'separator',
  storyIds: SEPARATOR_STORY_IDS,
  slotSelector: '[data-slot^="separator"]',
  states: ['resting'],
});
