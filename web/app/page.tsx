import { Button } from '@notation-hero/client';

const swatches = [
  ['--color-brand-400', 'bg-brand-400'],
  ['--color-brand-600', 'bg-brand-600'],
  ['--color-brand-700', 'bg-brand-700'],
  ['--primary', 'bg-primary'],
  ['--secondary', 'bg-secondary'],
] as const;

function ProofSection({ heading }: Readonly<{ heading: string }>) {
  return (
    <section className="rounded-lg border border-border bg-background p-6 text-foreground">
      <h2 className="mb-4 text-lg font-semibold">{heading}</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {swatches.map(([token, cls]) => (
          <figure key={token} className="text-center">
            <div className={`size-12 rounded-md border border-border ${cls}`} />
            <figcaption className="mt-1 font-mono text-xs">{token}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Notation Hero — design-system proof</h1>
      <p className="text-muted-foreground">
        A Server Component rendering the client-boundary Button from the design system with brand
        tokens, in light and dark.
      </p>
      <ProofSection heading="Light" />
      <div className="dark">
        <ProofSection heading="Dark" />
      </div>
    </main>
  );
}
