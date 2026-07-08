import { runVrStories } from '../../../vr-helpers';
import { SIDEBAR_STORY_IDS } from './Sidebar.story-ids';

// One resting snapshot per story x {light, dark}. The stories force the state via `defaultOpen`:
// `expanded` is the full-width column, `collapsed` is the icon rail (`collapsible="icon"`, so the
// rail stays on-screen rather than sliding off-canvas). The visible column is the fixed
// `sidebar-container`; capture that (a fixed full-height column) rather than the outer `sidebar`
// wrapper, whose box also covers the reserved gap. The nav items render Material Symbols icons, so
// assert the icon font loaded. VR runs at the default desktop viewport, so the mobile Sheet variant
// is never exercised here.
runVrStories({
  name: 'Sidebar',
  storyPrefix: 'ui-sidebar',
  snapshotSlug: 'sidebar',
  storyIds: SIDEBAR_STORY_IDS,
  slotSelector: '[data-slot="sidebar-container"]',
  captureSelectors: ['[data-slot="sidebar-container"]'],
  states: ['resting'],
  iconFontStory: () => true,
});
