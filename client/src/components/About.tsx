import { useQuery } from '@tanstack/react-query'

// Mirrors the server's CatalogueResponse (server/src/modules/catalogue/catalogue.controller.ts).
// Kept in sync by hand for Phase 1; both collapse into the shared/ oRPC contract in Phase 2.
interface CataloguePlayable {
  id: string
  title: string
  kind: string
  difficulty: string
}

interface CatalogueResponse {
  items: CataloguePlayable[]
  count: number
}

async function fetchCatalogue(): Promise<CatalogueResponse> {
  // Abort well inside the 10s Lambda timeout so a hung origin surfaces the error state quickly
  // instead of spinning until CloudFront's much longer origin read-timeout.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    // Same-origin behind CloudFront: `/api/*` is routed to the Lambda Function URL.
    const res = await fetch('/api/catalogue', { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`/api/catalogue responded ${res.status}`)
    }
    return (await res.json()) as CatalogueResponse
  } finally {
    clearTimeout(timer)
  }
}

export function About() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['catalogue'],
    queryFn: fetchCatalogue,
  })

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-brand-700">About Notation Hero</h1>
      <p className="mt-4 max-w-prose text-lg">
        A drum-notation learning app, built end-to-end on AWS. This page is
        served from CloudFront; the catalogue preview below is fetched live from
        the NestJS API running on a Lambda Function URL.
      </p>

      <section className="mt-6 max-w-prose rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Catalogue preview — live from the API
        </h2>
        {isLoading && <p className="mt-2">Loading the catalogue…</p>}
        {isError && (
          <p className="mt-2 text-red-600">
            Could not reach the API right now.
          </p>
        )}
        {data && (
          <>
            <p className="mt-2 text-sm text-gray-500">{data.count} pieces</p>
            <ul className="mt-2 space-y-1">
              {data.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-gray-500">
                    {item.kind} · {item.difficulty}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
