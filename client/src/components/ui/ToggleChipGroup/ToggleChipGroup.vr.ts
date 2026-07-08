import { runVrStories } from '../../../vr-helpers';
import { TOGGLE_CHIP_GROUP_STORY_IDS } from './ToggleChipGroup.story-ids';

// VR for ToggleChipGroup — every story in light + dark, plus hover and focus snapshots of the first
// chip on the non-disabled stories (the disabled group keeps only the resting shot). Focus tabs to
// the first chip (the story puts it first, so the default single Tab reaches it).
runVrStories({
  name: 'ToggleChipGroup',
  storyPrefix: 'ui-togglechipgroup',
  snapshotSlug: 'togglechipgroup',
  storyIds: TOGGLE_CHIP_GROUP_STORY_IDS,
  slotSelector: '[data-slot="toggle-chip-group"]',
  states: ['resting', 'hover', 'focus'],
  hoverSelector: '[data-slot="toggle-chip"]',
  focusExpect: '[data-slot="toggle-chip"]',
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'hover', 'focus']),
});
