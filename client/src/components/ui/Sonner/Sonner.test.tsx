import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toaster, toast } from './Sonner';

// sonner renders nothing until a toast is queued, so mounting the Toaster and
// firing a toast is what actually surfaces the region — assert both the toaster
// slot and its aria-labelled section exist (no crash on mount + render).
test('renders the sonner toaster region', async () => {
  render(<Toaster />);
  act(() => {
    toast('Ready');
  });
  await screen.findByText('Ready');
  expect(document.querySelector('[data-sonner-toaster]')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument();
});

test('exposes toast as a function', () => {
  expect(typeof toast).toBe('function');
});

test('shows a toast when toast() is called', async () => {
  render(<Toaster />);
  act(() => {
    toast('Hello world');
  });
  expect(await screen.findByText('Hello world', undefined, { timeout: 3000 })).toBeInTheDocument();
});

test('invokes the action button onClick', async () => {
  const onClick = vi.fn();
  render(<Toaster />);
  act(() => {
    toast('Saved', { action: { label: 'Undo', onClick } });
  });
  // fireEvent.click (not userEvent) so we skip sonner's pointerdown →
  // setPointerCapture path, which jsdom does not implement.
  fireEvent.click(await screen.findByText('Undo'));
  expect(onClick).toHaveBeenCalled();
});
