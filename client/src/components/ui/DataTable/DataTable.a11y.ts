import { runA11yStories } from '../../../a11y-helpers';
import { DATA_TABLE_STORY_IDS } from './DataTable.story-ids';

// axe coverage for DataTable — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'DataTable',
  storyPrefix: 'ui-datatable',
  storyIds: DATA_TABLE_STORY_IDS,
  slotSelector: '[data-slot="data-table"]',
});
