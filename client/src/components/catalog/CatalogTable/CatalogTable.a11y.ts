import { runA11yStories } from '../../../a11y-helpers';
import { CATALOG_TABLE_STORY_IDS } from './CatalogTable.story-ids';

// axe coverage for CatalogTable — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'CatalogTable',
  storyPrefix: 'catalog-catalogtable',
  storyIds: CATALOG_TABLE_STORY_IDS,
  slotSelector: '[data-slot="data-table"]',
  iconFontStory: (story) => story !== 'empty',
});
