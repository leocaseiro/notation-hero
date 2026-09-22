import { runVrStories } from '../../../vr-helpers';
import { SHEET_STORY_IDS } from './Sheet.story-ids';

// The story is interactive (closed at rest — just the trigger). The meaningful visual is the open
// panel, so drive the `open` control via URL args and capture that. The panel (`sheet-content`) is a
// fixed full-height column; capture just it, not the trigger+panel union (which would frame mostly
// empty page) or the overlay scrim (which spans the viewport). The X close renders a Material
// Symbols `close` glyph, so assert the icon font loaded.
runVrStories({
  name: 'Sheet',
  storyPrefix: 'ui-sheet',
  snapshotSlug: 'sheet',
  storyIds: SHEET_STORY_IDS,
  slotSelector: '[data-slot="sheet-content"]',
  captureSelectors: ['[data-slot="sheet-content"]'],
  states: ['open'],
  openWaitSelector: '[data-slot="sheet-content"]',
  iconFontStory: () => true,
});
