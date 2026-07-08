// Shared story-id list — kept in lockstep with Breadcrumb.stories.tsx, Breadcrumb.vr.ts,
// and Breadcrumb.a11y.ts so the three suites never drift.
export const BREADCRUMB_STORY_IDS = [
  'default',
  'collapsed',
  'custom-separator',
  'on-muted-bar',
] as const;
