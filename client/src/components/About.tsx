import { ERROR } from '@notation-hero/shared/error-codes';
import { useQuery } from '@tanstack/react-query';
import type { ErrorCode } from '@notation-hero/shared/error-codes';

// Mirrors the server's CatalogResponse (server/src/modules/catalog/catalog.controller.ts).
// Kept in sync by hand for Phase 1; both collapse into the shared/ oRPC contract in Phase 2.
interface CatalogPlayable {
  id: string;
  /** Friendly URL token (NH-221); not rendered yet — routing lands with NH-123/NH-221. */
  slug: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  difficulty: string;
}

interface CatalogResponse {
  items: CatalogPlayable[];
  count: number;
}

/**
 * A catalog failure that knows which of the three causes it was. The three need different fixes —
 * the origin is down, the Lambda is cold, or this browser has no network — so they get three
 * numbers rather than one, and the person reporting it can say which they saw.
 */
class CatalogUnavailableError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'CatalogUnavailableError';
    this.code = code;
  }
}

/** The copy shown when the catalog cannot be loaded, ending in the number to quote. */
export function catalogFailureMessage(cause: unknown): string {
  return cause instanceof CatalogUnavailableError
    ? `${cause.message} (Error ${cause.code})`
    : `The catalog could not be loaded. (Error ${ERROR.catalogUnreachable})`;
}

export async function fetchCatalog({
  signal: querySignal,
}: { signal?: AbortSignal } = {}): Promise<CatalogResponse> {
  // Abort well inside the 10s Lambda timeout so a hung origin surfaces the error state quickly
  // instead of spinning until CloudFront's much longer origin read-timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  // Compose TanStack Query's own signal (fired on unmount / a superseded query) with the 8s
  // timeout, so navigating away aborts the in-flight fetch instead of leaving it running to 8s.
  const signal = querySignal
    ? AbortSignal.any([controller.signal, querySignal])
    : controller.signal;
  try {
    // Same-origin behind CloudFront: `/api/*` is routed to the Lambda Function URL.
    const res = await fetch('/api/catalog', { signal });
    if (!res.ok) {
      throw new CatalogUnavailableError(
        ERROR.catalogResponseNotOk,
        `The catalog could not be loaded. The API answered ${res.status}.`,
      );
    }
    return (await res.json()) as CatalogResponse;
  } catch (error) {
    if (error instanceof CatalogUnavailableError) throw error;
    // Exactly two things can abort this fetch: the 8s timer above, and TanStack Query's own
    // signal on unmount or a superseded query. The second is a cancellation, not a failure — it
    // must stay untouched so the query is dropped rather than rendered as an error. Anything
    // else that aborted is therefore the deadline.
    if (isAbort(error)) {
      if (querySignal?.aborted === true) throw error;
      throw new CatalogUnavailableError(
        ERROR.catalogTimedOut,
        'The catalog is taking too long to answer.',
      );
    }
    // fetch rejects without aborting only when the request never reached the network.
    throw new CatalogUnavailableError(
      ERROR.catalogUnreachable,
      'The catalog could not be reached. Check your connection, then try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}

function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError';
}

export const About = () => {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    // The catalog changes rarely; a stale window avoids a fresh CloudFront->Lambda fetch on
    // every remount (navigate away + back), keeping the $0 free-tier invocation budget low.
    staleTime: 60_000,
  });

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-brand-700">About Notation Hero</h1>
      <p className="mt-4 max-w-prose text-lg">
        A drum-notation learning app, built end-to-end on AWS. This page is served from CloudFront;
        the catalog preview below is fetched live from the NestJS API running on a Lambda Function
        URL.
      </p>

      <section className="mt-6 max-w-prose rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Catalog preview — live from the API
        </h2>
        {isLoading && <p className="mt-2">Loading the catalog…</p>}
        {isError && <p className="mt-2 text-red-600">{catalogFailureMessage(error)}</p>}
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
  );
};
