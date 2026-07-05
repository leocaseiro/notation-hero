// Shared list of RadioGroup story IDs (kebab) so the VR (RadioGroup.vr.ts) and
// a11y (RadioGroup.a11y.ts) suites stay in lockstep with RadioGroup.stories.tsx
// — add a story once and both gates pick it up. Named `*.story-ids.ts` (not
// `*.stories.*`) so Storybook's stories glob doesn't try to load it as a story.
export const RADIO_GROUP_STORY_IDS = [
  'default',
  'with-default-value',
  'disabled',
  'invalid',
  'horizontal',
] as const;
