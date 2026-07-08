import { runA11yStories } from '../../../a11y-helpers';
import { RADIO_GROUP_STORY_IDS } from './RadioGroup.story-ids';

// axe coverage for RadioGroup — the shared runA11yStories factory runs every
// story x {light,dark} x {resting,hover}. The dot is a CSS span (no icon font),
// so no iconFontStory is passed. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'RadioGroup',
  storyPrefix: 'ui-radiogroup',
  storyIds: RADIO_GROUP_STORY_IDS,
  slotSelector: '[data-slot="radio-group"]',
});
