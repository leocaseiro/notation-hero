import { runA11yStories } from '../../../a11y-helpers';
import { MENUBAR_STORY_IDS } from './Menubar.story-ids';

// axe coverage for Menubar — the stories are interactive, so `openArgs` opens one menu via the
// controlled `value` before axe runs (the two stories open different menus: File vs View). Base UI
// portals it OUTSIDE #storybook-root, so scope axe to 'body' to include it. The hover pass is
// skipped (already open). WithSelections renders the check / circle / chevron_right glyphs, so
// guard the icon font only for that one.
//
// aria-required-children is disabled for THIS suite only: while a menu is open, Base UI injects a
// visually-hidden `span[aria-owns]` as a direct child of `role="menubar"` to pull the portalled
// popup into the menubar's accessibility-tree order. axe flags the MENUBAR element (not the span)
// for having a non-menuitem child, so no child-level exclude can clear it — and removing the
// linkage would make the portalled menu read worse, not better.
runA11yStories({
  name: 'Menubar',
  storyPrefix: 'ui-menubar',
  storyIds: MENUBAR_STORY_IDS,
  slotSelector: '[data-slot="menubar-content"]',
  axeInclude: 'body',
  hoverStory: () => false,
  openArgs: (story) => (story === 'open' ? 'value:file' : 'value:view'),
  iconFontStory: (story) => story === 'with-selections',
  disableRules: ['aria-required-children'],
});
