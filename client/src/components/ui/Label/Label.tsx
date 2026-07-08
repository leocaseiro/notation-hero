import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Form label on a native `<label>` (Base UI has no Label primitive; the one
 * Radix Label extra — double-click text-selection guard — is reproduced in
 * onMouseDown, which also leaves a wrapped control's own mousedown untouched:
 * native `input`/`select`/`textarea`/`button` and Base UI's role-based
 * `checkbox`/`radio`/`switch` spans). Associate it with a control via `htmlFor`
 * pointing at the input's `id` (clicking the label then focuses the input), or
 * wrap the control
 * directly. The disabled styles react to a sibling `peer` (`peer-disabled:`) or
 * an ancestor `group` marked `data-disabled="true"`, so a disabled field dims
 * its label without extra wiring.
 */
const Label = ({ className, onMouseDown, ...props }: React.ComponentProps<'label'>) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control, jsx-a11y/no-noninteractive-element-interactions -- generic wrapper: the control association (htmlFor / wrapped input) happens at the call site, and onMouseDown is the Radix-parity selection guard, not an interaction affordance
  <label
    data-slot="label"
    className={cn(
      'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      className,
    )}
    onMouseDown={(event) => {
      // Radix Label parity: keep native mousedown on wrapped form controls; stop
      // text selection on double-click (covers consumers that override select-none).
      // Base UI's Checkbox/Radio/Switch render a `<span role="...">` (not an
      // `<input>`), so match those roles too — else a wrapped Base UI control slips
      // past this guard and its selection/toggle mousedown gets preventDefaulted.
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'button, input, select, textarea, [role="checkbox"], [role="radio"], [role="switch"]',
        )
      )
        return;
      onMouseDown?.(event);
      if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
    }}
    {...props}
  />
);

export { Label };
