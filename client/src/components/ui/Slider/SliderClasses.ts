import { cn } from '@/lib/utils';

// Shared by Slider and RangeSlider so the two read as one system and cannot drift apart. Only TRACK
// and THUMB are genuinely shared: RangeSlider's Control is `flex w-full items-center` with NO h-11
// (its Root is h-5), so handing it the 44 px control box would change its geometry and invalidate
// its committed -linux VR baselines.
//
// PascalCase filename, NOT kebab: client/eslint.config.js sets unicorn/filename-case to pascalCase
// for everything under src/components/**.
export const SLIDER_CONTROL_CLASS = 'flex h-11 w-full items-center'; // Slider only
export const SLIDER_TRACK_CLASS = 'relative h-1 grow rounded-full bg-muted';
export const SLIDER_THUMB_CLASS = cn(
  'block size-4 cursor-grab rounded-full border-2 border-primary bg-background transition-[box-shadow,background-color]',
  'hover:ring-4 hover:ring-ring/30',
  // Base UI's thumb is a styled div wrapping a real (visually-hidden) native <input type="range">
  // — the INPUT takes focus, not this div, so a plain focus-visible: utility never matches;
  // has-focus-visible: reads the nested input's focus state instead.
  'has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-focus-visible:outline-none',
  'active:cursor-grabbing active:bg-primary',
  'data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed',
);
