import { runVrStories } from '../../../vr-helpers';

import { INPUT_GROUP_STORY_IDS } from './InputGroup.story-ids';

// Visual coverage for InputGroup: every story x {light, dark}. Story IDs come from the
// shared InputGroup.story-ids list, so VR and a11y stay in lockstep with
// InputGroup.stories.tsx. Focus (Tab #1 lands on the input) captures the container's
// has-[input:focus-visible] ring — the group focus behavior under test; the invalid
// focus frame proves the destructive ring appears only on focus. Hover applies to
// with-button only (the button is the one hover-bg element; fields get none).
runVrStories({
  name: 'InputGroup',
  storyPrefix: 'ui-inputgroup',
  snapshotSlug: 'input-group',
  storyIds: INPUT_GROUP_STORY_IDS,
  slotSelector: '[data-slot="input-group"]',
  states: ['resting', 'focus'],
  statesForStory: (story) => {
    // Disabled input + button are both skipped by Tab — resting only.
    if (story === 'disabled') return ['resting'];
    if (story === 'with-button') return ['resting', 'hover', 'focus'];
    return ['resting', 'focus'];
  },
  hoverSelector: '[data-slot="input-group-button"]',
  focusExpect: '[data-slot="input-group-input"]',
  iconFontStory: (story) =>
    story.includes('icon') || story === 'with-button' || story === 'disabled',
});
