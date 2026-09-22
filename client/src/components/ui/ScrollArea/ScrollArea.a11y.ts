import { runA11yStories } from '../../../a11y-helpers';
import { SCROLL_AREA_STORY_IDS } from './ScrollArea.story-ids';

// axe coverage for ScrollArea — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. The content is not portalled (the bar renders inside the slot),
// so the default '#storybook-root' scope is fine.
runA11yStories({
  name: 'ScrollArea',
  storyPrefix: 'ui-scrollarea',
  storyIds: SCROLL_AREA_STORY_IDS,
  slotSelector: '[data-slot="scroll-area"]',
});
