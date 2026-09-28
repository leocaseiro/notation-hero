import { runVrStories } from '../../../vr-helpers';
import { TRACK_ROW_STORY_IDS } from './TrackRow.story-ids';

// VR for TrackRow — every story in light + dark x {resting, focus, hover}. Focus/hover target the
// first TransportToggle (render-select) rather than the row itself, which is a non-focusable
// wrapper — the Accordion/SettingRow precedent of pointing at the real interactive descendant.
// The tooltip is PORTALLED outside the row, so a row-only clip crops it — capture the padded
// union of the row + the panel (the shape TransportToggle.vr.ts uses) and wait for the panel to
// mount before the clip is measured.
runVrStories({
  name: 'TrackRow',
  storyPrefix: 'ui-trackrow',
  snapshotSlug: 'trackrow',
  storyIds: TRACK_ROW_STORY_IDS,
  slotSelector: '[data-slot="track-row"]',
  states: ['resting', 'focus', 'hover'],
  focusExpect: '[data-slot="transport-toggle"]',
  hoverSelector: '[data-slot="transport-toggle"]',
  captureSelectors: ['[data-slot="track-row"]', '[data-slot="tooltip-content"]'],
  revealWaitSelectorForStory: () => '[data-slot="tooltip-content"]',
  // A disabled toggle still takes focus — that is the state its tooltip opens in — but hovering
  // it is a no-op (aria-disabled:pointer-events-none), so the recording story skips hover.
  statesForStory: (story) =>
    story === 'recording' ? ['resting', 'focus'] : ['resting', 'focus', 'hover'],
  iconFontStory: () => true,
});
