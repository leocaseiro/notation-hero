import { render, screen } from '@testing-library/react';
import { LevelPill } from './LevelPill';

test('shows the level number with a "Level" label', () => {
  render(<LevelPill level={3} />);
  expect(screen.getByRole('img', { name: 'Level: 3' })).toHaveTextContent('3');
});

test('level 0 is Debut — accent text on a neutral pill', () => {
  render(<LevelPill level={0} />);
  const pill = screen.getByRole('img', { name: 'Debut' });
  expect(pill).toHaveTextContent('Debut');
  expect(pill).toHaveClass('text-level-debut');
});

test('null is Ungraded (never a bare dash as the accessible name)', () => {
  render(<LevelPill level={null} />);
  expect(screen.getByRole('img', { name: 'Ungraded' })).toHaveTextContent('–');
});
