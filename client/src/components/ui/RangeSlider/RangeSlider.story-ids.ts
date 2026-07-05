// Shared list of RangeSlider story IDs (kebab) so VR (RangeSlider.vr.ts) and a11y
// (RangeSlider.a11y.ts) stay in lockstep with RangeSlider.stories.tsx — add a story once and both
// gates pick it up. Named `*.story-ids.ts` so Storybook's stories glob ignores it.
export const RANGE_SLIDER_STORY_IDS = ['default', 'tempo', 'full-range', 'disabled'] as const;
