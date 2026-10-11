'use client';

import { Button } from '@notation-hero/client';
import { ERROR } from '@notation-hero/shared/error-codes';
import { useEffect } from 'react';

import { reportError } from '../lib/monitoring/report';

import './globals.css';

// Catches a crash in the root layout itself, where web/app/error.tsx cannot: it REPLACES the root
// layout, so it brings its own <html> and <body> and its own stylesheet. Without it a root-layout
// crash shows Next's bare default page. A client component cannot export metadata, so React's
// <title> names the tab.
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  useEffect(() => reportError(error, { code: ERROR.unexpectedCrash, handled: false }), [error]);
  return (
    <html lang="en">
      <body>
        <title>Notation Hero</title>
        <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
          <h1 className="text-3xl font-bold">Notation Hero</h1>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          {/* Not "a report was sent": an ad blocker may have stopped it, and this page cannot know. */}
          <p className="max-w-prose text-muted-foreground">
            Errors are reported automatically — without your file, its name, or the music in it. Try
            again, or reload the page.
          </p>
          <p className="text-sm text-muted-foreground">
            Error {ERROR.unexpectedCrash} — the page crashed unexpectedly.
          </p>
          <Button className="min-h-11 px-8" onClick={reset}>
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
