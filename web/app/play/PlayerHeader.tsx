'use client';

import {
  Button,
  TempoControl,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@notation-hero/client';
import Link from 'next/link';

// The brand mark, as the wireframe draws it beside the wordmark (docs/wireframe/index.html,
// `MARK_SVG`): a ring with a play triangle on its right and a single eighth note inside. Inline
// rather than an <img>, so it takes `currentColor` and follows the teal in both themes; an SVG
// file would need a second copy for dark. The inner <svg> keeps Material's own -960 viewBox —
// nesting is what lets the note path stay verbatim instead of being re-projected by hand.
//
// Decorative: `aria-hidden`, no title. The wordmark right next to it already says "Notation Hero",
// and a mark that repeats its neighbour makes a screen reader read the name twice.
const BrandMark = () => (
  <svg viewBox="0 0 44 40" fill="none" className="h-7 w-8 shrink-0" aria-hidden="true">
    <circle cx="19" cy="20" r="12.6" stroke="currentColor" strokeWidth="3.6" />
    <path d="M31 13.8 L43 20 L31 26.2 Z" fill="currentColor" />
    <svg x="9.5" y="10.5" width="19" height="19" viewBox="0 -960 960 960" fill="currentColor">
      <path d="M287-167q-47-47-47-113t47-113q47-47 113-47 23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47q-66 0-113-47Z" />
    </svg>
  </svg>
);

interface PlayerHeaderProps {
  scoreTitle: string;
  fileName: string;
  scoreTempo: number;
  speed: number;
  onSpeedChange: (next: number) => void;
  disabled: boolean;
}

// The header bar. Tempo lives here, not in the transport row, so the player has exactly one tempo
// control (spec §7).
//
// The wordmark, the title and its tooltip were first rendered inline in PlayerShell. Both data-
// attributes moved across unchanged — the e2e tests read them. The tempo pill is what this adds.
//
// The Back link and the brand mark follow the wireframe's top bar
// (`docs/wireframe/index.html` — `.backlink` and `.logo`), which is where the player borrows its
// "mark + name, with a way out" arrangement from.
//
// Deliberately absent in v0: the Auto-Speed toggle (a practice feature — it needs the v0.2 scoring
// work) and the MIDI status icon (no Web MIDI until v0.2). The Settings gear arrives in Plan C.
export function PlayerHeader({
  scoreTitle,
  fileName,
  scoreTempo,
  speed,
  onSpeedChange,
  disabled,
}: Readonly<PlayerHeaderProps>) {
  return (
    // The mockup's three columns: Back, brand and title on the left, the tempo pill in the centre,
    // and the right one kept for the Settings gear that Plan C adds. `1fr auto 1fr` keeps the pill
    // centred on the PAGE, whatever the title's length.
    <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* Back to the landing page. A Link, not router.back(): v0 has two routes, so "back" is
            always home, and history.back() from a directly-opened /play leaves the tab where it
            was. `render`, NOT `asChild` — that prop was dropped in the Base UI migration and would
            land as a stray DOM attribute with the Link never rendering (web/app/page.tsx does the
            same).
            Icon only, so the header's left column spends its width on the score's name rather than
            on a word the arrow already says. `size-11` is the 44 px the a11y lane enforces and the
            size the tempo steppers beside it already use; the sr-only text is the accessible name —
            a tooltip is not one, and an icon button without it is unnamed to a screen reader. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                data-testid="back-home"
                render={<Link href="/" />}
                className="size-11 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_back
                </span>
                <span className="sr-only">Back to home</span>
              </Button>
            }
          />
          <TooltipContent>Back to home</TooltipContent>
        </Tooltip>
        {/* The mark and the wordmark are ONE unit — the logo. Not a link: the Back button beside it
            already goes home, and a second control to the same place is one more tab stop that
            says nothing new. */}
        <span className="flex shrink-0 items-center gap-2 text-primary">
          <BrandMark />
          {/* `sr-only` below `md`, never `hidden`: the name still reaches a screen reader, and the
              mark alone carries the brand. Below a tablet, Back + mark + the full wordmark stop
              fitting beside a centred tempo pill, and the first thing to lose is the word the mark
              already stands for — not the score's own title. */}
          <span className="font-heading text-xl font-bold max-md:sr-only">Notation Hero</span>
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              // A real <button> so the tooltip is reachable by keyboard, not only by hover. It does
              // nothing on click; min-h-11/min-w-11 keeps it over the 44 px hit area. It HUGS its
              // text (max-w-full, never flex-1): the tooltip centres on the trigger's box, so a
              // button stretched across the header put the tooltip far from the name it explains.
              <button
                type="button"
                data-testid="loaded-notation-name"
                data-file={fileName}
                className="min-h-11 max-w-full min-w-11 truncate px-1 text-left font-medium text-foreground"
              >
                {scoreTitle || fileName}
              </button>
            }
          />
          <TooltipContent>{fileName}</TooltipContent>
        </Tooltip>
      </div>
      <TempoControl
        scoreTempo={scoreTempo}
        speed={speed}
        onSpeedChange={onSpeedChange}
        disabled={disabled}
        // `h-12` and no padding: the pill is exactly as tall as the transport's Play button. Left
        // to itself it grew to 57 px — the BPM label, the number and the percentage stack to 47 px
        // inside 8 px of padding — which read as a taller object than anything else in the player.
        // The 44 px steppers still fit, so the hit area is untouched.
        className="h-12 rounded-xl border border-border bg-secondary dark:border-input"
      />
      {/* Reserved for the Settings gear. This is an EMPTY GRID CELL, not a spacer: the header's
          `1fr auto 1fr` template reserves the third column whether or not a node sits in it, so
          removing this would not move the tempo pill. It marks where the gear goes. */}
      <div />
    </header>
  );
}
