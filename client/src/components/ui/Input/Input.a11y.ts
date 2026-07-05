import { runA11yStories } from '../../../a11y-helpers';
import { INPUT_STORY_IDS } from './Input.story-ids';

// axe coverage for Input — the shared runA11yStories factory runs every story x
// {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'Input',
  storyPrefix: 'ui-input',
  storyIds: INPUT_STORY_IDS,
  slotSelector: '[data-slot="input"]',
  // The disabled input sets `pointer-events-none`, so Playwright can't hover it —
  // skip the hover pass (a disabled field has no distinct hover state anyway).
  hoverStory: (story) => story !== 'disabled',
});
