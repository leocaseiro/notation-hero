import { PlayerShell } from './PlayerShell';

// A Server Component rendering the client player. NEVER `dynamic(..., { ssr: false })` — it is
// illegal here and unnecessary: AlphaTab's module scope is SSR-safe and nothing touches it until
// the client effect runs.
export default function PlayPage() {
  return <PlayerShell />;
}
