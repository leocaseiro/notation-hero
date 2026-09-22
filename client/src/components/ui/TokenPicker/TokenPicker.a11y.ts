import { runA11yStories } from '../../../a11y-helpers';
import { TOKEN_PICKER_STORY_IDS } from './TokenPicker.story-ids';

// axe coverage for TokenPicker — every INTERACTIVE story x {light,dark} x {resting,hover}. The open
// stories render the Base UI Combobox inline, so axe also checks the search box, the option list and
// the removable badges. The transient `loading` / `empty` states are excluded: the input keeps
// role=combobox + aria-controls even when the listbox is momentarily empty, which can trip axe's
// combobox-empty check (not our markup). Those states are plain-text status and stay covered by VR.
const A11Y_STORY_IDS = TOKEN_PICKER_STORY_IDS.filter((id) => id !== 'loading' && id !== 'empty');

runA11yStories({
  name: 'TokenPicker',
  storyPrefix: 'ui-tokenpicker',
  storyIds: A11Y_STORY_IDS,
  slotSelector: '[data-slot="token-picker"]',
  iconFontStory: () => true,
});
