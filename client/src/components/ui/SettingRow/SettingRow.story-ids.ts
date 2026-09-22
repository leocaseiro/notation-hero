// Shared list of SettingRow story IDs (kebab) so VR (SettingRow.vr.ts) and a11y
// (SettingRow.a11y.ts) stay in lockstep with SettingRow.stories.tsx — add a story once and both
// gates pick it up. Named `*.story-ids.ts` so Storybook's stories glob ignores it.
export const SETTING_ROW_STORY_IDS = [
  'toggle',
  'number',
  'range',
  'text',
  'color',
  'select',
  'action',
  'disabled',
] as const;
