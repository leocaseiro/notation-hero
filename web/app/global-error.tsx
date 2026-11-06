'use client';

import { CrashPage } from './CrashPage';

import './globals.css';

// Catches a crash in the root layout itself, where web/app/error.tsx cannot: it REPLACES the root
// layout, so it brings its own <html> and <body> and its own stylesheet. Without it a root-layout
// crash shows Next's bare default page. A client component cannot export metadata, so React's
// <title> names the tab.
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <html lang="en">
      <body>
        <title>Notation Hero</title>
        <CrashPage error={error} reset={reset} heading="Something went wrong" />
      </body>
    </html>
  );
}
