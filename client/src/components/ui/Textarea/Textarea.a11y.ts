import { runA11yStories } from '../../../a11y-helpers';
import { TEXTAREA_STORY_IDS } from './Textarea.story-ids';

// axe coverage for Textarea — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Textarea',
  storyPrefix: 'ui-textarea',
  storyIds: TEXTAREA_STORY_IDS,
  slotSelector: '[data-slot="textarea"]',
});
