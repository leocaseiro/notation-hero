// Shared Pagination story IDs (kebab) so VR (Pagination.vr.ts) and a11y (Pagination.a11y.ts) stay
// in lockstep with Pagination.stories.tsx — add a story once and both gates pick it up. Named
// `*.story-ids.ts` so Storybook's stories glob ignores it.
export const PAGINATION_STORY_IDS = [
  'first-page',
  'middle',
  'last-page',
  'few-pages',
  'many-pages',
  'with-page-size',
] as const;
