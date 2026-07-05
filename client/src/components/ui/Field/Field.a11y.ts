import { runA11yStories } from '../../../a11y-helpers';
import { FIELD_STORY_IDS } from './Field.story-ids';

// axe coverage for Field — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Field',
  storyPrefix: 'ui-field',
  storyIds: FIELD_STORY_IDS,
  slotSelector: '[data-slot="field"]',
});
