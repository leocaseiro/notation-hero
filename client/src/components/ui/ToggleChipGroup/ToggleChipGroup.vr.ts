import { runVrStories } from '../../../vr-helpers';
import { TOGGLE_CHIP_GROUP_STORY_IDS } from './ToggleChipGroup.story-ids';

// VR for ToggleChipGroup — every story in light + dark, plus hover and focus snapshots of the
// first chip on the non-disabled stories (the disabled group keeps only the resting shot).
runVrStories({
  name: 'ToggleChipGroup',
  storyPrefix: 'ui-togglechipgroup',
  filePrefix: 'togglechipgroup',
  storyIds: TOGGLE_CHIP_GROUP_STORY_IDS,
  slotSelector: '[data-slot="toggle-chip-group"]',
  states: ['resting', 'hover', 'focus'],
  hoverSelector: '[data-slot="toggle-chip"]',
  focusSelector: '[data-slot="toggle-chip"]',
  stateStory: (story, state) => state === 'resting' || story !== 'disabled',
});
