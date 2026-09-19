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
  // A disabled button has pointer-events-none, so hover is a no-op and is skipped. It renders
  // aria-disabled (not the native attribute), so it DOES take keyboard focus: the focus state
  // presses Tab and asserts toBeFocused(), which proves Tab reach in a real browser.
  statesForStory: (story) =>
    story === 'disabled' ? ['resting', 'focus'] : ['resting', 'hover', 'focus'],
  iconFontStory: (story) => story.includes('icon'),
});
