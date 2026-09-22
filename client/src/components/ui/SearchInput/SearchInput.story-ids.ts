// Shared list of SearchInput story IDs (kebab) so VR (SearchInput.vr.ts) and a11y
// (SearchInput.a11y.ts) stay in lockstep with SearchInput.stories.tsx — add a story once and both
// gates pick it up. Named `*.story-ids.ts` so Storybook's stories glob ignores it.
export const SEARCH_INPUT_STORY_IDS = ['default', 'with-value', 'disabled'] as const;
