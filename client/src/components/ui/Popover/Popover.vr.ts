import { runVrStories } from '../../../vr-helpers';
import { POPOVER_STORY_IDS } from './Popover.story-ids';

// VR for Popover. Snapshot the whole canvas (#storybook-root) so the open floating panel is
// captured; wait for the trigger button first.
runVrStories({
  name: 'Popover',
  storyPrefix: 'ui-popover',
  filePrefix: 'popover',
  storyIds: POPOVER_STORY_IDS,
  slotSelector: '#storybook-root',
  // The Radix trigger (aria-haspopup="dialog"); a bare 'button' matched a hidden Storybook control.
  readySelector: '[aria-haspopup="dialog"]',
  states: ['resting'],
});
