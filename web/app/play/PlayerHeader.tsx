'use client';

import { TempoControl, Tooltip, TooltipContent, TooltipTrigger } from '@notation-hero/client';

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
    // The mockup's three columns: brand and title on the left, the tempo pill in the centre, and
    // the right one kept for the Settings gear that Plan C adds. `1fr auto 1fr` keeps the pill
    // centred on the PAGE, whatever the title's length.
    <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-8 border-b border-border px-6">
      <div className="flex min-w-0 items-center gap-8">
        <span className="text-2xl font-bold text-primary">Notation Hero</span>
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
        className="rounded-xl border border-border bg-card p-1 shadow-sm dark:border-input"
      />
      {/* Reserved for the Settings gear. This is an EMPTY GRID CELL, not a spacer: the header's
          `1fr auto 1fr` template reserves the third column whether or not a node sits in it, so
          removing this would not move the tempo pill. It marks where the gear goes. */}
      <div />
    </header>
  );
}
