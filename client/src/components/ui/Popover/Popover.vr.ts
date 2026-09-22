import { runVrStories } from '../../../vr-helpers';
import { POPOVER_STORY_IDS } from './Popover.story-ids';

// VR for Popover. The 'open' story renders the panel open (defaultOpen), so capture the padded union
// of the trigger + the portalled panel (data-slot="popover-content", portalled into #storybook-root).
// The 'closed' story has no panel — its clip is just the trigger button. The trigger has no data-slot,
// so target it by its aria-haspopup (a bare 'button' matched a hidden Storybook control).
runVrStories({
  name: 'Popover',
  storyPrefix: 'ui-popover',
  snapshotSlug: 'popover',
  storyIds: POPOVER_STORY_IDS,
  slotSelector: '[aria-haspopup="dialog"]',
  captureSelectors: ['[aria-haspopup="dialog"]', '[data-slot="popover-content"]'],
  states: ['resting'],
});
