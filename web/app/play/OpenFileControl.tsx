'use client';

import { Button, Tooltip, TooltipContent, TooltipTrigger, toast } from '@notation-hero/client';
import { ERROR } from '@notation-hero/shared/error-codes';
import { useId, useRef } from 'react';

import type { LoadedNotation } from './PlayerShell';

// Every extension of a format AlphaTab 1.8.4 reads (spec §4): Guitar Pro 3-8, MusicXML plain and
// compressed, Capella and alphaTex, by extension only. ScoreLoader sniffs file CONTENT and never
// sees a filename — it loops Environment.buildImporters() and breaks on the first that does not
// throw — so this is an affordance for the OS dialog, not a guarantee. A file the importer cannot
// read still raises the unsupported-file toast. `.mxml` is absent on purpose: no standard defines
// it. So is `.mid`: AlphaTab has no MIDI importer.
const ACCEPT = '.gp,.gp3,.gp4,.gp5,.gpx,.musicxml,.mxl,.xml,.capx,.atex,.alphatex';

// Notation-only files are 3-16 KB, but a Guitar Pro file with an embedded backing track is
// legitimately 7-8 MB, so the bound is deliberately generous. It exists because
// loadScoreFromBytes is SYNCHRONOUS and runs on the main thread: a mis-dropped video or disk
// image would freeze or crash the tab with no message, and no try/catch recovers from that.
// Checked before arrayBuffer(), so the bytes never reach memory. It does NOT bound decompressed
// size — .gpx is BCFZ, not ZIP: its header declares the decompressed length and GpxFileSystem
// expands to it unbounded, so a small file can claim gigabytes. The ZIP formats (.gp, .mxl, .capx)
// are already capped per entry by settings.importer.maxDecodingBufferSize. Bound post-v0.
// The limit is written once, in megabytes, so the toast below always names the real one.
const MAX_NOTATION_MB = 25;
const MAX_NOTATION_BYTES = MAX_NOTATION_MB * 1024 * 1024;

interface OpenFileControlProps {
  /** Really async (PlayerShell's requestNotation). Typed `void` it would be exempt from
   *  TypeScript's promise-return check, which is how an un-awaited call hid here once. */
  onNotation: (notation: LoadedNotation) => void | Promise<void>;
}

export async function readNotation(file: File): Promise<LoadedNotation> {
  if (file.size > MAX_NOTATION_BYTES) {
    // Not user copy: the caller shows readFailureMessage(file) instead.
    throw new Error(`over the ${MAX_NOTATION_MB} MB limit`);
  }
  const buffer = await file.arrayBuffer();
  // loadScoreFromBytes takes a Uint8Array, so wrap here rather than at the call site.
  return { name: file.name, bytes: new Uint8Array(buffer) };
}

/**
 * Toast text for a file that never reached the parser — over the size limit, or unreadable — each
 * with its own error number. The limit in the text comes from the constant, so changing the limit
 * changes the message. A file that is read but does not parse gets E103 from requestNotation.
 */
export function readFailureMessage(file: File): string {
  return file.size > MAX_NOTATION_BYTES
    ? `${file.name} is too large to open. The limit is ${MAX_NOTATION_MB} MB. (Error ${ERROR.fileTooLarge})`
    : `${file.name} could not be read. Check that the file still exists, then try again. (Error ${ERROR.fileUnreadable})`;
}

export function OpenFileControl({ onNotation }: Readonly<OpenFileControlProps>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  // Every failure on this boundary lands on ONE surface. `void accept(...)` is the idiom that
  // silences the floating-promise lint rule — and it would silence the rejection with it, so a
  // file the browser cannot read (moved, deleted, volume unmounted between the pick and the read)
  // would produce nothing at all: no toast, no error state, just a control the user keeps pressing.
  const accept = async (file: File | undefined) => {
    if (!file) return;
    try {
      // AWAIT it: onNotation is async, so an un-awaited call drops any rejection on the floor —
      // the same reason the drag-and-drop twin in PlayerShell awaits requestNotation.
      await onNotation(await readNotation(file));
    } catch {
      // Same id as requestNotation's loading toast, so a throw mid-open REPLACES the "Opening…"
      // spinner instead of stacking a second toast beside one that never resolves.
      toast.error(readFailureMessage(file), { id: 'notation-load' });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        data-testid="open-file-input"
        type="file"
        accept={ACCEPT}
        className="sr-only"
        // tabIndex -1 takes the invisible input out of the tab order; aria-hidden takes it out of
        // the accessibility tree too. BOTH are required. With tabIndex alone the input is no
        // longer tied to a label, and axe reports a CRITICAL "Form elements must have labels"
        // violation that blocks the a11y job — measured 0 violations with the old label form,
        // 1 critical with tabIndex alone, 0 again once aria-hidden was added.
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          void accept(file);
          // Reset at the END of every change — cancel, parse failure and success alike. A file
          // input fires no change event when its value is unchanged, so without this a user who
          // cancels and re-picks the SAME file gets nothing, and the natural retry after a failed
          // parse is dead too.
          event.target.value = '';
        }}
      />
      {/* A REAL button, not a <label> wrapping the input. Button's focus-visible ring classes only
          activate on the element that actually has focus — with the label form, Tab lands on the
          sr-only input and the ring never paints: measured 0 differing pixels between focused and
          unfocused, a WCAG 2.4.7 failure. The button form paints the ring and keeps one tab stop.
          `accept` stays on the real <input>, which is still what opens the picker, so the OS
          filter is unaffected (file-chooser verified firing on both the click and Space paths).
          Do NOT "fix" the old form by making the label focusable: a label has no native keyboard
          activation, so Enter and Space produced no file chooser at all. */}
      <Tooltip>
        <TooltipTrigger
          render={
            // The mockup's shape: a borderless grey icon, 48 px, rounded-xl — not a bordered box.
            <Button
              type="button"
              data-testid="open-file-button"
              variant="ghost"
              className="size-12 rounded-xl text-muted-foreground"
              onClick={() => inputRef.current?.click()}
            >
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{ fontSize: 24 }}
              >
                folder_open
              </span>
              <span className="sr-only">Open file</span>
            </Button>
          }
        />
        <TooltipContent sideOffset={8}>Open a file</TooltipContent>
      </Tooltip>
    </>
  );
}
