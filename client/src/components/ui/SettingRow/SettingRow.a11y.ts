import { runA11yStories } from '../../../a11y-helpers';
import { SETTING_ROW_STORY_IDS } from './SettingRow.story-ids';

// axe coverage for SettingRow — every control kind x {light,dark} x {resting,hover}. Only the
// select story renders a Material Symbols glyph (NativeSelect's decorative chevron).
runA11yStories({
  name: 'SettingRow',
  storyPrefix: 'ui-settingrow',
  storyIds: SETTING_ROW_STORY_IDS,
  slotSelector: '[data-slot="setting-row"]',
  iconFontStory: (story) => story === 'select',
});
