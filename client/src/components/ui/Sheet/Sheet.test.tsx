import { render, screen } from '@testing-library/react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './Sheet';

test('renders the trigger with its slot and no content while closed', () => {
  render(
    <Sheet>
      <SheetTrigger>Open sections</SheetTrigger>
      <SheetContent>
        <SheetTitle>Sections</SheetTitle>
      </SheetContent>
    </Sheet>,
  );
  expect(screen.getByRole('button', { name: 'Open sections' })).toHaveAttribute(
    'data-slot',
    'sheet-trigger',
  );
  // Base UI mounts/unmounts the popup by open state; closed => not in the DOM (not just hidden).
  expect(screen.queryByText('Sections')).not.toBeInTheDocument();
});

test('shows the portalled dialog with its title, description, and close when open', async () => {
  render(
    <Sheet open modal={false}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Sections</SheetTitle>
          <SheetDescription>Jump to a section.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>,
  );
  // Base UI portals the content to document.body; the dialog is named by its title.
  const dialog = await screen.findByRole('dialog', { name: 'Sections' });
  expect(dialog).toHaveAttribute('data-slot', 'sheet-content');
  expect(await screen.findByText('Jump to a section.')).toBeInTheDocument();
  // The built-in X close carries an accessible name.
  expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
});
