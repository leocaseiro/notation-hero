import { render, screen } from '@testing-library/react';
import { ScoreDonut } from './ScoreDonut';

test('renders the score number with a "Best score" label', () => {
  render(<ScoreDonut score={74} />);
  const donut = screen.getByRole('img', { name: 'Best score: 74' });
  expect(donut).toBeInTheDocument();
  expect(donut).toHaveTextContent('74');
});

test('null is "Not attempted" and shows a dash', () => {
  render(<ScoreDonut score={null} />);
  const donut = screen.getByRole('img', { name: 'Not attempted' });
  expect(donut).toHaveAttribute('data-band', 'none');
  expect(donut).toHaveTextContent('–');
});

test('zero renders the same empty state as null (spec F1)', () => {
  render(<ScoreDonut score={0} />);
  const donut = screen.getByRole('img', { name: 'Not attempted' });
  expect(donut).toHaveAttribute('data-band', 'none');
});

test('100 is mastered: "Best score: 100", gold band, trophy glyph, no number', () => {
  render(<ScoreDonut score={100} />);
  const donut = screen.getByRole('img', { name: 'Best score: 100' });
  expect(donut).toHaveAttribute('data-band', 'mastered');
  expect(donut).toHaveTextContent('trophy'); // Material Symbols ligature
  expect(donut).not.toHaveTextContent('100');
});

test('band thresholds: 49 low, 50 developing, 69 developing, 70 climbing', () => {
  const { rerender } = render(<ScoreDonut score={49} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'low');
  rerender(<ScoreDonut score={50} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'developing');
  rerender(<ScoreDonut score={69} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'developing');
  rerender(<ScoreDonut score={70} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'climbing');
});

test('locks the 88/89 cut: 88 climbing, 89 high', () => {
  const { rerender } = render(<ScoreDonut score={88} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'climbing');
  rerender(<ScoreDonut score={89} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'high');
});
