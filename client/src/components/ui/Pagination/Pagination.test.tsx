import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

test('reads the current page status', () => {
  render(<Pagination pageIndex={0} pageCount={10} onPageChange={() => {}} />);
  expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
});

test('disables First and Previous on the first page', () => {
  render(<Pagination pageIndex={0} pageCount={10} onPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Last page' })).toBeEnabled();
});

test('clicking Next advances by one page', async () => {
  const user = userEvent.setup();
  const onPageChange = vi.fn();
  render(<Pagination pageIndex={4} pageCount={10} onPageChange={onPageChange} />);
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(onPageChange).toHaveBeenCalledWith(5);
});

test('clicking Last jumps to the final page index', async () => {
  const user = userEvent.setup();
  const onPageChange = vi.fn();
  render(<Pagination pageIndex={4} pageCount={10} onPageChange={onPageChange} />);
  await user.click(screen.getByRole('button', { name: 'Last page' }));
  expect(onPageChange).toHaveBeenCalledWith(9);
});

test('disables Next and Last on the last page', () => {
  render(<Pagination pageIndex={9} pageCount={10} onPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'First page' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
});

test('disables every button when there is a single page', () => {
  render(<Pagination pageIndex={0} pageCount={1} onPageChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
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
