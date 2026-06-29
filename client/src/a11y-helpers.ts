import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

import { A11Y_TAGS } from './a11y-tags';
import type { Page } from '@playwright/test';

// Shared axe assertion for every `*.a11y.ts` suite. Scopes axe to the story root (so future
// global Storybook chrome can't inject unrelated violations), runs the shared WCAG tag set, and
// fails with a readable per-node summary — the rule plus each node's measured contrast ratio and
// the two colors — so CI logs are actionable. Extracted here so the component a11y specs don't
// each carry a copy (which had already begun to drift).
export async function expectNoA11yViolations(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags([...A11Y_TAGS])
    .analyze();

  const report = violations
    .map(
      (v) =>
        `[${v.id}] ${v.help}\n` +
        v.nodes.map((n) => `    ${n.failureSummary?.replaceAll(/\s+/g, ' ').trim()}`).join('\n'),
    )
    .join('\n');

  expect(violations, `${label}\n${report}`).toEqual([]);
}
