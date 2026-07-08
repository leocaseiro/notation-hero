import { runA11yStories } from '../../../a11y-helpers';
import { DROPDOWN_MENU_STORY_IDS } from './DropdownMenu.story-ids';

// axe coverage for DropdownMenu — the stories are interactive, so `openArgs` opens the menu via the
// `open` control before axe runs. Radix portals it OUTSIDE #storybook-root, so scope axe to 'body'
// to include it. The hover pass is skipped (already open). The checkbox/radio and submenu stories
// render Material Symbols glyphs; the plain-text Open story has no glyph to guard.
runA11yStories({
  name: 'DropdownMenu',
  storyPrefix: 'ui-dropdownmenu',
  storyIds: DROPDOWN_MENU_STORY_IDS,
  slotSelector: '[data-slot="dropdown-menu-content"]',
  axeInclude: 'body',
  hoverStory: () => false,
  openArgs: 'open:!true',
  iconFontStory: (story) => story !== 'open',
});
