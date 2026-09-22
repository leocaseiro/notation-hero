// Shared list of Textarea story IDs (kebab) so the VR (Textarea.vr.ts) and a11y
// (Textarea.a11y.ts) suites stay in lockstep with Textarea.stories.tsx — add a
// story once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`)
// so Storybook's stories glob doesn't try to load it as a story file.
export const TEXTAREA_STORY_IDS = [
  'default',
  'placeholder',
  'disabled',
  'read-only',
  'invalid',
  'with-value',
  'with-rows',
] as const;
