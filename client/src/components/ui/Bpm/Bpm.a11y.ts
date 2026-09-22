import { runA11yStories } from '../../../a11y-helpers';
import { BPM_STORY_IDS } from './Bpm.story-ids';

// axe coverage for Bpm — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Bpm',
  storyPrefix: 'ui-bpm',
  storyIds: BPM_STORY_IDS,
  slotSelector: '[data-slot="bpm"]',
  iconFontStory: (story) => story === 'range',
});
