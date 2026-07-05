import { runA11yStories } from '../../../a11y-helpers';
import { NATIVE_SELECT_STORY_IDS } from './NativeSelect.story-ids';

// axe coverage for NativeSelect — the shared runA11yStories factory runs every
// story x {light,dark} x {resting,hover}. Every story renders the Material
// Symbols chevron, so `iconFontStory: () => true` asserts the icon font loaded
// (a failed load can't silently pass as ligature fallback text). See
// client/src/a11y-helpers.ts.
runA11yStories({
  name: 'NativeSelect',
  storyPrefix: 'ui-nativeselect',
  storyIds: NATIVE_SELECT_STORY_IDS,
  slotSelector: '[data-slot="native-select"]',
  iconFontStory: () => true,
  // The disabled select sets `pointer-events-none`, so Playwright can't hover it.
  hoverStory: (story) => story !== 'disabled',
});
