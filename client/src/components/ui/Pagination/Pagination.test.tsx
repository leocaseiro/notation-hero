import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

test('renders numbered pages with ellipsis gaps on both sides of the current window', () => {
  // Page 6 of 20 (index 5), siblingCount 1 -> first, gap, 5-6-7, gap, last.
  render(<Pagination pageIndex={5} pageCount={20} onPageChange={() => {}} />);

  const nav = screen.getByRole('navigation', { name: 'Pagination' });
  const pageButtons = within(nav)
    .getAllByRole('button', { name: /^Go to page \d+$/ })
    .map((button) => button.textContent);
  expect(pageButtons).toEqual(['1', '5', '6', '7', '20']);

  // Two ellipsis gaps (one each side); they are presentational, not buttons.
  const ellipses = within(nav).getAllByRole('presentation');
  expect(ellipses).toHaveLength(2);
});

test('a short range renders every page with no ellipsis', () => {
  render(<Pagination pageIndex={0} pageCount={3} onPageChange={() => {}} />);
  const nav = screen.getByRole('navigation', { name: 'Pagination' });
  expect(within(nav).getAllByRole('button', { name: /^Go to page \d+$/ })).toHaveLength(3);
  expect(within(nav).queryByRole('presentation')).not.toBeInTheDocument();
});

test('clicking page N calls onPageChange with the zero-based index N-1', async () => {
  const user = userEvent.setup();
  const onPageChange = vi.fn();
  render(<Pagination pageIndex={5} pageCount={20} onPageChange={onPageChange} />);
  await user.click(screen.getByRole('button', { name: 'Go to page 7' }));
  expect(onPageChange).toHaveBeenCalledWith(6);
});

test('the current page is marked aria-current and is the only such page', () => {
  render(<Pagination pageIndex={5} pageCount={20} onPageChange={() => {}} />);
  const current = screen
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-current') === 'page');
  expect(current).toHaveLength(1);
  expect(current[0]).toHaveAccessibleName('Go to page 6');
});

test('disables Previous on the first page, Next stays enabled', () => {
  render(<Pagination pageIndex={0} pageCount={10} onPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
});

test('disables Next on the last page, Previous stays enabled', () => {
  render(<Pagination pageIndex={9} pageCount={10} onPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
});

test('clicking Previous and Next steps by one page', async () => {
  const user = userEvent.setup();
  const onPageChange = vi.fn();
  render(<Pagination pageIndex={5} pageCount={20} onPageChange={onPageChange} />);
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(onPageChange).toHaveBeenLastCalledWith(6);
  await user.click(screen.getByRole('button', { name: 'Previous page' }));
  expect(onPageChange).toHaveBeenLastCalledWith(4);
});

test('hides the page-size selector when onPageSizeChange is omitted', () => {
  render(<Pagination pageIndex={0} pageCount={10} onPageChange={() => {}} />);
  expect(screen.queryByRole('combobox', { name: 'Rows per page' })).not.toBeInTheDocument();
});

test('the page-size selector emits a Number', async () => {
  const user = userEvent.setup();
  const onPageSizeChange = vi.fn();
  render(
    <Pagination
      pageIndex={0}
      pageCount={10}
      onPageChange={() => {}}
      pageSize={25}
      onPageSizeChange={onPageSizeChange}
    />,
  );
  await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
  expect(onPageSizeChange).toHaveBeenCalledWith(50);
  expect(typeof onPageSizeChange.mock.calls[0]?.[0]).toBe('number');
});
