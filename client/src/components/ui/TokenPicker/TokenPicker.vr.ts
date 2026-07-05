import { runVrStories } from '../../../vr-helpers';
import { TOKEN_PICKER_STORY_IDS } from './TokenPicker.story-ids';

// VR for TokenPicker. Snapshot the whole canvas (#storybook-root) so the open combobox panel + the
// selected badges are captured; wait for the always-present box first.
runVrStories({
  name: 'TokenPicker',
  storyPrefix: 'ui-tokenpicker',
  filePrefix: 'tokenpicker',
  storyIds: TOKEN_PICKER_STORY_IDS,
  slotSelector: '#storybook-root',
  readySelector: '[data-slot="token-picker"]',
  states: ['resting'],
});
