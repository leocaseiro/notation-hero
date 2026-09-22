import { render, screen } from '@testing-library/react';

import { HoverCard, HoverCardContent, HoverCardTrigger } from './HoverCard';

test('renders the trigger with its slot and no content while closed', () => {
  render(
    <HoverCard>
      <HoverCardTrigger>Yellow</HoverCardTrigger>
      <HoverCardContent>Preview</HoverCardContent>
    </HoverCard>,
  );
  expect(screen.getByText('Yellow')).toHaveAttribute('data-slot', 'hover-card-trigger');
  // Base UI mounts/unmounts the popup by open state; closed => not in the DOM (not just hidden).
  expect(screen.queryByText('Preview')).not.toBeInTheDocument();
});

test('shows the portalled content when open', async () => {
  render(
    <HoverCard open>
      <HoverCardTrigger>Yellow</HoverCardTrigger>
      <HoverCardContent>Coldplay · Beginner 2</HoverCardContent>
    </HoverCard>,
  );
  // Base UI portals the popup to document.body; findByText resolves once it mounts.
  const content = await screen.findByText('Coldplay · Beginner 2');
  expect(content.closest('[data-slot="hover-card-content"]')).not.toBeNull();
});
