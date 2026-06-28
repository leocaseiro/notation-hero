import { render, screen } from '@testing-library/react';

import { NameCell } from './NameCell';
import type { CatalogRow } from '@/components/catalog/CatalogRow';

const base: CatalogRow = {
  id: '1',
  title: 'Billie Jean',
  subtitle: 'Pop · 4/4',
  kind: 'song',
  level: 3,
  bpm: 117,
  best: 74,
};

test('renders the title and subtitle (the two lines)', () => {
  render(<NameCell row={base} />);
  expect(screen.getByText('Billie Jean')).toBeInTheDocument();
  expect(screen.getByText('Pop · 4/4')).toBeInTheDocument();
});

test('shows a KindBadge for non-song kinds only', () => {
  const { rerender } = render(<NameCell row={base} />);
  expect(screen.queryByText('Beat')).not.toBeInTheDocument();
  rerender(<NameCell row={{ ...base, kind: 'beat' }} />);
  expect(screen.getByText('Beat')).toBeInTheDocument();
});

test('shows the New pill when isNew', () => {
  render(<NameCell row={{ ...base, isNew: true }} />);
  expect(screen.getByText('New')).toBeInTheDocument();
});

test('renders flags from row.flags', () => {
  render(<NameCell row={{ ...base, flags: { audio: true, parts: true } }} />);
  expect(screen.getByRole('img', { name: 'Has audio and parts' })).toBeInTheDocument();
});
