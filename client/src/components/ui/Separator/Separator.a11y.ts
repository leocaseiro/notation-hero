import { runA11yStories } from '../../../a11y-helpers';
import { SEPARATOR_STORY_IDS } from './Separator.story-ids';

// axe coverage for Separator — story x {light,dark}, resting only. A separator is a static rule
// with no hover state, and the thin 1px line can't reliably receive a hover (its wrapper
// intercepts), so the hover pass is skipped.
runA11yStories({
  name: 'Separator',
  storyPrefix: 'ui-separator',
  storyIds: SEPARATOR_STORY_IDS,
  slotSelector: '[data-slot^="separator"]',
  hoverStory: () => false,
});
