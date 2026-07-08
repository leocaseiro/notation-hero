import { runVrStories } from '../../../vr-helpers';
import { LEVEL_FILTER_STORY_IDS } from './LevelFilter.story-ids';

// VR for LevelFilter. The open stories render the range popover open (defaultOpen), so capture the
// padded union of the trigger + the portalled popover panel (data-slot="popover-content", portalled
// into #storybook-root). The closed 'unset' story has no panel — its clip is just the trigger, and
// it also guards the trigger's hover + focus-visible states (a single Tab reaches the trigger).
runVrStories({
  name: 'LevelFilter',
  storyPrefix: 'ui-levelfilter',
  snapshotSlug: 'levelfilter',
  storyIds: LEVEL_FILTER_STORY_IDS,
  slotSelector: '[data-slot="level-filter"]',
  captureSelectors: ['[data-slot="level-filter"]', '[data-slot="popover-content"]'],
  states: ['resting'],
  hoverSelector: '[data-slot="level-filter"]',
  focusExpect: '[data-slot="level-filter"]',
  statesForStory: (story) => (story === 'unset' ? ['resting', 'hover', 'focus'] : ['resting']),
});
