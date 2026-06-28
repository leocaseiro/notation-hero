import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayButton } from './PlayButton';

test('has an accessible "Play {title}" name', () => {
  render(<PlayButton title="Billie Jean" />);
  expect(screen.getByRole('button', { name: 'Play Billie Jean' })).toBeInTheDocument();
});

test('exposes a 44px hit area (WCAG 2.5.5, AAA — manual requirement)', () => {
  render(<PlayButton title="X" />);
  expect(screen.getByRole('button', { name: 'Play X' })).toHaveClass('size-11');
});

test('plays and stops propagation so the row does not also open', async () => {
  const user = userEvent.setup();
  const onPlay = vi.fn();
  const onRow = vi.fn();
  render(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- test-only row stand-in
    <div onClick={onRow}>
      <PlayButton title="X" onClick={onPlay} />
    </div>,
  );
  await user.click(screen.getByRole('button', { name: 'Play X' }));
  expect(onPlay).toHaveBeenCalledTimes(1);
  expect(onRow).not.toHaveBeenCalled();
});
