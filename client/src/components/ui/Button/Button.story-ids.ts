// Shared list of Button story IDs (kebab) so the VR (Button.vr.ts) and a11y
// (Button.a11y.ts) suites stay in lockstep with Button.stories.tsx — add a story
// once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`) so
// Storybook's stories glob doesn't try to load it as a story file.
export const BUTTON_STORY_IDS = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
  'small',
  'large',
  'disabled',
  'icon',
  'with-icon',
] as const;
