import { runVrStories } from '../../../vr-helpers';
import { ACCORDION_STORY_IDS } from './Accordion.story-ids';

// VR for Accordion — every story in light + dark x {resting, focus, hover}. The root is a plain,
// non-focusable `<div>` (data-slot="accordion"), so focus and hover both target the first
// trigger instead of the slot default.
runVrStories({
  name: 'Accordion',
  storyPrefix: 'ui-accordion',
  snapshotSlug: 'accordion',
  storyIds: ACCORDION_STORY_IDS,
  slotSelector: '[data-slot="accordion"]',
  states: ['resting', 'focus', 'hover'],
  focusExpect: '[data-slot="accordion-trigger"]',
  hoverSelector: '[data-slot="accordion-trigger"]',
  iconFontStory: () => true,
});
