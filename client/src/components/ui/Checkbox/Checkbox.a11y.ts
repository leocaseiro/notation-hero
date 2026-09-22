import { runA11yStories } from '../../../a11y-helpers';
import { CHECKBOX_STORY_IDS } from './Checkbox.story-ids';

// axe coverage for Checkbox — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. The indicator glyph uses the Material Symbols
// font, so assert that font actually loaded for every story. See
// client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Checkbox',
  storyPrefix: 'ui-checkbox',
  storyIds: CHECKBOX_STORY_IDS,
  slotSelector: '[data-slot="checkbox"]',
  // Only stories that actually paint the check glyph load the Material Symbols
  // font; asserting the font on glyph-less (unchecked) stories fails spuriously.
  iconFontStory: (story) => ['checked', 'indeterminate', 'disabled-checked'].includes(story),
});
