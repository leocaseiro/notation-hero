import { runVrStories } from '../../../vr-helpers';

import { LABEL_STORY_IDS } from './Label.story-ids';

// Visual coverage for Label: every story x {light, dark}. Story IDs come from the shared
// Label.story-ids list, so VR and a11y stay in lockstep with Label.stories.tsx.
// Resting only: a <label> is never focusable, and Label paints no hover style (the
// cursor swap on disabled paths is not captured by screenshots).
runVrStories({
  name: 'Label',
  storyPrefix: 'ui-label',
  snapshotSlug: 'label',
  storyIds: LABEL_STORY_IDS,
  slotSelector: '[data-slot="label"]',
  states: ['resting'],
});
