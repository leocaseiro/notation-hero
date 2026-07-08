// Shared list of Input story IDs (kebab) so the VR (Input.vr.ts) and a11y
// (Input.a11y.ts) suites stay in lockstep with Input.stories.tsx — add a story
// once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`) so
// Storybook's stories glob doesn't try to load it as a story file.
export const INPUT_STORY_IDS = [
  'default',
  'placeholder',
  'disabled',
  'read-only',
  'invalid',
  'with-value',
  'type-email',
  'type-password',
  'type-number',
  'type-file',
] as const;
