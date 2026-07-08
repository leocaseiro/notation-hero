import { render, screen } from '@testing-library/react';

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './Breadcrumb';

test('renders a labelled breadcrumb nav with a link and the current page', () => {
  render(
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/catalog">Catalog</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Section 2</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>,
  );

  expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/catalog');

  const current = screen.getByText('Section 2');
  expect(current).toHaveAttribute('aria-current', 'page');
  expect(current).toHaveAttribute('data-slot', 'breadcrumb-page');
  // The current-page leaf is a non-navigable label: role=link but aria-disabled.
  expect(current).toHaveAttribute('role', 'link');
  expect(current).toHaveAttribute('aria-disabled', 'true');
});

test('BreadcrumbSeparator renders custom children instead of the default chevron', () => {
  render(<BreadcrumbSeparator>/</BreadcrumbSeparator>);
  const separator = screen.getByText('/');
  expect(separator).toHaveAttribute('data-slot', 'breadcrumb-separator');
  expect(separator).toHaveAttribute('aria-hidden', 'true');
  // Custom child wins: the default `chevron_right` glyph must not also render.
  expect(screen.queryByText('chevron_right')).not.toBeInTheDocument();
});

test('BreadcrumbEllipsis is presentational with an sr-only label', () => {
  render(<BreadcrumbEllipsis />);
  const ellipsis = screen.getByText('More').closest('[data-slot="breadcrumb-ellipsis"]');
  expect(ellipsis).not.toBeNull();
  expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
  expect(ellipsis).toHaveAttribute('role', 'presentation');
  // The visible glyph is decorative; the sr-only "More" carries the meaning.
  expect(screen.getByText('More')).toHaveClass('sr-only');
});

test('BreadcrumbLink render forwards the slot to a custom element', () => {
  render(<BreadcrumbLink render={<button type="button">Back</button>} />);
  const button = screen.getByRole('button', { name: 'Back' });
  expect(button).toHaveAttribute('data-slot', 'breadcrumb-link');
});
