import { runA11yStories } from '../../../a11y-helpers';
import { SETTING_ROW_STORY_IDS } from './SettingRow.story-ids';

// axe coverage for SettingRow — every control kind x {light,dark} x {resting,hover}. Two stories
// render a Material Symbols glyph: `select` always shows NativeSelect's decorative chevron, and
// `toggle` is checked (value: true), which mounts the Checkbox indicator's `check` glyph. The
// `disabled` story reuses the toggle kind but unchecked, so it renders no glyph.
runA11yStories({
  name: 'SettingRow',
  storyPrefix: 'ui-settingrow',
  storyIds: SETTING_ROW_STORY_IDS,
  slotSelector: '[data-slot="setting-row"]',
  iconFontStory: (story) => story === 'select' || story === 'toggle',
});
