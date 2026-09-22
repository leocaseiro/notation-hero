// Shared list of Tabs story IDs (kebab) so VR (Tabs.vr.ts) and a11y (Tabs.a11y.ts) stay in
// lockstep with Tabs.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` so Storybook's stories glob ignores it.
export const TABS_STORY_IDS = ['default', 'lessons-active', 'plain', 'disabled'] as const;
