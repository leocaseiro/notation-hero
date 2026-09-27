import { runA11yStories } from '../../../a11y-helpers';
import { TRACK_ROW_STORY_IDS } from './TrackRow.story-ids';

// axe coverage for TrackRow — every story x {light,dark} x {resting,hover}. Every story renders
// Material Symbols glyphs (every toggle carries one, always). `axeInclude: 'body'` widens the
// scope to the portalled tooltip a hover/focus can open, which Base UI renders OUTSIDE the row.
runA11yStories({
  name: 'TrackRow',
  storyPrefix: 'ui-trackrow',
  storyIds: TRACK_ROW_STORY_IDS,
  slotSelector: '[data-slot="track-row"]',
  iconFontStory: () => true,
  axeInclude: 'body',
});
