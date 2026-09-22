import { runA11yStories } from '../../../a11y-helpers';
import { POPOVER_STORY_IDS } from './Popover.story-ids';

// axe coverage for Popover — every story x {light,dark} x {resting,hover}. The open story renders
// the panel inline (no Portal), so axe scoped to #storybook-root also checks the floating content.
runA11yStories({
  name: 'Popover',
  storyPrefix: 'ui-popover',
  storyIds: POPOVER_STORY_IDS,
  slotSelector: '#storybook-root',
});
