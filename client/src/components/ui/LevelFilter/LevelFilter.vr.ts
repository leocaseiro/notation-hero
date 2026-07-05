import { runVrStories } from '../../../vr-helpers';
import { LEVEL_FILTER_STORY_IDS } from './LevelFilter.story-ids';

// VR for LevelFilter. Snapshot the whole canvas (#storybook-root) so the open range panel is
// captured; wait for the always-present trigger first. Hover/focus states apply to the closed
// 'unset' trigger; the open stories are captured resting only.
runVrStories({
  name: 'LevelFilter',
  storyPrefix: 'ui-levelfilter',
  filePrefix: 'levelfilter',
  storyIds: LEVEL_FILTER_STORY_IDS,
  slotSelector: '#storybook-root',
  readySelector: '[data-slot="level-filter"]',
  states: ['resting', 'hover', 'focus'],
  hoverSelector: '[data-slot="level-filter"]',
  focusSelector: '[data-slot="level-filter"]',
  stateStory: (story, state) => state === 'resting' || story === 'unset',
});
