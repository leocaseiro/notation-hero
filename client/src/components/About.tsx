import { useQuery } from '@tanstack/react-query'

interface AboutResponse {
  name: string
  phase: string
  message: string
  timestamp: string
}

async function fetchAbout(): Promise<AboutResponse> {
  // Same-origin behind CloudFront: `/api/*` is routed to the Lambda Function URL.
  const res = await fetch('/api/about')
  if (!res.ok) {
    throw new Error(`/api/about responded ${res.status}`)
  }
  return (await res.json()) as AboutResponse
}

export function About() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['about'],
    queryFn: fetchAbout,
  })

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-brand-700">About Notation Hero</h1>
      <p className="mt-4 max-w-prose text-lg">
        A drum-notation learning app, built end-to-end on AWS. This page is
        served from CloudFront; the panel below is fetched live from the NestJS
        API running on a Lambda Function URL.
      </p>

      <section className="mt-6 max-w-prose rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Live from the API
        </h2>
        {isLoading && <p className="mt-2">Loading live data…</p>}
        {isError && (
          <p className="mt-2 text-red-600">
            Could not reach the API right now.
          </p>
        )}
        {data && (
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline font-medium">Phase: </dt>
              <dd className="inline">{data.phase}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Message: </dt>
              <dd className="inline">{data.message}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Served at: </dt>
              <dd className="inline tabular-nums">{data.timestamp}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  )
}
