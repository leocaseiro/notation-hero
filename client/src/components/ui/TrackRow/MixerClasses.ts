// Shared by TrackRow and MasterRow so the mixer's track rows and its footer read as one grid —
// same column widths, same button size, same pressed fills — and cannot drift apart.
//
// PascalCase filename, NOT kebab: client/eslint.config.js sets unicorn/filename-case to pascalCase
// for everything under src/components/**.

// One column track for every track row and the master footer. Fixed columns (the eye, solo, mute,
// the staff group, the expand control) are the same width on both, so those buttons line up even
// though a track name changes length. 2.125rem is 34px: WCAG 2.5.8 AA asks 24px, and this mixer
// is dense enough that the transport's 44px targets do not fit the row. The staff column is
// 8.5rem whether or not a row fills it, so a 3-toggle percussion row and a 4-toggle string row
// still end on the same expand button.
export const MIXER_ROW_CLASS =
  'grid items-center gap-1.5 [grid-template-columns:2.125rem_minmax(3.25rem,1fr)_2.125rem_2.125rem_minmax(4.5rem,1.25fr)_8.625rem_2.125rem]';

// Mixer icon buttons. `size-11` on TransportToggle is the transport's 44px target; this overrides
// it for the row. Mute's pressed fill is warning amber — solo and "shown" stay brand teal.
export const MIXER_BUTTON_CLASS = 'size-[2.125rem] shrink-0 rounded-lg text-muted-foreground';
// data-pressed: a Base UI Toggle sets it — every mixer toggle built through TransportToggle
// (TrackRow's own Mute button included).
export const MUTE_PRESSED_CLASS =
  'data-pressed:border-warning data-pressed:bg-warning data-pressed:text-warning-foreground';
// aria-pressed: the twins for a plain Button that carries its pressed state only as
// aria-pressed="true" (MasterRow's select-all toggles, which are not a Base UI Toggle and so
// never get data-pressed). Tailwind's built-in aria-pressed variant matches the literal string
// "true" only, so aria-pressed="mixed" — MasterRow's indeterminate state — does not match either.
export const MIXER_SOLO_PRESSED_CLASS =
  'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground';
export const MIXER_MUTE_PRESSED_CLASS =
  'aria-pressed:border-warning aria-pressed:bg-warning aria-pressed:text-warning-foreground';
