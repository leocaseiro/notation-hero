import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Notation Hero</h1>
      <p className="mt-4 text-lg">
        Foundation scaffold — the rhythm-game client lands with its features.
      </p>
    </div>
  )
}
