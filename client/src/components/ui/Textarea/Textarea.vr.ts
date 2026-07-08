import { runVrStories } from '../../../vr-helpers';

import { TEXTAREA_STORY_IDS } from './Textarea.story-ids';

// Visual coverage for Textarea: every story x {light, dark} x {resting, focus}. Story
// IDs come from the shared Textarea.story-ids list, so VR and a11y stay in lockstep with
// Textarea.stories.tsx. No hover state (fields get no hover bg per the token spec); the
// invalid focus frame proves the destructive ring gains width only on focus.
runVrStories({
  name: 'Textarea',
  storyPrefix: 'ui-textarea',
  snapshotSlug: 'textarea',
  storyIds: TEXTAREA_STORY_IDS,
  slotSelector: '[data-slot="textarea"]',
  states: ['resting', 'focus'],
  // A disabled textarea is removed from the tab order; read-only stays focusable.
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus']),
});
