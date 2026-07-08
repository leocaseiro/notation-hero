import { runVrStories } from '../../../vr-helpers';

import { INPUT_STORY_IDS } from './Input.story-ids';

// Visual coverage for Input: every story x {light, dark} x {resting, focus}. Story IDs
// come from the shared Input.story-ids list, so VR and a11y stay in lockstep with
// Input.stories.tsx. No hover state: text fields get no hover bg per the token spec, so
// hover frames would duplicate resting. The invalid focus frame is the key assertion —
// aria-invalid keeps the border always and gains the destructive ring only on focus.
runVrStories({
  name: 'Input',
  storyPrefix: 'ui-input',
  snapshotSlug: 'input',
  storyIds: INPUT_STORY_IDS,
  slotSelector: '[data-slot="input"]',
  states: ['resting', 'focus'],
  // A disabled input is removed from the tab order, so it cannot take focus.
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus']),
});
