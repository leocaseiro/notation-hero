import { runVrStories } from '../../../vr-helpers';

import { RADIO_GROUP_STORY_IDS } from './RadioGroup.story-ids';

// Full-state visual coverage for RadioGroup: every story x {light, dark} x
// {resting, hover, focus}. Story IDs come from the shared RadioGroup.story-ids list,
// so VR and a11y stay in lockstep with RadioGroup.stories.tsx.
runVrStories({
  name: 'RadioGroup',
  storyPrefix: 'ui-radiogroup',
  snapshotSlug: 'radio-group',
  storyIds: RADIO_GROUP_STORY_IDS,
  slotSelector: '[data-slot="radio-group"]',
  states: ['resting', 'hover', 'focus'],
  // A fully disabled group is removed from the tab order, so it cannot take focus;
  // its hover frame is pixel-identical to resting (no hover token on radios).
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'hover', 'focus']),
  // Hover the item, not the group container (the default would land between items).
  hoverSelector: '[data-slot="radio-group-item"]',
  // Roving focus lands on the CHECKED item (the 2nd in with-default-value), so assert
  // "some radio item is focused" rather than assuming the first.
  focusExpect: '[data-slot="radio-group-item"]:focus',
});
