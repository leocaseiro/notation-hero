// Shared list of NativeSelect story IDs (kebab) so the VR (NativeSelect.vr.ts)
// and a11y (NativeSelect.a11y.ts) suites stay in lockstep with
// NativeSelect.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` (not `*.stories.*`) so Storybook's stories glob doesn't try
// to load it as a story file.
export const NATIVE_SELECT_STORY_IDS = [
  'default',
  'placeholder',
  'disabled',
  'invalid',
  'with-groups',
  'many-options',
] as const;
