'use client';

import { Button } from '@notation-hero/client';

import { PLAYER_ERROR } from '../../lib/player-errors';

export default function PlayerError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">The player stopped unexpectedly</h1>
      <p className="max-w-prose text-muted-foreground">
        Nothing you opened was sent anywhere. Try again, or reload the page.
      </p>
      <p className="text-sm text-muted-foreground">Error {PLAYER_ERROR.unexpectedCrash}</p>
      <Button className="min-h-11 px-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
