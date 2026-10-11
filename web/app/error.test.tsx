import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { reportError } from '../lib/monitoring/report';
import AppError from './error';

vi.mock('../lib/monitoring/report', () => ({ reportError: vi.fn() }));

test('the error page reports the crash once, and says what a report leaves out', async () => {
  const error = new Error('render crash');
  const reset = vi.fn();
  render(<AppError error={error} reset={reset} />);

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
