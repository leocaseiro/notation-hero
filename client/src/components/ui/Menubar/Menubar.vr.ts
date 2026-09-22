import { runVrStories } from '../../../vr-helpers';
import { MENUBAR_STORY_IDS } from './Menubar.story-ids';

// The stories are interactive (all menus closed at rest). `resting` guards the bar + that no menu
// is showing; `open` drives the controlled `value` via URL args so one menu shows deterministically
// — the two stories open different menus (File vs View), so `openArgs` is per-story. Radix portals
// the content outside the slot, so capture the padded union of the bar + the portalled panel. The
// icon-font FAMILY check is left to the a11y suite (which always opens the menu so the glyphs
// render); here the `open` snapshot is the real guard against a glyph falling back to literal text.
runVrStories({
  name: 'Menubar',
  storyPrefix: 'ui-menubar',
  snapshotSlug: 'menubar',
  storyIds: MENUBAR_STORY_IDS,
  slotSelector: '[data-slot="menubar"]',
  captureSelectors: ['[data-slot="menubar"]', '[data-slot="menubar-content"]'],
  states: ['resting', 'open'],
  openWaitSelector: '[data-slot="menubar-content"]',
  openArgs: (story) => (story === 'open' ? 'value:file' : 'value:view'),
});
