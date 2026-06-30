// Shared DataTable story IDs (kebab) — keeps VR (DataTable.vr.ts) + a11y (DataTable.a11y.ts)
// in lockstep with DataTable.stories.tsx. Add a story once; both gates pick it up.
export const DATA_TABLE_STORY_IDS = [
  'default',
  'rows',
  'sortable-headers',
  'column-visibility-toggle',
  'empty',
  'loading',
] as const;
