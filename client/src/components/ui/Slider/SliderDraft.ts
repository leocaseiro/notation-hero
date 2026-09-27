import { useState } from 'react';

/**
 * The three props that put a `Slider` on a draft. Spread it straight onto the control:
 * `<Slider {...volumeSlider} min={0} max={16} … />`.
 */
export interface SliderDraft {
  /** What the control shows: the draft while a gesture is running, else the committed value. */
  value: number;
  /** Moves the draft. Reports nothing to the caller. */
  onChange: (next: number) => void;
  /** Ends the gesture: drops the draft, then reports the settled value once. */
  onCommit: (next: number) => void;
}

/**
 * Pointer-tracking draft for a `Slider` whose committed value is expensive to write. Base UI
 * reports EVERY pointer move, and the work behind these rails is never per-move work — one
 * message per gesture to the synth worker, one re-layout of the whole score. So the thumb follows
 * the pointer on a local draft and the caller hears a single value when the gesture ends. A
 * keystroke is a whole gesture, so each one commits.
 *
 * `null` = nothing is being dragged, which is what hands the value back to the caller: once the
 * draft is dropped the control shows `committed` again, so a value the caller clamps or refuses
 * cannot sit there looking applied.
 */
export function useSliderDraft(committed: number, onCommit: (next: number) => void): SliderDraft {
  const [draft, setDraft] = useState<number | null>(null);

  return {
    value: draft ?? committed,
    onChange: setDraft,
    onCommit: (next) => {
      setDraft(null);
      onCommit(next);
    },
  };
}
