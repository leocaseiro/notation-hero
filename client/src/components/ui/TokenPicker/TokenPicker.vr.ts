import { runVrStories } from '../../../vr-helpers';
import { TOKEN_PICKER_STORY_IDS } from './TokenPicker.story-ids';

// VR for TokenPicker. The open stories render the suggestion list open (defaultOpen), so capture the
// padded union of the chips box + the portalled panel (Base UI portals it into #storybook-root). The
// closed 'default' story has no panel — its clip is just the box with its selected chips.
runVrStories({
  name: 'TokenPicker',
  storyPrefix: 'ui-tokenpicker',
  snapshotSlug: 'tokenpicker',
  storyIds: TOKEN_PICKER_STORY_IDS,
  slotSelector: '[data-slot="token-picker"]',
  captureSelectors: ['[data-slot="token-picker"]', '[data-slot="token-picker-content"]'],
  states: ['resting'],
});
