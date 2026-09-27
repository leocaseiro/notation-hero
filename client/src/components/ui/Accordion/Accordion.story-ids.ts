// Shared list of Accordion story IDs (kebab) so VR (Accordion.vr.ts) and a11y (Accordion.a11y.ts)
// stay in lockstep with Accordion.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` so Storybook's stories glob ignores it.
export const ACCORDION_STORY_IDS = ['default', 'all-closed', 'many-sections'] as const;
