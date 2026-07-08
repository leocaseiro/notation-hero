// Shared list of Checkbox story IDs (kebab) so the VR (Checkbox.vr.ts) and a11y
// (Checkbox.a11y.ts) suites stay in lockstep with Checkbox.stories.tsx — add a
// story once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`)
// so Storybook's stories glob doesn't try to load it as a story file.
export const CHECKBOX_STORY_IDS = [
  'default',
  'checked',
  'indeterminate',
  'disabled',
  'disabled-checked',
  'invalid',
  'with-label',
] as const;
