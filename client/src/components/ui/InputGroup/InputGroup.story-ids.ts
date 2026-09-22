// Shared list of InputGroup story IDs (kebab) so the VR (InputGroup.vr.ts) and
// a11y (InputGroup.a11y.ts) suites stay in lockstep with InputGroup.stories.tsx
// — add a story once and both gates pick it up. Named `*.story-ids.ts` (not
// `*.stories.*`) so Storybook's stories glob doesn't try to load it as a story
// file.
export const INPUT_GROUP_STORY_IDS = [
  'with-prefix-text',
  'with-suffix-icon',
  'with-button',
  'invalid',
  'disabled',
] as const;
