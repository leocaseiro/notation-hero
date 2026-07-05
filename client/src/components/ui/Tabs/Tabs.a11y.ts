import { runA11yStories } from '../../../a11y-helpers';
import { TABS_STORY_IDS } from './Tabs.story-ids';

// axe coverage for Tabs — every story x {light,dark} x {resting,hover}. Only the icon stories
// (default, lessons-active) render a Material Symbols glyph, so assert the icon font loaded there.
runA11yStories({
  name: 'Tabs',
  storyPrefix: 'ui-tabs',
  storyIds: TABS_STORY_IDS,
  slotSelector: '[data-slot="tabs"]',
  iconFontStory: (story) => story === 'default' || story === 'lessons-active',
});
