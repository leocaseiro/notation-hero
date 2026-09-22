import { runVrStories } from '../../../vr-helpers';

import { NATIVE_SELECT_STORY_IDS } from './NativeSelect.story-ids';

// Visual coverage for NativeSelect: every story x {light, dark} x {resting, focus}.
// Story IDs come from the shared NativeSelect.story-ids list, so VR and a11y stay in
// lockstep with NativeSelect.stories.tsx. No hover state (fields get no hover bg per the
// token spec) and no open state (the native popup is an OS-level dropdown Playwright
// cannot capture in-page). The invalid focus frame guards the ring-on-focus spec.
runVrStories({
  name: 'NativeSelect',
  storyPrefix: 'ui-nativeselect',
  snapshotSlug: 'native-select',
  storyIds: NATIVE_SELECT_STORY_IDS,
  slotSelector: '[data-slot="native-select"]',
  // Capture the wrapper so the absolutely-positioned chevron is guaranteed in frame.
  captureSelectors: ['[data-slot="native-select-wrapper"]'],
  states: ['resting', 'focus'],
  // A disabled native select cannot receive focus (tab skips it).
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus']),
  // Every story renders the Material Symbols chevron.
  iconFontStory: () => true,
});
