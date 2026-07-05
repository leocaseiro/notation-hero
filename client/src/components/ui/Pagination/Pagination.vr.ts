import { runVrStories } from '../../../vr-helpers';
import { PAGINATION_STORY_IDS } from './Pagination.story-ids';

// VR for Pagination — every story in light + dark, plus hover + focus snapshots on a numbered page
// button for the multi-ellipsis stories (middle, many-pages), where the current-page window is
// mid-list. The hover/focus target is "Go to page 1": it is present in every story and is a
// non-current outline button in these two, so its hover/focus pixels actually change (the middle
// pages are the current teal chip / its siblings; page 1 sits behind the leading ellipsis window).
runVrStories({
  name: 'Pagination',
  storyPrefix: 'ui-pagination',
  filePrefix: 'pagination',
  storyIds: PAGINATION_STORY_IDS,
  slotSelector: '[data-slot="pagination"]',
  states: ['resting', 'hover', 'focus'],
  hoverSelector: '[aria-label="Go to page 1"]',
  focusSelector: '[aria-label="Go to page 1"]',
  stateStory: (story, state) => state === 'resting' || story === 'middle' || story === 'many-pages',
});
