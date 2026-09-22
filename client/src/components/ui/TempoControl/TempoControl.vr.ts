import { runVrStories } from '../../../vr-helpers';
import { TEMPO_CONTROL_STORY_IDS } from './TempoControl.story-ids';

// VR for TempoControl — every story in light + dark x {resting, focus, hover}. The `slowed`
// story's hover and focus snapshots are what guard the visible percentage; `resting` guards its
// absence. The 3 s linger needs no snapshot of its own: it is the same painted state, reached by a
// different trigger.
runVrStories({
  name: 'TempoControl',
  storyPrefix: 'ui-tempocontrol',
  snapshotSlug: 'tempocontrol',
  storyIds: TEMPO_CONTROL_STORY_IDS,
  slotSelector: '[data-slot="tempo-control"]',
  states: ['resting', 'focus', 'hover'],
  // The disabled input is natively disabled, so nothing in the control takes focus.
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover']),
  // One Tab reaches the input: Base UI gives both steppers tabindex="-1" on purpose, because a
  // keyboard user steps with the arrow keys inside the input.
  focusExpect: 'input',
  iconFontStory: () => true,
});
