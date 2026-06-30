// Shared list of Badge story IDs (kebab) so the VR (Badge.vr.ts) and a11y (Badge.a11y.ts)
// suites stay in lockstep with Badge.stories.tsx — add a story once and both gates pick it
// up. Named `*.story-ids.ts` (not `*.stories.*`) so Storybook's stories glob doesn't try to
// load it as a story file.
export const BADGE_STORY_IDS = ['default', 'secondary', 'destructive', 'outline'] as const;
