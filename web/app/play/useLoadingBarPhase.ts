import { useEffect, useState } from 'react';

/** `loading` while the work runs, `done` while the finished bar is held and fades, then `gone`. */
export type LoadingBarPhase = 'loading' | 'done' | 'gone';

/**
 * The life of a loading bar that shows from the FIRST frame and leaves gently.
 *
 * It replaced a delay-then-hold hook (hidden for the first 300 ms, to spare a fast connection a
 * flash). That delay was the bug: with a warm cache AlphaTab reports the whole soundfont in two
 * progress events a millisecond apart, at the very END of the wait, so the 300 ms timer could never
 * finish and a person watched a 20-second load with no bar at all. A bar that is there from the
 * start, and fades rather than vanishes, is honest in both cases.
 *
 * `lingerMs` must match the CSS that fades the bar: the hold at 100 % plus the fade itself.
 */
export function useLoadingBarPhase(loading: boolean, lingerMs: number): LoadingBarPhase {
  // Starts from `!loading`, so a bar that is loading at first render is in the SERVER HTML.
  const [expired, setExpired] = useState(!loading);
  const [wasLoading, setWasLoading] = useState(loading);

  // Adjusted during render (React's documented pattern for state derived from a prop change), not
  // in an effect: a second load must re-arm the bar in the same render, or one frame of `gone`
  // slips out between the two.
  if (loading !== wasLoading) {
    setWasLoading(loading);
    if (loading) setExpired(false);
  }

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setExpired(true), lingerMs);
    return () => clearTimeout(timer);
  }, [loading, lingerMs]);

  if (loading) return 'loading';
  return expired ? 'gone' : 'done';
}
