import { render, screen } from '@testing-library/react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card';

// Each sub-component sets its own data-slot and forwards its children.
test.each([
  ['card', Card],
  ['card-header', CardHeader],
  ['card-title', CardTitle],
  ['card-description', CardDescription],
  ['card-action', CardAction],
  ['card-content', CardContent],
  ['card-footer', CardFooter],
] as const)('%s renders children and carries its data-slot', (slot, Component) => {
  render(<Component>content</Component>);
  const node = screen.getByText('content');
  expect(node).toBeInTheDocument();
  expect(node.closest(`[data-slot="${slot}"]`)).toBeInTheDocument();
});

test('composed card renders title, description, and content text', () => {
  render(
    <Card>
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
      </CardHeader>
      <CardContent>Right left right right</CardContent>
    </Card>,
  );
  expect(screen.getByText('Paradiddle')).toBeInTheDocument();
  expect(screen.getByText('A foundational sticking pattern.')).toBeInTheDocument();
  expect(screen.getByText('Right left right right')).toBeInTheDocument();
});

test('forwards className onto the card root alongside the base classes', () => {
  render(<Card className="w-80">body</Card>);
  const card = screen.getByText('body');
  expect(card).toHaveAttribute('data-slot', 'card');
  expect(card).toHaveClass('w-80');
});

test('header adopts the action column when a CardAction is present', () => {
  render(
    <CardHeader>
      <CardTitle>Paradiddle</CardTitle>
      <CardAction>
        <button type="button" aria-label="More options">
          x
        </button>
      </CardAction>
    </CardHeader>,
  );
  // The action button is reachable and the action slot wraps it.
  const action = screen.getByRole('button', { name: 'More options' });
  expect(action.closest('[data-slot="card-action"]')).toBeInTheDocument();
  // The header opts into a second grid column via the has-data action selector.
  const header = action.closest('[data-slot="card-header"]');
  expect(header).toHaveClass('has-data-[slot=card-action]:grid-cols-[1fr_auto]');
});
