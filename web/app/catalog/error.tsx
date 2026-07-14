'use client';

import { Button } from '@notation-hero/client';

// Route-level error boundary for /catalog. A Neon outage, request timeout, or a missing
// DATABASE_URL throws inside getCatalog(); this renders a recoverable fallback with a retry
// instead of the framework default error page.
export default function CatalogError({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-8">
      <h1 className="text-2xl font-bold">Catalog</h1>
      <p className="text-muted-foreground">The catalog could not be loaded right now.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
