import { runA11yStories } from '../../../a11y-helpers';
import { TOKEN_PICKER_STORY_IDS } from './TokenPicker.story-ids';

// axe coverage for TokenPicker — every story x {light,dark} x {resting,hover}. The open stories
// render the suggestion popover inline, so axe also checks the input, chips (remove buttons) and
// suggestion buttons. The empty story renders no glyph, so skip the icon-font assertion there.
runA11yStories({
  name: 'TokenPicker',
  storyPrefix: 'ui-tokenpicker',
  storyIds: TOKEN_PICKER_STORY_IDS,
  slotSelector: '[data-slot="token-picker"]',
  iconFontStory: (story) => story !== 'empty',
});
