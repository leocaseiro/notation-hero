import { runA11yStories } from '../../../a11y-helpers';
import { NAME_CELL_STORY_IDS } from './NameCell.story-ids';

// axe coverage for NameCell — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'NameCell',
  storyPrefix: 'catalog-namecell',
  storyIds: NAME_CELL_STORY_IDS,
  slotSelector: '[data-slot="name-cell"]',
  iconFontStory: () => true,
});
