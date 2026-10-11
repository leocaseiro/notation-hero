import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { reportError } from '../lib/monitoring/report';
import GlobalError from './global-error';

vi.mock('../lib/monitoring/report', () => ({ reportError: vi.fn() }));

// Rendering a whole document inside the test's <div> prints one development warning, <html>
// inside a <div>. It does not fail the test.
test('the root error page reports the crash once, and says what a report leaves out', async () => {
  const error = new Error('root layout crash');
  const reset = vi.fn();
  render(<GlobalError error={error} reset={reset} />);

  // React places a <title> in the document head wherever it is rendered.
  expect(document.title).toBe('Notation Hero');
  expect(
    screen.getByText(
      'Errors are reported automatically — without your file, its name, or the music in it. Try again, or reload the page.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('Error E901')).toBeInTheDocument();
  expect(vi.mocked(reportError).mock.calls).toEqual([[error, { code: 'E901', handled: false }]]);

  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reset).toHaveBeenCalledOnce();
});
