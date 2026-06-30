import { runA11yStories } from '../../../a11y-helpers';
import { PLAY_BUTTON_STORY_IDS } from './PlayButton.story-ids';

// axe coverage for PlayButton — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'PlayButton',
  storyPrefix: 'ui-playbutton',
  storyIds: PLAY_BUTTON_STORY_IDS,
  slotSelector: '[data-slot="button"]',
  iconFontStory: () => true,
});
