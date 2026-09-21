import { runA11yStories } from '../../../a11y-helpers';
import { TEMPO_CONTROL_STORY_IDS } from './TempoControl.story-ids';

// axe coverage for TempoControl — every story x {light,dark} x {resting,hover}. Every story
// renders the two stepper glyphs, so assert the icon font loaded: a failed load renders blank, and
// axe is perfectly happy with a blank control. The hover pass on `slowed` audits the revealed
// percentage.
runA11yStories({
  name: 'TempoControl',
  storyPrefix: 'ui-tempocontrol',
  storyIds: TEMPO_CONTROL_STORY_IDS,
  slotSelector: '[data-slot="tempo-control"]',
  iconFontStory: () => true,
});
