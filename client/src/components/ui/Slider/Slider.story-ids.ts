// Shared list of Slider story IDs (kebab) so VR (Slider.vr.ts) and a11y (Slider.a11y.ts) stay in
// lockstep with Slider.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` so Storybook's stories glob ignores it.
export const SLIDER_STORY_IDS = ['default', 'with-readout', 'stepped', 'disabled'] as const;
