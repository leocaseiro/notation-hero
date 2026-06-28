// Shared list of ScoreDonut story IDs (kebab) so the VR (ScoreDonut.vr.ts) and a11y
// (ScoreDonut.a11y.ts) suites stay in lockstep with ScoreDonut.stories.tsx — add a
// story once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`) so
// Storybook's stories glob doesn't try to load it as a story file.
export const SCORE_DONUT_STORY_IDS = [
  'not-attempted',
  'just-started',
  'low',
  'developing',
  'climbing',
  'high',
  'mastered',
] as const;
