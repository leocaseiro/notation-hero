// WCAG levels axe checks — shared by the a11y CI gate (Button.a11y.ts) and the
// Storybook a11y panel (.storybook/preview.tsx) so the two can't drift.
export const A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;
