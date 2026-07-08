import { runA11yStories } from '../../../a11y-helpers';
import { PAGINATION_STORY_IDS } from './Pagination.story-ids';

// axe coverage for Pagination — every story x {light,dark} x {resting,hover}. Every story renders
// Material Symbols glyphs, so assert the icon font actually loaded (not ligature fallback text).
runA11yStories({
  name: 'Pagination',
  storyPrefix: 'ui-pagination',
  storyIds: PAGINATION_STORY_IDS,
  slotSelector: '[data-slot="pagination"]',
  iconFontStory: () => true,
});
