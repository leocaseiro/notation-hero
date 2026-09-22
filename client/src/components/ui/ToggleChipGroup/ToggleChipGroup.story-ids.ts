// Shared list of ToggleChipGroup story IDs (kebab) so VR (ToggleChipGroup.vr.ts) and a11y
// (ToggleChipGroup.a11y.ts) stay in lockstep with ToggleChipGroup.stories.tsx — add a story once
// and both gates pick it up. Named `*.story-ids.ts` so Storybook's stories glob ignores it.
export const TOGGLE_CHIP_GROUP_STORY_IDS = [
  'default',
  'skills',
  'single',
  'none-selected',
  'disabled',
] as const;
