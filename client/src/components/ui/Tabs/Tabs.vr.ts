import { runVrStories } from '../../../vr-helpers';
import { TABS_STORY_IDS } from './Tabs.story-ids';

// VR for Tabs — every story in light + dark, plus a focus snapshot (the trigger focus ring) on
// the non-disabled stories. Focus targets the first trigger pill. The disabled story is captured
// resting only (its first trigger is enabled, but a focus snapshot adds nothing there).
runVrStories({
  name: 'Tabs',
  storyPrefix: 'ui-tabs',
  filePrefix: 'tabs',
  storyIds: TABS_STORY_IDS,
  slotSelector: '[data-slot="tabs"]',
  states: ['resting', 'focus'],
  focusSelector: '[data-slot="tabs-trigger"]',
  stateStory: (story, state) => state === 'resting' || story !== 'disabled',
});
