import { runA11yStories } from '../../../a11y-helpers';
import { TOOLTIP_STORY_IDS } from './Tooltip.story-ids';

// axe coverage for Tooltip — the stories are interactive, so `openArgs` opens the panel via the
// `open` control before axe runs. Base UI portals it OUTSIDE #storybook-root, so scope axe to 'body'
// to include it. The hover pass is skipped (the panel is already open; hovering adds only flake).
runA11yStories({
  name: 'Tooltip',
  storyPrefix: 'ui-tooltip',
  storyIds: TOOLTIP_STORY_IDS,
  slotSelector: '[data-slot="tooltip-content"]',
  axeInclude: 'body',
  hoverStory: () => false,
  openArgs: 'open:!true',
});
