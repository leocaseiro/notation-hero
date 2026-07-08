import { render, screen } from '@testing-library/react';

import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip';

test('renders the trigger with its slot and no content while closed', () => {
  render(
    <Tooltip>
      <TooltipTrigger>Hover me</TooltipTrigger>
      <TooltipContent>Tip</TooltipContent>
    </Tooltip>,
  );
  expect(screen.getByRole('button', { name: 'Hover me' })).toHaveAttribute(
    'data-slot',
    'tooltip-trigger',
  );
  // Base UI mounts/unmounts content by open state; closed => not in the DOM (not just hidden).
  expect(screen.queryByText('Tip')).not.toBeInTheDocument();
});

test('shows the portalled content when open', async () => {
  render(
    <Tooltip open>
      <TooltipTrigger>Hover me</TooltipTrigger>
      <TooltipContent>Add to practice</TooltipContent>
    </Tooltip>,
  );
  // Base UI portals the content to document.body; findByText resolves once it mounts.
  const content = await screen.findAllByText('Add to practice');
  expect(content.length).toBeGreaterThan(0);
});
