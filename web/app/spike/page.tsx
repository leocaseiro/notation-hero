import { Button } from '@notation-hero/client';

// SPIKE probe: imported directly (no `next/dynamic`). `dynamic(..., { ssr: false })` is ILLEGAL in
// an App Router Server Component, so the usual Pages-Router recipe does not port. Testing whether
// AlphaTab's module scope survives SSR on its own instead.
import { AlphaTabDrums } from './AlphaTabDrums';

export default function SpikePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">AlphaTab × Next.js App Router — spike</h1>
        <p className="text-muted-foreground">
          Drum notation rendered by AlphaTab, played through AlphaSynth. The button below comes from{' '}
          <code>@notation-hero/client</code> — it is here only to prove the design system and
          AlphaTab coexist under <code>transpilePackages</code>.
        </p>
        <Button variant="outline">Design-system Button (coexistence check)</Button>
      </header>
      <AlphaTabDrums />
    </main>
  );
}
