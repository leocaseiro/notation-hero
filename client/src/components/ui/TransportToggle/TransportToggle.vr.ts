import { runVrStories } from '../../../vr-helpers';
import { TRANSPORT_TOGGLE_STORY_IDS } from './TransportToggle.story-ids';

// VR for TransportToggle — every story in light + dark x {resting, focus, hover}.
runVrStories({
  name: 'TransportToggle',
  storyPrefix: 'ui-transporttoggle',
  snapshotSlug: 'transporttoggle',
  storyIds: TRANSPORT_TOGGLE_STORY_IDS,
  slotSelector: '[data-slot="transport-toggle"]',
  states: ['resting', 'focus', 'hover'],
  // Same rule as Button.vr.ts, because the disabled state IS Button's: pointer-events-none makes
  // hover a no-op, so it is skipped; aria-disabled (not the native attribute) keeps the control in
  // the tab order, so the focus state presses Tab and asserts toBeFocused() — which proves Tab
  // reach in a real browser.
  statesForStory: (story) =>
    story === 'disabled' ? ['resting', 'focus'] : ['resting', 'focus', 'hover'],
  iconFontStory: () => true,
});
