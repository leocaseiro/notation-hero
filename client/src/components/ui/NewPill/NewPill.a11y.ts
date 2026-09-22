import { runA11yStories } from '../../../a11y-helpers';
import { NEW_PILL_STORY_IDS } from './NewPill.story-ids';

// axe coverage for NewPill — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'NewPill',
  storyPrefix: 'ui-newpill',
  storyIds: NEW_PILL_STORY_IDS,
  slotSelector: '[data-slot="new-pill"]',
});
