import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { render, screen } from '@testing-library/react';

import { ScrollArea, ScrollBar } from './ScrollArea';

test('renders the scroll area with its slot and the viewport around its children', () => {
  render(
    <ScrollArea data-testid="area">
      <div>Intro</div>
      <div>Verse 1</div>
    </ScrollArea>,
  );
  const area = screen.getByTestId('area');
  expect(area).toHaveAttribute('data-slot', 'scroll-area');
  // The children render inside the Base UI viewport (via the Content wrapper).
  expect(screen.getByText('Intro')).toBeInTheDocument();
  expect(screen.getByText('Verse 1')).toBeInTheDocument();
});

test('unmounts the scrollbar while the viewport has no measurable overflow', () => {
  // Base UI mounts the bar only once the viewport measures real overflow (Radix's `type` prop
  // is gone). jsdom has no layout, so no overflow is ever measurable here — the bar stays out
  // of the DOM. The VR snapshot (browser layout) is what guards the mounted bar's pixels.
  const { container } = render(
    <ScrollArea orientation="horizontal">
      <div style={{ width: 999 }}>wide content</div>
    </ScrollArea>,
  );
  expect(container.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeNull();
});

test('ScrollBar renders horizontal orientation (the player strip)', () => {
  // `keepMounted` pins the bar in the DOM regardless of overflow — the only way to assert on
  // it under jsdom's layout-less DOM. Assert the bar is HORIZONTAL, not the vertical default —
  // the whole point of the player's horizontal strip.
  const { container } = render(
    <ScrollAreaPrimitive.Root>
      <ScrollAreaPrimitive.Viewport />
      <ScrollBar orientation="horizontal" keepMounted />
    </ScrollAreaPrimitive.Root>,
  );
  const bar = container.querySelector('[data-slot="scroll-area-scrollbar"]');
  expect(bar).not.toBeNull();
  expect(bar).toHaveAttribute('data-orientation', 'horizontal');
});
