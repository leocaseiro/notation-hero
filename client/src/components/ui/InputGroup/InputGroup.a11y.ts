import { runA11yStories } from '../../../a11y-helpers';
import { INPUT_GROUP_STORY_IDS } from './InputGroup.story-ids';

// axe coverage for InputGroup — the shared runA11yStories factory runs every story
// x {light,dark} x {resting,hover}. See client/src/a11y-helpers.ts.
runA11yStories({
  name: 'InputGroup',
  storyPrefix: 'ui-inputgroup',
  storyIds: INPUT_GROUP_STORY_IDS,
  slotSelector: '[data-slot="input-group"]',
  // with-button and disabled also render a Material Symbols glyph (visibility),
  // not just the *icon* stories.
  iconFontStory: (story) =>
    story.includes('icon') || story === 'with-button' || story === 'disabled',
});
