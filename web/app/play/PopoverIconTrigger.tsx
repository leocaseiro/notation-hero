'use client';

import {
  Button,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@notation-hero/client';
import type { CSSProperties } from 'react';

interface PopoverIconTriggerProps {
  testId: string;
  /** Accessible name AND tooltip text — the header gear and the Tracks trigger have no other
   *  state to say, so the name is the whole tooltip (spec: both triggers are exempt from the
   *  state half of the tooltip rule, not from the tooltip). */
  label: string;
  glyph: string;
  disabled: boolean;
  /** Classes beyond the shared `size-11`: each popover's own rounding and colour. */
  className: string;
  glyphStyle?: CSSProperties;
}

// The icon button that opens a popover, shared by Settings and Tracks so the one shape — and the
// three rules below — lives once. A third popover reads this instead of copying the block again.
//
// The tooltip is ALWAYS present, never conditional: swapping the wrapped and the bare element
// remounts the button and drops its focus. The TooltipTrigger renders a SPAN around the
// PopoverTrigger — the shape TransportToggle ships — because the button is disabled while its
// data is still loading, and a disabled Button is pointer-events:none, so as its own tooltip
// trigger it would never see the mouse. The span takes the hover; focus still opens it, because
// focus events bubble. Still one <button>.
//
// data-popup-open cannot tell this tooltip from the popover it wraps: both map their open state
// to the same attribute, and on the wrapping span it is present on hover too. aria-expanded (the
// PopoverTrigger's own) is the discriminator; never key a style or an assertion on
// data-popup-open for either trigger.
export function PopoverIconTrigger({
  testId,
  label,
  glyph,
  disabled,
  className,
  glyphStyle,
}: Readonly<PopoverIconTriggerProps>) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <PopoverTrigger
          render={
            <Button
              data-testid={testId}
              variant="ghost"
              size="icon"
              aria-label={label}
              disabled={disabled}
              className={`size-11 ${className}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true" style={glyphStyle}>
                {glyph}
              </span>
            </Button>
          }
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
