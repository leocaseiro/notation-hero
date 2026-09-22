import { runVrStories } from '../../../vr-helpers';
import { SETTING_ROW_STORY_IDS } from './SettingRow.story-ids';

// The row itself (`[data-slot="setting-row"]`) is a non-focusable `<div role="group">`, and each
// control kind renders a different focusable element (checkbox span, input, select, button) — this
// selector reaches whichever one the story renders, matching the Accordion precedent
// (Accordion.vr.ts) of pointing focus/hover at the real interactive descendant instead of the
// non-focusable slot.
const CONTROL_SELECTOR = '[data-slot="setting-row"] :is(input, select, button, [role="checkbox"])';

// VR for SettingRow — every control kind in light + dark x {resting, focus, hover}, so every
// branch of the component carries a pixel baseline.
runVrStories({
  name: 'SettingRow',
  storyPrefix: 'ui-settingrow',
  snapshotSlug: 'settingrow',
  storyIds: SETTING_ROW_STORY_IDS,
  slotSelector: '[data-slot="setting-row"]',
  states: ['resting', 'focus', 'hover'],
  focusExpect: CONTROL_SELECTOR,
  hoverSelector: CONTROL_SELECTOR,
  // A disabled row's control can't take focus and paints no hover style.
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover']),
  // Only the select story renders NativeSelect's decorative chevron glyph.
  iconFontStory: (story) => story === 'select',
});
