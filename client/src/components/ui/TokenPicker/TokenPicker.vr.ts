import { runVrStories } from '../../../vr-helpers';
import { TOKEN_PICKER_STORY_IDS } from './TokenPicker.story-ids';

// VR for TokenPicker. Snapshot the whole canvas (#storybook-root) so the open suggestion panel is
// captured; wait for the always-present box first. Focusing the closed 'default' input opens the
// popover, so the focus snapshot captures the focused-open state.
runVrStories({
  name: 'TokenPicker',
  storyPrefix: 'ui-tokenpicker',
  filePrefix: 'tokenpicker',
  storyIds: TOKEN_PICKER_STORY_IDS,
  slotSelector: '#storybook-root',
  readySelector: '[data-slot="token-picker"]',
  states: ['resting', 'focus'],
  focusSelector: '[data-slot="token-picker"] input',
  stateStory: (story, state) => state === 'resting' || story === 'default',
});
