import { runA11yStories } from '../../../a11y-helpers';
import { ACCORDION_STORY_IDS } from './Accordion.story-ids';

// axe coverage for Accordion — every story x {light,dark} x {resting,hover}. Every trigger renders
// the chevron glyph, so assert the icon font loaded on every story.
runA11yStories({
  name: 'Accordion',
  storyPrefix: 'ui-accordion',
  storyIds: ACCORDION_STORY_IDS,
  slotSelector: '[data-slot="accordion"]',
  iconFontStory: () => true,
});
