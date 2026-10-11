import { Button } from '@notation-hero/client';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">Notation Hero</h1>
      <p className="max-w-prose text-muted-foreground">
        Open a score from your own computer, read it as standard notation, and play along. Your
        scores never leave this device.
      </p>
      {/* min-h-11 = 44px, the minimum touch target (spec §4). The glyph keeps its drawn size;
          only the hit area is padded. */}
      {/* `render`, NOT `asChild`. client/src/components/ui/Button/Button.tsx types its props as
          useRender.ComponentProps<'button'> & VariantProps<typeof buttonVariants> — `asChild`
          appears nowhere in client/src, it was dropped in the Radix -> Base UI migration. The
          precedent is Button.test.tsx:52 and the AsLink story. Passing `asChild` would land as a
          stray DOM attribute and the Link would never render. */}
      <Button render={<Link href="/play" />} className="min-h-11 px-8 text-base">
        Play
      </Button>
      {/* "Counts visits" is Release Health: a small ping on every visit, not only on a crash. The
          kinds of instrument are the `instruments` tag; the type and size go only with a file
          that fails to open. */}
      <p className="text-sm text-muted-foreground">
        This site counts visits and crashes anonymously, and sends an error report when something
        goes wrong. Neither includes your file, its name, or the music in it — only the file&apos;s
        type and size, and the kinds of instrument it uses.
      </p>
    </main>
  );
}
