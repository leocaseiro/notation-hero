import { runVrStories } from '../../../vr-helpers';

import { BADGE_STORY_IDS } from './Badge.story-ids';

// Visual coverage for Badge: every story x {light, dark}. Story IDs come from the shared
// Badge.story-ids list, so VR and a11y stay in lockstep with Badge.stories.tsx.
runVrStories({
  name: 'Badge',
  storyPrefix: 'ui-badge',
  snapshotSlug: 'badge',
  storyIds: BADGE_STORY_IDS,
  slotSelector: '[data-slot="badge"]',
  // The default span is non-interactive (no hover styles, not focusable) — resting only.
  // The as-link story renders a real anchor, so its hover + focus-visible ring are guarded.
  states: ['resting'],
  statesForStory: (story) => (story === 'as-link' ? ['resting', 'hover', 'focus'] : ['resting']),
});
