import { runA11yStories } from '../../../a11y-helpers';
import { TRANSPORT_TOGGLE_STORY_IDS } from './TransportToggle.story-ids';

// axe coverage for TransportToggle — every story x {light,dark} x {resting,hover}. Every story
// renders a Material Symbols glyph, so assert the icon font loaded: the face is `font-display:
// block`, so a failed load renders BLANK, and axe is perfectly happy with a blank control. Skip
// hover on the disabled story (pointer-events-none makes it a no-op).
runA11yStories({
  name: 'TransportToggle',
  storyPrefix: 'ui-transporttoggle',
  storyIds: TRANSPORT_TOGGLE_STORY_IDS,
  slotSelector: '[data-slot="transport-toggle"]',
  iconFontStory: () => true,
  hoverStory: (story) => story !== 'disabled',
  // The with-tooltip story's hover pass opens the tooltip, which Base UI portals outside the
  // story root — widen the scope so axe audits the open panel too.
  axeInclude: 'body',
});
