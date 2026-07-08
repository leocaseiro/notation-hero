import { runA11yStories } from '../../../a11y-helpers';
import { SIDEBAR_STORY_IDS } from './Sidebar.story-ids';

// axe coverage for Sidebar — the desktop column renders inside #storybook-root (not portalled), so
// the default scope is fine; VR runs at a desktop viewport, so the mobile Sheet variant is not
// exercised. The nav items render Material Symbols icons, so assert the icon font loaded. The hover
// pass is skipped: hovering a collapsed menu button opens its Base UI tooltip (portalled,
// transient), which races axe and adds nothing over the resting nav.
runA11yStories({
  name: 'Sidebar',
  storyPrefix: 'ui-sidebar',
  storyIds: SIDEBAR_STORY_IDS,
  slotSelector: '[data-slot="sidebar-container"]',
  iconFontStory: () => true,
  hoverStory: () => false,
});
