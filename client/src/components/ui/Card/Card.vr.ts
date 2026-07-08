import { runVrStories } from '../../../vr-helpers';

import { CARD_STORY_IDS } from './Card.story-ids';

// Visual coverage for Card: every story x {light, dark} x {resting, hover, focus}.
// Story IDs come from the shared Card.story-ids list, so VR and a11y stay in lockstep
// with Card.stories.tsx. Hover/focus target the first design-system Button inside the
// card — in with-action/full that is the header icon button (it precedes the footer
// in DOM order), so those states capture the icon button, not the footer pair.
runVrStories({
  name: 'Card',
  storyPrefix: 'ui-card',
  snapshotSlug: 'card',
  storyIds: CARD_STORY_IDS,
  slotSelector: '[data-slot="card"]',
  states: ['resting', 'hover', 'focus'],
  // The default story has no interactive element to hover or focus.
  statesForStory: (story) => (story === 'default' ? ['resting'] : ['resting', 'hover', 'focus']),
  hoverSelector: '[data-slot="button"]',
  focusExpect: '[data-slot="button"]',
  iconFontStory: (story) => story === 'with-action' || story === 'full',
});
