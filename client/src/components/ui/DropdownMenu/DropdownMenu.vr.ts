import { runVrStories } from '../../../vr-helpers';
import { DROPDOWN_MENU_STORY_IDS } from './DropdownMenu.story-ids';

// The stories are interactive (closed at rest). `resting` guards the trigger + that the menu is NOT
// showing; `open` drives the `open` control via URL args so the panel shows deterministically.
// Radix portals the content outside the slot, so capture the padded union of the trigger + the
// portalled panel (not the whole viewport). The icon-font FAMILY check is left to the a11y suite
// (which always opens the menu so the check / circle / chevron glyphs render); here the `open`
// snapshot is the real guard against a glyph falling back to literal text.
runVrStories({
  name: 'DropdownMenu',
  storyPrefix: 'ui-dropdownmenu',
  snapshotSlug: 'dropdown-menu',
  storyIds: DROPDOWN_MENU_STORY_IDS,
  slotSelector: '[data-slot="dropdown-menu-trigger"]',
  captureSelectors: ['[data-slot="dropdown-menu-trigger"]', '[data-slot="dropdown-menu-content"]'],
  states: ['resting', 'open'],
  openWaitSelector: '[data-slot="dropdown-menu-content"]',
});
