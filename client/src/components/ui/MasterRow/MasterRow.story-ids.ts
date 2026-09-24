// Shared list of MasterRow story IDs (kebab) so VR (MasterRow.vr.ts) and a11y (MasterRow.a11y.ts)
// stay in lockstep with MasterRow.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` so Storybook's stories glob ignores it.
export const MASTER_ROW_STORY_IDS = [
  'resting',
  'mixed',
  'ticked',
  'recording',
  'with-leading-control',
] as const;
