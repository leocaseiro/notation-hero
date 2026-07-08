import { runVrStories } from '../../../vr-helpers';

import { SONNER_STORY_IDS } from './Sonner.story-ids';

// Visual coverage for Sonner: every story x {light, dark}. Story IDs come from the
// shared Sonner.story-ids list, so VR and a11y stay in lockstep with Sonner.stories.tsx.
// The toast is portalled (position:fixed region outside #storybook-root). Most stories fire
// exactly one persistent (duration: Infinity) toast, so [data-sonner-toast].first() is both the
// wait target and the capture region. The stack / stack-expanded stories fire several and override
// the capture to the whole [data-sonner-toaster] region (see captureSelectorsForStory).
// The colored Scope 4 states ARE the resting frames of success/error-toast/warning in
// both themes. Hover/focus only exist on the action button (with-action story).
runVrStories({
  name: 'Sonner',
  storyPrefix: 'ui-sonner',
  snapshotSlug: 'sonner',
  storyIds: SONNER_STORY_IDS,
  slotSelector: '[data-sonner-toast]',
  states: ['resting'],
  statesForStory: (story) =>
    story === 'with-action' ? ['resting', 'hover', 'focus'] : ['resting'],
  // The stack stories render multiple toasts; capture the whole toaster region so the pile is
  // framed (the default [data-sonner-toast].first() would clip to just the front toast).
  captureSelectorsForStory: (story) =>
    story === 'stack' || story === 'stack-expanded' ? ['[data-sonner-toaster]'] : undefined,
  hoverSelector: '[data-action]',
  // Tab #1 lands on the toast <li> (tabIndex 0); #2 reaches the action button,
  // whose new 3px design-system ring these frames pixel-guard.
  focusTabs: 2,
  focusExpect: '[data-action]',
});
