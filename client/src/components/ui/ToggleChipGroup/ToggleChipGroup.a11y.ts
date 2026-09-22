import { runA11yStories } from '../../../a11y-helpers';
import { TOGGLE_CHIP_GROUP_STORY_IDS } from './ToggleChipGroup.story-ids';

// axe coverage for ToggleChipGroup — every story x {light,dark} x {resting,hover}. Only the Skills
// story renders glyphs, so assert the icon font loaded there. Skip hover on the disabled story (no
// interactive affordance to hover).
runA11yStories({
  name: 'ToggleChipGroup',
  storyPrefix: 'ui-togglechipgroup',
  storyIds: TOGGLE_CHIP_GROUP_STORY_IDS,
  slotSelector: '[data-slot="toggle-chip-group"]',
  iconFontStory: (story) => story === 'skills',
  hoverStory: (story) => story !== 'disabled',
});
