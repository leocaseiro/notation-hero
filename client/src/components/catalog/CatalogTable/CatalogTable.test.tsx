import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogTable } from './CatalogTable';
import type { CatalogRow } from '@/components/catalog/CatalogRow';

const rows: CatalogRow[] = [
  { id: '1', title: 'Billie Jean', subtitle: 'Pop', kind: 'song', level: 3, bpm: 117, best: 74 },
  {
    id: '2',
    title: 'Paradiddle',
    subtitle: 'Rudiment',
    kind: 'rudiment',
    level: 1,
    bpm: '60→120',
    best: null,
  },
];

test('renders a row per catalog piece', () => {
  render(<CatalogTable data={rows} />);
  expect(screen.getByText('Billie Jean')).toBeInTheDocument();
  expect(screen.getByText('Paradiddle')).toBeInTheDocument();
});

test('shows the catalog empty message', () => {
  render(<CatalogTable data={[]} />);
  expect(screen.getByText('No pieces found — adjust your filters')).toBeInTheDocument();
});

test('row click opens the piece', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  render(<CatalogTable data={rows} onOpen={onOpen} />);
  await user.click(screen.getByText('Billie Jean'));
  expect(onOpen).toHaveBeenCalledWith(rows[0]);
});

test('play click plays without also opening the row', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  const onPlay = vi.fn();
  render(<CatalogTable data={rows} onOpen={onOpen} onPlay={onPlay} />);
  await user.click(screen.getByRole('button', { name: 'Play Billie Jean' }));
  expect(onPlay).toHaveBeenCalledWith(rows[0]);
  expect(onOpen).not.toHaveBeenCalled();
});

test('play via keyboard plays without also opening the row', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  const onPlay = vi.fn();
  render(<CatalogTable data={rows} onOpen={onOpen} onPlay={onPlay} />);
  screen.getByRole('button', { name: 'Play Billie Jean' }).focus();
  await user.keyboard('[Enter]');
  expect(onPlay).toHaveBeenCalledWith(rows[0]);
  expect(onOpen).not.toHaveBeenCalled();
});
