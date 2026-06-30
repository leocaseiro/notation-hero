import { runA11yStories } from '../../../a11y-helpers';
import { SCORE_DONUT_STORY_IDS } from './ScoreDonut.story-ids';

// axe coverage for ScoreDonut — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'ScoreDonut',
  storyPrefix: 'ui-scoredonut',
  storyIds: SCORE_DONUT_STORY_IDS,
  slotSelector: '[data-slot="score-donut"]',
  iconFontStory: (story) => story === 'mastered',
});
