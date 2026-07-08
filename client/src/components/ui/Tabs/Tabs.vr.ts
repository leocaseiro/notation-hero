import { runVrStories } from '../../../vr-helpers';
import { TABS_STORY_IDS } from './Tabs.story-ids';

// VR for Tabs — every story in light + dark, plus a focus snapshot (the trigger focus ring) on the
// non-disabled stories. Base UI Tabs uses roving tabindex, so a single Tab lands on the ACTIVE
// trigger (the `data-active` pill) — which is the 2nd tab in the lessons-active story — so focus is
// asserted on that, not the first pill. The disabled story is captured resting only (a focus
// snapshot adds nothing there).
runVrStories({
  name: 'Tabs',
  storyPrefix: 'ui-tabs',
  snapshotSlug: 'tabs',
  storyIds: TABS_STORY_IDS,
  slotSelector: '[data-slot="tabs"]',
  states: ['resting', 'focus'],
  focusExpect: '[data-slot="tabs-trigger"][data-active]',
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus']),
});
