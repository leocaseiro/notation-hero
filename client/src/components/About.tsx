import { useQuery } from '@tanstack/react-query'

// Mirrors the server's CatalogResponse (server/src/modules/catalog/catalog.controller.ts).
// Kept in sync by hand for Phase 1; both collapse into the shared/ oRPC contract in Phase 2.
interface CatalogPlayable {
  id: string
  title: string
  kind: 'song' | 'pattern' | 'lesson'
  difficulty: string
}

interface CatalogResponse {
  items: CatalogPlayable[]
  count: number
}

async function fetchCatalog({
  signal: querySignal,
}: { signal?: AbortSignal } = {}): Promise<CatalogResponse> {
  // Abort well inside the 10s Lambda timeout so a hung origin surfaces the error state quickly
  // instead of spinning until CloudFront's much longer origin read-timeout.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  // Compose TanStack Query's own signal (fired on unmount / a superseded query) with the 8s
  // timeout, so navigating away aborts the in-flight fetch instead of leaving it running to 8s.
  const signal = querySignal
    ? AbortSignal.any([controller.signal, querySignal])
    : controller.signal
  try {
    // Same-origin behind CloudFront: `/api/*` is routed to the Lambda Function URL.
    const res = await fetch('/api/catalog', { signal })
    if (!res.ok) {
      throw new Error(`/api/catalog responded ${res.status}`)
    }
    return (await res.json()) as CatalogResponse
  } finally {
    clearTimeout(timer)
  }
}

export function About() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    // The catalog changes rarely; a stale window avoids a fresh CloudFront->Lambda fetch on
    // every remount (navigate away + back), keeping the $0 free-tier invocation budget low.
    staleTime: 60_000,
  })

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-brand-700">About Notation Hero</h1>
      <p className="mt-4 max-w-prose text-lg">
        A drum-notation learning app, built end-to-end on AWS. This page is
        served from CloudFront; the catalog preview below is fetched live from
        the NestJS API running on a Lambda Function URL.
      </p>

      <section className="mt-6 max-w-prose rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Catalog preview — live from the API
        </h2>
        {isLoading && <p className="mt-2">Loading the catalog…</p>}
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
