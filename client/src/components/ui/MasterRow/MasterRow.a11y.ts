import { runA11yStories } from '../../../a11y-helpers';
import { MASTER_ROW_STORY_IDS } from './MasterRow.story-ids';

// axe coverage for MasterRow — every story x {light,dark} x {resting,hover}. `axeInclude: 'body'`
// widens the scope to the portalled tooltip a hover/focus can open, which Base UI renders OUTSIDE
// the row.
runA11yStories({
  name: 'MasterRow',
  storyPrefix: 'ui-masterrow',
  storyIds: MASTER_ROW_STORY_IDS,
  slotSelector: '[data-slot="master-row"]',
  iconFontStory: () => true,
  axeInclude: 'body',
});
