// Shared list of TempoControl story IDs (kebab) so VR and a11y stay in lockstep with the stories
// file. Three stories, not four: the percentage needs no story of its own, because hover and focus
// are the two states VR already captures.
export const TEMPO_CONTROL_STORY_IDS = ['default', 'slowed', 'disabled'] as const;
