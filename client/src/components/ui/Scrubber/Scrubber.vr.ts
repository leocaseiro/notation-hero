import { runVrStories } from '../../../vr-helpers';
import { SCRUBBER_STORY_IDS } from './Scrubber.story-ids';

// VR for Scrubber — every story in light + dark, plus focus and hover where the bar is live. Focus
// tabs to the nested native input; hover targets the visible thumb div. The empty story has no
// length, so its bar is disabled and only the resting state exists.
runVrStories({
  name: 'Scrubber',
  storyPrefix: 'ui-scrubber',
  snapshotSlug: 'scrubber',
  storyIds: SCRUBBER_STORY_IDS,
  slotSelector: '[data-slot="scrubber"]',
  states: ['resting', 'focus', 'hover'],
  focusExpect: 'input[type="range"]',
  hoverSelector: '[data-index]',
  statesForStory: (story) => (story === 'empty' ? ['resting'] : ['resting', 'focus', 'hover']),
});
