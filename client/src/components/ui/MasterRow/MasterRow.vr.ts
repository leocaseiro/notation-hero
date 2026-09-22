import { runVrStories } from '../../../vr-helpers';
import { MASTER_ROW_STORY_IDS } from './MasterRow.story-ids';

// VR for MasterRow — every story in light + dark x {resting, focus, hover}. Two Tabs reach the
// first checkbox (the master volume slider is the first stop); focus/hover target the checkbox
// span rather than the row itself, a non-focusable wrapper. The tooltip is PORTALLED outside the
// row, so capture the padded union of the row + the panel and wait for the panel to mount.
runVrStories({
  name: 'MasterRow',
  storyPrefix: 'ui-masterrow',
  snapshotSlug: 'masterrow',
  storyIds: MASTER_ROW_STORY_IDS,
  slotSelector: '[data-slot="master-row"]',
  states: ['resting', 'focus', 'hover'],
  focusTabs: 2,
  focusExpect: '[data-slot="checkbox"]',
  hoverSelector: '[data-slot="checkbox"]',
  captureSelectors: ['[data-slot="master-row"]', '[data-slot="tooltip-content"]'],
  revealWaitSelectorForStory: () => '[data-slot="tooltip-content"]',
  // A disabled checkbox still takes focus — that is the state its tooltip opens in — but
  // hovering paints nothing extra once aria-disabled, so the recording story skips hover.
  statesForStory: (story) =>
    story === 'recording' ? ['resting', 'focus'] : ['resting', 'focus', 'hover'],
  // Checkbox renders a glyph only when checked (`ticked`) or indeterminate (`mixed`) — `resting`
  // and `recording` are both unticked, so they render no glyph.
  iconFontStory: (story) => story === 'mixed' || story === 'ticked',
});
