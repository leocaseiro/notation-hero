// Shared list of Field story IDs (kebab) so the VR (Field.vr.ts) and a11y
// (Field.a11y.ts) suites stay in lockstep with Field.stories.tsx — add a story
// once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`) so
// Storybook's stories glob doesn't try to load it as a story file.
export const FIELD_STORY_IDS = [
  'default',
  'with-description',
  'with-error',
  'horizontal',
  'fieldset',
  'grouped',
  'responsive',
] as const;
