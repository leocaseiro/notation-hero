// Shared list of Sonner story IDs (kebab) so the VR (Sonner.vr.ts) and a11y
// (Sonner.a11y.ts) suites stay in lockstep with Sonner.stories.tsx — add a story
// once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`) so
// Storybook's stories glob doesn't try to load it as a story file.
export const SONNER_STORY_IDS = [
  'default',
  'success',
  'error-toast',
  'warning',
  'info',
  'with-description',
  'success-with-description',
  'with-action',
] as const;
