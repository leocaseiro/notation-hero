// Shared list of Card story IDs (kebab) so the VR (Card.vr.ts) and a11y
// (Card.a11y.ts) suites stay in lockstep with Card.stories.tsx — add a story
// once and both gates pick it up. Named `*.story-ids.ts` (not `*.stories.*`) so
// Storybook's stories glob doesn't try to load it as a story file.
export const CARD_STORY_IDS = ['default', 'with-footer', 'with-action', 'full'] as const;
