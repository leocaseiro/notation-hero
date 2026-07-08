import { runA11yStories } from '../../../a11y-helpers';
import { CARD_STORY_IDS } from './Card.story-ids';

// axe coverage for Card — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Card',
  storyPrefix: 'ui-card',
  storyIds: CARD_STORY_IDS,
  slotSelector: '[data-slot="card"]',
  iconFontStory: (story) => story === 'with-action' || story === 'full',
});
