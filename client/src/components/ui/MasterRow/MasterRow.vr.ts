import { runVrStories } from '../../../vr-helpers';
import { MASTER_ROW_STORY_IDS } from './MasterRow.story-ids';

// VR for MasterRow — every story in light + dark x {resting, focus, hover}. One Tab reaches the
// solo-all button (it is the first stop; the leading cell is empty in the stories). The tooltip
// is PORTALLED outside the row, so capture the padded union of the row + the panel and wait for
// the panel to mount.
runVrStories({
  name: 'MasterRow',
  storyPrefix: 'ui-masterrow',
  snapshotSlug: 'masterrow',
  storyIds: MASTER_ROW_STORY_IDS,
  slotSelector: '[data-slot="master-row"]',
  states: ['resting', 'focus', 'hover'],
  focusTabs: 1,
  focusExpect: 'button',
  hoverSelector: 'button',
  captureSelectors: ['[data-slot="master-row"]', '[data-slot="tooltip-content"]'],
  revealWaitSelectorForStory: () => '[data-slot="tooltip-content"]',
  // A disabled button still takes focus — that is the state its tooltip opens in — but hovering
  // paints nothing extra once aria-disabled, so the recording story skips hover.
  statesForStory: (story) =>
    story === 'recording' ? ['resting', 'focus'] : ['resting', 'focus', 'hover'],
  iconFontStory: () => true,
});
