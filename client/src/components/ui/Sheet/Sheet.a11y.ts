import { runA11yStories } from '../../../a11y-helpers';
import { SHEET_STORY_IDS } from './Sheet.story-ids';

// axe coverage for Sheet — the story is interactive, so `openArgs` opens the panel via the `open`
// control before axe runs. Radix portals it OUTSIDE #storybook-root, so scope axe to 'body' to
// include it. The hover pass is skipped (already open). `modal={false}` keeps the story page from
// being aria-hidden around the panel. The X close renders a Material Symbols `close` glyph, so guard
// the icon font.
runA11yStories({
  name: 'Sheet',
  storyPrefix: 'ui-sheet',
  storyIds: SHEET_STORY_IDS,
  slotSelector: '[data-slot="sheet-content"]',
  axeInclude: 'body',
  hoverStory: () => false,
  openArgs: 'open:!true',
  iconFontStory: () => true,
});
