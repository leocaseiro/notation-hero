import { runA11yStories } from '../../../a11y-helpers';
import { LABEL_STORY_IDS } from './Label.story-ids';

// axe coverage for Label — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Label',
  storyPrefix: 'ui-label',
  storyIds: LABEL_STORY_IDS,
  slotSelector: '[data-slot="label"]',
});
