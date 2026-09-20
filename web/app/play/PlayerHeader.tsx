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
// The wordmark, the title and its tooltip came from Plan A Task 11 Step 3, which rendered them inline
// in PlayerShell. The STRUCTURE and both data- attributes move across unchanged — Plan A's e2e tests
// read them — while the classes are restyled for a standalone bar. The tempo pill is what this adds.
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
    <header className="flex h-16 items-center gap-8 border-b border-border px-6">
      <span className="font-bold text-primary">Notation Hero</span>
      <Tooltip>
        <TooltipTrigger
          render={
            // A real <button> so the tooltip is reachable by keyboard, not only by hover. It does
            // nothing on click; min-h-11/min-w-11 keeps it over the 44 px hit area.
            <button
              type="button"
              data-testid="loaded-notation-name"
              data-file={fileName}
              className="min-h-11 min-w-11 flex-1 truncate px-1 text-left text-muted-foreground"
            >
              {scoreTitle || fileName}
            </button>
          }
        />
        <TooltipContent>{fileName}</TooltipContent>
      </Tooltip>
      <TempoControl
        scoreTempo={scoreTempo}
        speed={speed}
        onSpeedChange={onSpeedChange}
        disabled={disabled}
      />
    </header>
  );
}
