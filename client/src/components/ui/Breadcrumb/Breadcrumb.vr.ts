import { runVrStories } from '../../../vr-helpers';
import { BREADCRUMB_STORY_IDS } from './Breadcrumb.story-ids';

// Breadcrumb links are interactive, so capture resting + hover + focus in both themes.
// Hover targets the first link; focus is driven by a Tab press (so `:focus-visible` matches) and
// `focusExpect` asserts it actually landed on the first link before snapshotting. The captured
// clip is the nav's box plus padding, so the UA focus outline (which overflows the link box)
// stays in frame. The chevron/ellipsis stories render Material Symbols glyphs — assert the icon
// font loaded for those; the custom-separator story uses a plain "/" so it has no glyph to guard.
runVrStories({
  name: 'Breadcrumb',
  storyPrefix: 'ui-breadcrumb',
  snapshotSlug: 'breadcrumb',
  storyIds: BREADCRUMB_STORY_IDS,
  slotSelector: '[data-slot="breadcrumb"]',
  states: ['resting', 'hover', 'focus'],
  hoverSelector: '[data-slot="breadcrumb-link"]',
  focusExpect: '[data-slot="breadcrumb-link"]',
  iconFontStory: (story) => story !== 'custom-separator',
});
