// Shared list of TrackRow story IDs (kebab) so VR (TrackRow.vr.ts) and a11y (TrackRow.a11y.ts)
// stay in lockstep with TrackRow.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` so Storybook's stories glob ignores it.
export const TRACK_ROW_STORY_IDS = [
  'collapsed',
  'expanded',
  'stringed-expanded',
  'multi-staff',
  'muted',
  'soloed',
  'recording',
  'percussion-expand-locked',
] as const;
