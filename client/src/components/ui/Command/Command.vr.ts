import { runVrStories } from '../../../vr-helpers';
import { COMMAND_STORY_IDS } from './Command.story-ids';

// VR for Command — the menu is directly visible (not in a popover), so snapshot its box in
// light + dark.
runVrStories({
  name: 'Command',
  storyPrefix: 'ui-command',
  filePrefix: 'command',
  storyIds: COMMAND_STORY_IDS,
  slotSelector: '[data-slot="command"]',
  states: ['resting'],
});
