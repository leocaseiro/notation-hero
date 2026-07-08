import { runVrStories } from '../../../vr-helpers';

import { FIELD_STORY_IDS } from './Field.story-ids';

// Visual coverage for Field: every story x {light, dark}. Story IDs come from the shared
// Field.story-ids list, so VR and a11y stay in lockstep with Field.stories.tsx.
runVrStories({
  name: 'Field',
  storyPrefix: 'ui-field',
  snapshotSlug: 'field',
  storyIds: FIELD_STORY_IDS,
  slotSelector: '[data-slot="field"]',
  // Fieldset/grouped/responsive compositions live inside field-set/field-group wrappers —
  // the union box frames whichever are present (missing selectors are skipped), instead of
  // clipping to the first inner Field.
  captureSelectors: ['[data-slot="field-set"]', '[data-slot="field-group"]', '[data-slot="field"]'],
  states: ['resting'],
  // Focus guards the token ring (default) and the destructive invalid ring (with-error);
  // the other stories are compositions whose focus adds nothing new, and disabled cannot
  // take focus at all.
  statesForStory: (story) =>
    story === 'default' || story === 'with-error' ? ['resting', 'focus'] : ['resting'],
  // The field wrapper is a non-focusable div — Tab lands on the story's input.
  focusExpect: '[data-slot="field"] input',
});
