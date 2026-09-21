import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { APP_VERSION } from '../../lib/app-version';
import { PlayerHeader } from './PlayerHeader';

// `useRouter` throws outside an app router, which jsdom has none of. Back is the only thing in
// this header that navigates, and both of its paths are asserted below.
const back = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }));

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

  // Two tabs: Back is the header's first interactive element and the logo the second. A tooltip on
  // a non-focusable span would leave the version available to a mouse only.
  await user.tab();
  await user.tab();

  expect(screen.getByTestId('app-wordmark')).toHaveFocus();
  expect(await screen.findByText(APP_VERSION)).toBeInTheDocument();
});

test('Back retraces a step when there is one to retrace', async () => {
  const user = userEvent.setup();
  back.mockClear();
  push.mockClear();
  // jsdom starts every test with a history of length 1, so give it something to go back to.
  globalThis.history.pushState({}, '', '/play');
  render(<PlayerHeader {...props} />);

  await user.click(screen.getByTestId('back-home'));

  expect(back).toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

// A tab opened straight onto /play — a bookmark, a shared link — has nothing behind it, and
// `back()` there is a silently dead control. The landing page is the fallback.
test('Back goes home when there is no history behind this page', async () => {
  const user = userEvent.setup();
  back.mockClear();
  push.mockClear();
  vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(1);
  render(<PlayerHeader {...props} />);

  await user.click(screen.getByTestId('back-home'));

  expect(push).toHaveBeenCalledWith('/');
  expect(back).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
