import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { APP_VERSION } from '../../lib/app-version';
import { PlayerHeader } from './PlayerHeader';

const props = {
  scoreTitle: 'Rock Beat 1',
  fileName: '1-beat.gp',
  scoreTempo: 120,
  speed: 1,
  onSpeedChange: () => {},
  disabled: false,
};

test('the wordmark is a link home, so it does something and can take focus', () => {
  render(<PlayerHeader {...props} />);

  const wordmark = screen.getByTestId('app-wordmark');

  expect(wordmark).toHaveAccessibleName('Notation Hero');
  // A bare '/' on purpose: next/link prefixes `basePath` itself, so a sub-path deploy needs no
  // change here. Asserting the literal is what would catch someone hard-coding a prefix.
  expect(wordmark).toHaveAttribute('href', '/');
});

test('hovering the wordmark reveals which build is running', async () => {
  const user = userEvent.setup();
  render(<PlayerHeader {...props} />);

  await user.hover(screen.getByTestId('app-wordmark'));

  expect(await screen.findByText(APP_VERSION)).toBeInTheDocument();
});

test('the version is reachable by keyboard, not by hover alone', async () => {
  const user = userEvent.setup();
  render(<PlayerHeader {...props} />);

  // Tab lands on the wordmark first — it is the header's first interactive element. A tooltip on
  // a non-focusable span would leave the version available to a mouse only.
  await user.tab();

  expect(screen.getByTestId('app-wordmark')).toHaveFocus();
  expect(await screen.findByText(APP_VERSION)).toBeInTheDocument();
});
