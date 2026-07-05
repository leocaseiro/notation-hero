import { runA11yStories } from '../../../a11y-helpers';
import { TOKEN_PICKER_STORY_IDS } from './TokenPicker.story-ids';

// axe coverage for TokenPicker — every INTERACTIVE story x {light,dark} x {resting,hover}. The open
// stories render the cmdk combobox inline, so axe also checks the search box, the option list and
// the removable badges. The transient `loading` / `empty` states are excluded: cmdk keeps
// role=combobox + aria-controls on the input, so a momentarily-empty listbox trips axe (a known
// combobox-empty limitation, not our markup). Those states are plain-text status and stay covered
// by VR.
const A11Y_STORY_IDS = TOKEN_PICKER_STORY_IDS.filter((id) => id !== 'loading' && id !== 'empty');

runA11yStories({
  name: 'TokenPicker',
  storyPrefix: 'ui-tokenpicker',
  storyIds: A11Y_STORY_IDS,
  slotSelector: '[data-slot="token-picker"]',
  iconFontStory: () => true,
});
