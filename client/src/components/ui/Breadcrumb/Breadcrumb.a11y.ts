import { runA11yStories } from '../../../a11y-helpers';
import { BREADCRUMB_STORY_IDS } from './Breadcrumb.story-ids';

// axe coverage for Breadcrumb — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. The chevron/ellipsis stories render Material Symbols
// glyphs; the custom-separator story uses a plain "/" so it has no glyph to guard.
runA11yStories({
  name: 'Breadcrumb',
  storyPrefix: 'ui-breadcrumb',
  storyIds: BREADCRUMB_STORY_IDS,
  slotSelector: '[data-slot="breadcrumb"]',
  iconFontStory: (story) => story !== 'custom-separator',
});
