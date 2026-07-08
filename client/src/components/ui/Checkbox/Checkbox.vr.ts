import { runVrStories } from '../../../vr-helpers';

import { CHECKBOX_STORY_IDS } from './Checkbox.story-ids';

// Full-state visual coverage for Checkbox: every story x {light, dark} x
// {resting, hover, focus}. Story IDs come from the shared Checkbox.story-ids list, so
// VR and a11y stay in lockstep with Checkbox.stories.tsx.
runVrStories({
  name: 'Checkbox',
  storyPrefix: 'ui-checkbox',
  snapshotSlug: 'checkbox',
  storyIds: CHECKBOX_STORY_IDS,
  slotSelector: '[data-slot="checkbox"]',
  states: ['resting', 'hover', 'focus'],
  // Disabled boxes are removed from the tab order (cannot focus) and paint no hover
  // style (cursor swap only), so they get the resting snapshot alone.
  statesForStory: (story) =>
    story.startsWith('disabled') ? ['resting'] : ['resting', 'hover', 'focus'],
  // Only stories that paint a glyph load the Material Symbols font.
  iconFontStory: (story) => ['checked', 'indeterminate', 'disabled-checked'].includes(story),
});
