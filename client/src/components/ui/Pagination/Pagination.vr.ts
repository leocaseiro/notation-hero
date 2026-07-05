import { runVrStories } from '../../../vr-helpers';
import { PAGINATION_STORY_IDS } from './Pagination.story-ids';

// VR for Pagination — every story in light + dark, plus hover + focus snapshots on the Next button
// for the stories where it is enabled (skip hover/focus on last-page and single-page, where Next is
// disabled and the pixels don't change).
runVrStories({
  name: 'Pagination',
  storyPrefix: 'ui-pagination',
  filePrefix: 'pagination',
  storyIds: PAGINATION_STORY_IDS,
  slotSelector: '[data-slot="pagination"]',
  states: ['resting', 'hover', 'focus'],
  hoverSelector: '[aria-label="Next page"]',
  focusSelector: '[aria-label="Next page"]',
  stateStory: (story, state) =>
    state === 'resting' || (story !== 'last-page' && story !== 'single-page'),
});
