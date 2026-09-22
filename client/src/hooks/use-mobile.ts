import * as React from 'react';

// Below this viewport width (px) the layout is treated as mobile. Matches shadcn's sidebar
// breakpoint, where the sidebar swaps from the fixed rail to the off-canvas Sheet.
const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// Read the current match. Guards `matchMedia` being absent (SSR / non-DOM) by falling back to
// false so the hook has a stable initial value without a first-render flash.
function getIsMobile(): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  return globalThis.matchMedia(QUERY).matches;
}

// useIsMobile — true when the viewport is narrower than MOBILE_BREAKPOINT. Subscribes to a
// `matchMedia` query so it updates on resize/orientation change. The initial value comes from a
// lazy initializer (not a setState-in-effect), so there is no cascading first render.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(getIsMobile);

  React.useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return;
    const mql = globalThis.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
