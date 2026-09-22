import { runA11yStories } from '../../../a11y-helpers';
import { HOVER_CARD_STORY_IDS } from './HoverCard.story-ids';

// axe coverage for HoverCard — the story is interactive, so `openArgs` opens the card via the
// `open` control before axe runs. Radix portals it OUTSIDE #storybook-root, so scope axe to 'body'
// to include it. The hover pass is skipped (the panel is already open; hovering adds only flake).
runA11yStories({
  name: 'HoverCard',
  storyPrefix: 'ui-hovercard',
  storyIds: HOVER_CARD_STORY_IDS,
  slotSelector: '[data-slot="hover-card-content"]',
  axeInclude: 'body',
  hoverStory: () => false,
  openArgs: 'open:!true',
});
