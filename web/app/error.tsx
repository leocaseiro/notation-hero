'use client';

import { Button } from '@notation-hero/client';
import { ERROR } from '@notation-hero/shared/error-codes';
import { useEffect } from 'react';

import { reportError } from '../lib/monitoring/report';

export default function AppError({ error, reset }: Readonly<{ error: Error; reset: () => void }>) {
  useEffect(() => reportError(error, { code: ERROR.unexpectedCrash, handled: false }), [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      {/* Not "a report was sent": an ad blocker may have stopped it, and this page cannot know. */}
      <p className="max-w-prose text-muted-foreground">
        Errors are reported automatically — without your file, its name, or the music in it. Try
        again, or reload the page.
      </p>
      <p className="text-sm text-muted-foreground">Error {ERROR.unexpectedCrash}</p>
      <Button className="min-h-11 px-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
