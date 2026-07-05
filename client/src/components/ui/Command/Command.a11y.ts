import { runA11yStories } from '../../../a11y-helpers';
import { COMMAND_STORY_IDS } from './Command.story-ids';

// axe coverage for Command — every story x {light,dark} x {resting,hover}. cmdk provides the
// combobox/listbox/option roles; the input carries an accessible name. The default story renders
// Material Symbols glyphs on its items.
runA11yStories({
  name: 'Command',
  storyPrefix: 'ui-command',
  storyIds: COMMAND_STORY_IDS,
  slotSelector: '[data-slot="command"]',
  iconFontStory: (story) => story === 'default',
});
