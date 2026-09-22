// Shared list of Label story IDs (kebab) so the VR (Label.vr.ts) and a11y
// (Label.a11y.ts) suites stay in lockstep with Label.stories.tsx — add a story
// once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`) so
// Storybook's stories glob doesn't try to load it as a story file.
export const LABEL_STORY_IDS = [
  'default',
  'with-associated-input',
  'wrapping-input',
  'disabled',
  'required',
  'long-text',
  'group-disabled',
] as const;
