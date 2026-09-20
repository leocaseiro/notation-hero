'use client';

import { Toggle } from '@base-ui/react/toggle';

import { Button } from '../Button/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

// `value` is left out: on Base UI's Toggle it is the identity inside a ToggleGroup (a string), and
// these toggles are three independent booleans, never a group.
interface TransportToggleProps extends Omit<
  ComponentProps<'button'>,
  'onChange' | 'children' | 'value'
> {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  /** Accessible name — the control is icon-only, so this is the only label a reader gets. */
  label: string;
  /** The glyph. Pass it aria-hidden; `label` carries the name. */
  icon: ReactNode;
  /** Optional hover/focus hint. Use it where the control implies a gesture the UI never teaches. */
  tooltip?: string;
  disabled?: boolean;
  className?: string;
}

// Icon-only transport toggle. One component, three uses (Loop, Metronome, Count-In), so the
// pressed styling stays identical across the row.
//
// `aria-pressed` rather than a checkbox role: these are toggle BUTTONS in an application toolbar,
// not form inputs, and a screen reader announces "Loop, pressed" — which is what the control does.
//
// Two owners, one <button>. Base UI's Toggle owns the pressed state (`aria-pressed`,
// `data-pressed`, onPressedChange) and renders THROUGH the design system's Button, which owns the
// look and the disabled state. That split is deliberate: `disabled` goes to Button ONLY. Toggle's
// own `disabled` sets the native attribute, and a natively disabled button takes no focus and no
// hover — so a tooltip explaining WHY the control is unavailable could never open. Button renders
// `aria-disabled` and blocks activation itself, which keeps the control in the tab order with its
// tooltip reachable.
//
// size-11 = the 44px minimum hit area. The mockup draws these at w-10 h-10 (40px) and v0 must not
// copy that: the screen target is tablet landscape.
const TransportToggle = ({
  pressed,
  onPressedChange,
  label,
  icon,
  tooltip,
  disabled = false,
  className,
  ...rest
}: Readonly<TransportToggleProps>) => {
  const toggle = (
    <Toggle
      {...rest}
      pressed={pressed}
      onPressedChange={(next) => onPressedChange(next)}
      aria-label={label}
      render={
        <Button
          data-slot="transport-toggle"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            'size-11 rounded-lg',
            // Pressed = SOLID brand teal, matching every other selected/active control in the
            // system: ToggleChipGroup, Tabs and Sidebar's active item. A gray fill with a teal
            // glyph is NOT an existing pattern here.
            'data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground',
            className,
          )}
        />
      }
    >
      {icon}
    </Toggle>
  );

  // The accessible name comes from aria-label, so the tooltip is a redundant hint rather than the
  // control's name — safe to omit per-instance.
  //
  // The trigger is a span AROUND the button, never the button itself. A disabled Button is
  // `pointer-events: none`, so as its own trigger it never receives the hover that opens the
  // tooltip — the hint explaining WHY a control is unavailable then shows on keyboard focus only,
  // and a mouse user gets a dimmed button and no reason. The span takes the hover; focus events
  // bubble, so focus on the button still opens it.
  return tooltip ? (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>{toggle}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    toggle
  );
};

export { TransportToggle };
