import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CatalogDataTable } from './catalog-table';
import type { CatalogItem } from '@notation-hero/shared';

const rows: CatalogItem[] = [
  {
    id: 'song_demo',
    slug: 'demo-song',
    title: 'Demo Song',
    kind: 'song',
    difficulty: 'Intermediate 4',
    level: 4,
  },
];

describe('CatalogDataTable', () => {
  it('renders a row from the data', () => {
    render(<CatalogDataTable data={rows} />);
    expect(screen.getByText('Demo Song')).toBeInTheDocument();
  });

  it('renders the empty state when there is no data', () => {
    render(<CatalogDataTable data={[]} />);
    expect(screen.getByText('No pieces found')).toBeInTheDocument();
  });
});
