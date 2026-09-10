import { AlphaTabDrumsEsm } from './AlphaTabDrumsEsm';

export default function SpikeEsmPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">AlphaTab — self-hosted ESM variant</h1>
        <p className="text-muted-foreground">
          Variant B: AlphaTab is never bundled. It is fetched from <code>public/alphatab/esm/</code>{' '}
          via a <code>turbopackIgnore</code> dynamic import, so it resolves its own module worker
          and audio worklet. If <code>Environment.webPlatform</code> below reads{' '}
          <code>BrowserModule</code>, the native worker path is in use.
        </p>
      </header>
      <AlphaTabDrumsEsm />
    </main>
  );
}
