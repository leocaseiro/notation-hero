import { runVrStories } from '../../../vr-helpers';
import { TRANSPORT_TOGGLE_STORY_IDS } from './TransportToggle.story-ids';

// VR for TransportToggle — every story in light + dark x {resting, focus, hover}.
runVrStories({
  name: 'TransportToggle',
  storyPrefix: 'ui-transporttoggle',
  snapshotSlug: 'transporttoggle',
  storyIds: TRANSPORT_TOGGLE_STORY_IDS,
  slotSelector: '[data-slot="transport-toggle"]',
  // The tooltip is PORTALLED outside the toggle, so a button-only clip crops it to a few rows of
  // fill with none of its text — the pixels the with-tooltip story exists to guard. Capture the
  // padded union of the toggle + the panel (the shape Tooltip.vr.ts uses), and wait for the panel
  // so the clip is measured after it mounts. paddedClip skips absent selectors, so the three
  // tooltip-less stories keep the button-only region.
  captureSelectors: ['[data-slot="transport-toggle"]', '[data-slot="tooltip-content"]'],
  revealWaitSelectorForStory: (story) =>
    story === 'with-tooltip' ? '[data-slot="tooltip-content"]' : undefined,
  states: ['resting', 'focus', 'hover'],
  // Same rule as Button.vr.ts, because the disabled state IS Button's: pointer-events-none makes
  // hover a no-op, so it is skipped; aria-disabled (not the native attribute) keeps the control in
  // the tab order, so the focus state presses Tab and asserts toBeFocused() — which proves Tab
  // reach in a real browser.
  statesForStory: (story) =>
    story === 'disabled' ? ['resting', 'focus'] : ['resting', 'focus', 'hover'],
  iconFontStory: () => true,
});
