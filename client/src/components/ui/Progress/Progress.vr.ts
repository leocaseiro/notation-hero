import { runVrStories } from '../../../vr-helpers';
import { PROGRESS_STORY_IDS } from './Progress.story-ids';

// VR for Progress — every story in light + dark. A progress bar has no focus or hover state. The
// helper freezes animations before snapshotting, so the indeterminate baseline guards the pulse
// keyframe's base frame only, not its trough.
runVrStories({
  name: 'Progress',
  storyPrefix: 'ui-progress',
  snapshotSlug: 'progress',
  storyIds: PROGRESS_STORY_IDS,
  slotSelector: '[data-slot="progress"]',
  states: ['resting'],
});
