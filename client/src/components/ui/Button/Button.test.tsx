import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import {
  contrastRatio,
  mixWithBlack,
  oklchLuminance,
  readDarkTokens,
} from '../../../dark-contrast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../DropdownMenu/DropdownMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';
import { Button, buttonVariants } from './Button';
import type { SubmitEvent } from 'react';

test('renders with its label', () => {
  render(<Button>Play</Button>);
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
});

test('applies the variant and size data attributes', () => {
  render(
    <Button variant="secondary" size="sm">
      Tap
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Tap' });
  expect(button).toHaveAttribute('data-variant', 'secondary');
  expect(button).toHaveAttribute('data-size', 'sm');
  // data-* is set straight from props, so also assert the cva className — a swapped
  // variant class would not change the data attribute.
  expect(button).toHaveClass('bg-secondary');
});

test('calls onClick when clicked', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Click</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'Click' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

// NH-304: `disabled` renders aria-disabled instead of the native attribute, so the button stays
// reachable by Tab, screen readers and ref.focus(); the component itself blocks activation.
// jest-dom's toBeDisabled() reads the native attribute only, so these assert aria-disabled.
describe('disabled (aria-disabled, focusable)', () => {
  test('renders aria-disabled instead of the native attribute and is reachable by Tab', async () => {
    const user = userEvent.setup();
    render(<Button disabled>Play</Button>);
    const button = screen.getByRole('button', { name: 'Play' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toHaveAttribute('disabled');
    await user.tab();
    expect(button).toHaveFocus();
  });

  test('takes programmatic focus through its ref', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} disabled>
        Play
      </Button>,
    );
    ref.current?.focus();
    expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
  });

  test('renders no aria-disabled attribute while enabled', () => {
    render(
      <>
        <Button>Unset</Button>
        <Button disabled={false}>Off</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Unset' })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('button', { name: 'Off' })).not.toHaveAttribute('aria-disabled');
  });

  test('disabled wins over a spread aria-disabled={false}', () => {
    render(
      <Button disabled aria-disabled={false}>
        Play
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-disabled', 'true');
  });

  test('aria-disabled without disabled is styling only: the guard stays off', () => {
    const onClick = vi.fn();
    render(
      <Button aria-disabled onClick={onClick}>
        Play
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('does not fire onClick on a click, Enter or Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Nope' });
    await user.click(button);
    fireEvent.click(button);
    button.focus();
    await user.keyboard('[Enter]');
    await user.keyboard('[Space]');
    expect(onClick).not.toHaveBeenCalled();
  });

  test('withholds the key and pointer handlers but still calls onFocus and onBlur', async () => {
    const user = userEvent.setup();
    const handlers = {
      onKeyDown: vi.fn(),
      onKeyUp: vi.fn(),
      onMouseDown: vi.fn(),
      onPointerDown: vi.fn(),
      onFocus: vi.fn(),
      onBlur: vi.fn(),
    };
    render(
      <Button disabled {...handlers}>
        Nope
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Nope' });
    await user.tab();
    await user.keyboard('a[ArrowDown][Escape][Enter]');
    fireEvent.mouseDown(button);
    fireEvent.pointerDown(button);
    await user.tab();
    expect(handlers.onKeyDown).not.toHaveBeenCalled();
    expect(handlers.onKeyUp).not.toHaveBeenCalled();
    expect(handlers.onMouseDown).not.toHaveBeenCalled();
    expect(handlers.onPointerDown).not.toHaveBeenCalled();
    expect(handlers.onFocus).toHaveBeenCalledTimes(1);
    expect(handlers.onBlur).toHaveBeenCalledTimes(1);
  });

  test('prevents the default of Enter and Space only, so other keys keep working', () => {
    render(<Button disabled>Nope</Button>);
    const button = screen.getByRole('button', { name: 'Nope' });
    const prevented = (key: string) => {
      const event = createEvent.keyDown(button, { key });
      fireEvent(button, event);
      return event.defaultPrevented;
    };
    expect(prevented('Enter')).toBe(true);
    expect(prevented(' ')).toBe(true);
    expect(prevented('Tab')).toBe(false);
    expect(prevented('Escape')).toBe(false);
    expect(prevented('ArrowDown')).toBe(false);
  });

  test('lets Tab move focus on to the next control', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button disabled>First</Button>
        <Button>Second</Button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
  });

  test('keeps focus when disabled changes in both directions (no remount)', () => {
    const { rerender } = render(<Button>Play</Button>);
    const button = screen.getByRole('button', { name: 'Play' });
    button.focus();
    rerender(<Button disabled>Play</Button>);
    expect(screen.getByRole('button', { name: 'Play' })).toBe(button);
    expect(button).toHaveFocus();
    rerender(<Button>Play</Button>);
    expect(screen.getByRole('button', { name: 'Play' })).toBe(button);
    expect(button).toHaveFocus();
  });

  test('blocks a press that starts enabled and ends disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    button.focus();
    await user.keyboard('[Space>]');
    rerender(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    await user.keyboard('[/Space]');
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });

  test('a disabled type="submit" does not submit, by click or by Enter in a sibling input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: SubmitEvent<HTMLFormElement>) => event.preventDefault());
    const form = (disabled: boolean) => (
      <form onSubmit={onSubmit}>
        <input aria-label="Title" />
        <Button type="submit" disabled={disabled}>
          Save
        </Button>
      </form>
    );
    const { rerender } = render(form(true));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.type(screen.getByRole('textbox', { name: 'Title' }), '{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    // Positive control: the same form submits once the button is enabled.
    rerender(form(false));
    await user.type(screen.getByRole('textbox', { name: 'Title' }), '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('a disabled as-link keeps role=link, has no disabled attribute, and blocks navigation', () => {
    render(
      // eslint-disable-next-line jsx-a11y/anchor-has-content -- useRender clones the anchor with the Button's children
      <Button disabled render={<a href="/play" />}>
        Go
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).not.toHaveAttribute('disabled');
    const click = createEvent.click(link);
    fireEvent(link, click);
    expect(click.defaultPrevented).toBe(true);
  });

  test('a Base UI trigger that renders a disabled Button stays closed', async () => {
    const user = userEvent.setup();
    const menu = (disabled: boolean) => (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button disabled={disabled} />}>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const { rerender } = render(menu(true));
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    trigger.focus();
    await user.keyboard('[Enter]');
    await user.keyboard('[Space]');
    await user.keyboard('[ArrowDown]');
    expect(screen.queryByText('Rename')).not.toBeInTheDocument();
    // Positive control: the same trigger opens the menu once the Button is enabled.
    rerender(menu(false));
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(await screen.findByText('Rename')).toBeInTheDocument();
  });

  test('keeps its aria-describedby description, so a consumer can say why it is unavailable', () => {
    render(
      <>
        <Button disabled aria-describedby="why">
          Play
        </Button>
        <p id="why">The audio engine is still loading</p>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAccessibleDescription(
      'The audio engine is still loading',
    );
  });

  test('a Tooltip on a disabled Button still opens on keyboard focus', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip>
        <TooltipTrigger render={<Button disabled />}>Play</TooltipTrigger>
        <TooltipContent>The audio engine is still loading</TooltipContent>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
    const content = await screen.findAllByText('The audio engine is still loading');
    expect(content.length).toBeGreaterThan(0);
  });

  test('carries both selector sets, so natively disabled elements that reuse buttonVariants stay dimmed', () => {
    const classes = buttonVariants().split(' ');
    expect(classes).toEqual(
      expect.arrayContaining([
        'disabled:pointer-events-none',
        'disabled:opacity-50',
        'aria-disabled:pointer-events-none',
        'aria-disabled:opacity-50',
      ]),
    );
  });

  // opacity-50 dims the focus ring too, so the disabled state doubles the ring alpha to match an
  // enabled Button. destructive sets its own ring colour, so it carries its own doubled pair and
  // tailwind-merge drops the base class for it.
  test('doubles the focus ring alpha so the ring matches an enabled Button', () => {
    render(
      <>
        <Button disabled>Default</Button>
        <Button disabled variant="destructive">
          Delete
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Default' })).toHaveClass(
      'aria-disabled:focus-visible:ring-ring',
    );
    const destructive = screen.getByRole('button', { name: 'Delete' });
    expect(destructive).toHaveClass(
      'aria-disabled:focus-visible:ring-destructive/40',
      'dark:aria-disabled:focus-visible:ring-destructive/80',
    );
    expect(destructive).not.toHaveClass('aria-disabled:focus-visible:ring-ring');
  });
});

test('renders as the child element when render is set', () => {
  // eslint-disable-next-line jsx-a11y/anchor-has-content -- useRender clones the anchor with the Button's children
  render(<Button render={<a href="/play" />}>Go</Button>);
  const link = screen.getByRole('link', { name: 'Go' });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('data-slot', 'button');
});

test('fires onClick on keyboard activation (Space + Enter)', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Go</Button>);
  screen.getByRole('button', { name: 'Go' }).focus();
  await user.keyboard('[Space]');
  await user.keyboard('[Enter]');
  expect(onClick).toHaveBeenCalledTimes(2);
});

test('wires aria-invalid to the destructive border class', () => {
  render(<Button aria-invalid>Bad</Button>);
  const button = screen.getByRole('button', { name: 'Bad' });
  expect(button).toHaveAttribute('aria-invalid', 'true');
  expect(button).toHaveClass('aria-invalid:border-destructive');
});

// Dark-mode contrast for the `link` variant. Breadcrumb reuses these same classes on a `--muted`
// bar, which the old `dark:text-brand-600` (#0d9488) failed at 3.95:1 — replaced with adaptive
// `text-primary` + a `color-mix` hover darken, both guarded here against the real tokens in
// styles.css so a future token edit (or a reintroduced dim link colour) fails fast.
describe('link variant dark-mode contrast (AA)', () => {
  const tokens = readDarkTokens();
  const primary = tokens.primary;
  if (!primary) throw new Error('--primary not found in the .dark block of styles.css');

  it.each(['muted', 'popover', 'background', 'accent'] as const)(
    'resting text-primary on %s stays >= 4.5:1 (AA)',
    (surface) => {
      const surfaceToken = tokens[surface];
      if (!surfaceToken) throw new Error(`--${surface} not found in the .dark block of styles.css`);
      expect(
        contrastRatio(oklchLuminance(primary), oklchLuminance(surfaceToken)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['muted', 'popover', 'background', 'accent'] as const)(
    'hover color-mix(primary, black 12%%) on %s stays >= 4.5:1 (AA)',
    (surface) => {
      const surfaceToken = tokens[surface];
      if (!surfaceToken) throw new Error(`--${surface} not found in the .dark block of styles.css`);
      const hover = mixWithBlack(primary, 0.12);
      expect(
        contrastRatio(oklchLuminance(hover), oklchLuminance(surfaceToken)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});
