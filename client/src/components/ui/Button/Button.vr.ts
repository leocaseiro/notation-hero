import { runVrStories } from '../../../vr-helpers';

import { BUTTON_STORY_IDS } from './Button.story-ids';

// Full-state visual coverage for Button: every story x {light, dark} x
// {resting, hover, focus}. Story IDs come from the shared Button.story-ids list, so VR
// and a11y stay in lockstep with Button.stories.tsx.
runVrStories({
  name: 'Button',
  storyPrefix: 'ui-button',
  snapshotSlug: 'button',
  storyIds: BUTTON_STORY_IDS,
  slotSelector: '[data-slot="button"]',
  states: ['resting', 'hover', 'focus'],
  // A disabled button has pointer-events-none (hover is a no-op) and cannot take
  // keyboard focus, so it only gets the resting snapshot.
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'hover', 'focus']),
  iconFontStory: (story) => story.includes('icon'),
});
