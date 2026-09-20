import { useEffect, useRef, useState } from 'react';

interface DelayedVisibilityOptions {
  /** Stay hidden until `active` has held for this long. Kills the strobe on a fast connection. */
  appearAfterMs: number;
  /** Once shown, stay visible at least this long after `active` clears. Kills the flash-and-gone. */
  holdForMs: number;
}

// Two timers, one boolean out. `active` going true starts the appear timer; if `active` clears
// before it fires, nothing was ever shown. `active` clearing starts the hold timer instead of
// hiding at once, so a bar that did appear is not yanked away mid-blink (if it never appeared the
// same timer just re-confirms hidden, which is a no-op). Both timers are cleared on every change
// and on unmount — a surviving timer would call setState on an unmounted component.
//
// React 19 requires an argument to useRef, hence the explicit `undefined`.
export function useDelayedVisibility(
  active: boolean,
  { appearAfterMs, holdForMs }: DelayedVisibilityOptions,
): boolean {
  const [visible, setVisible] = useState(false);
  const appearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(appearTimer.current);
    clearTimeout(holdTimer.current);

    if (active) {
      appearTimer.current = setTimeout(() => setVisible(true), appearAfterMs);
    } else {
      holdTimer.current = setTimeout(() => setVisible(false), holdForMs);
    }

    return () => {
      clearTimeout(appearTimer.current);
      clearTimeout(holdTimer.current);
    };
  }, [active, appearAfterMs, holdForMs]);

  return visible;
}
