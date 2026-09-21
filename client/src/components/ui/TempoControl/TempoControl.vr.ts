import { runVrStories } from '../../../vr-helpers';
import { TEMPO_CONTROL_STORY_IDS } from './TempoControl.story-ids';

// VR for TempoControl — every story in light + dark x {resting, focus, hover}. The `slowed`
// story's hover and focus snapshots are what guard the visible percentage; `resting` guards its
// absence. The 3 s linger needs no snapshot of its own: it is the same painted state, reached by a
// different trigger.
//
// The readout's tooltip is PORTALLED outside the pill, so the default slot-only clip crops it away
// entirely — and worse, measures the clip while the portal is still committing, which is how a
// hover baseline gets blessed with the panel half-painted. Capture the padded union of the pill
// and the panel and wait for the panel first, the shape TransportToggle.vr.ts uses.
runVrStories({
  name: 'TempoControl',
  storyPrefix: 'ui-tempocontrol',
  snapshotSlug: 'tempocontrol',
  storyIds: TEMPO_CONTROL_STORY_IDS,
  slotSelector: '[data-slot="tempo-control"]',
  captureSelectors: ['[data-slot="tempo-control"]', '[data-slot="tooltip-content"]'],
  // Hover the READOUT, not the pill. The pill's centre lands on the readout's input, and hovering
  // that did not open the tooltip at all — the four hover snapshots timed out waiting 30 s for the
  // panel, while the focus ones opened it fine. Aiming at the trigger itself is what makes the
  // hover state reach the same panel the focus state does.
  hoverSelector: '[data-slot="tempo-readout"]',
  // Not on `disabled`: the tooltip's trigger is inside a control nothing can focus or hover there.
  revealWaitSelectorForStory: (story) =>
    story === 'disabled' ? undefined : '[data-slot="tooltip-content"]',
  states: ['resting', 'focus', 'hover'],
  // The disabled input is natively disabled, so nothing in the control takes focus.
  statesForStory: (story) => (story === 'disabled' ? ['resting'] : ['resting', 'focus', 'hover']),
  // One Tab reaches the input: Base UI gives both steppers tabindex="-1" on purpose, because a
  // keyboard user steps with the arrow keys inside the input.
  focusExpect: 'input',
  iconFontStory: () => true,
});
