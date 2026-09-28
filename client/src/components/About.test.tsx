import { ERROR } from '@notation-hero/shared/error-codes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { About, catalogFailureMessage, fetchCatalog } from './About';

function renderAbout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <About />
    </QueryClientProvider>,
  );
}

function mockFetch(value: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(value) }),
  );
}

const sampleCatalog = {
  count: 2,
  items: [
    {
      id: 'pat_ssr_debut',
      slug: 'single-stroke-roll',
      title: 'Single Stroke Roll',
      kind: 'pattern',
      difficulty: 'Debut',
    },
    {
      id: 'song_demo_groove',
      slug: 'demo-groove',
      title: 'Demo Groove',
      kind: 'song',
      difficulty: 'Intermediate 4',
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('renders the About heading and static copy', () => {
  mockFetch(sampleCatalog);
  renderAbout();
  expect(screen.getByRole('heading', { name: /About Notation Hero/i })).toBeInTheDocument();
});

test('renders the live catalog from /api/catalog on success', async () => {
  mockFetch(sampleCatalog);
  renderAbout();
  await waitFor(() => expect(screen.getByText('Single Stroke Roll')).toBeInTheDocument());
  // The count is rendered, so a server-side shape change would fail this test.
  expect(screen.getByText('2 pieces')).toBeInTheDocument();
  expect(screen.getByText('Demo Groove')).toBeInTheDocument();
});

test('shows a loading state while /api/catalog is in flight', () => {
  // A never-resolving fetch keeps the query in its pending state.
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<never>(() => {})));
  renderAbout();
  expect(screen.getByText(/Loading the catalog/i)).toBeInTheDocument();
});

test('names the status and E301 when the API answers with a failure', async () => {
  mockFetch(undefined, false, 503);
  renderAbout();
  // The status is in the copy on purpose: 503 (cold or crashed Lambda) and 404 (a routing
  // mistake) need different fixes, and the person reporting it can only say which if we show it.
  await waitFor(() =>
    expect(screen.getByText(/The API answered 503\. \(Error E301\)/)).toBeInTheDocument(),
  );
});

test('passes an AbortSignal to the catalog fetch (the 8s timeout is wired)', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(sampleCatalog),
  });
  vi.stubGlobal('fetch', fetchMock);
  renderAbout();
  await waitFor(() => expect(screen.getByText('Single Stroke Roll')).toBeInTheDocument());
  // Removing `signal: controller.signal` from About.tsx would disable the timeout silently —
  // this assertion fails if the AbortSignal is ever dropped from the fetch call.
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/catalog',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest expect.any() is typed as any; the matcher is the correct idiom here
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
});

test('reports E302 with timeout copy when the 8s deadline aborts the fetch', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
  );
  renderAbout();
  // `retry: 1` in main.tsx means a hard-down API spins for roughly seventeen seconds before this
  // appears, so the copy says it timed out rather than implying an instant failure.
  await waitFor(() =>
    expect(screen.getByText(/taking too long to answer\. \(Error E302\)/)).toBeInTheDocument(),
  );
});

test('reports E303 when the request never reaches the network', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  renderAbout();
  await waitFor(() =>
    expect(screen.getByText(/could not be reached\. .*\(Error E303\)/)).toBeInTheDocument(),
  );
});

test('shows no error number at all on the success path', async () => {
  mockFetch(sampleCatalog);
  renderAbout();
  await waitFor(() => expect(screen.getByText('Single Stroke Roll')).toBeInTheDocument());
  expect(screen.queryByText(/\(Error E\d{3}\)/)).not.toBeInTheDocument();
});

// The two aborters are the 8s timer and TanStack Query's own signal (unmount, superseded query).
// Only the first is a failure. If the second were ever classified as one, navigating away from
// /about mid-request would flash an error on the way out.
test('leaves a caller-cancelled request as a cancellation, not a coded failure', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    ),
  );
  const caller = new AbortController();
  const inFlight = fetchCatalog({ signal: caller.signal });
  caller.abort();
  await expect(inFlight).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }) as Error);
  // It must NOT have been rewritten into a coded catalog failure.
  await expect(inFlight).rejects.not.toThrow(/Error E3/);
});

test('falls back to E303 for a cause it cannot classify', () => {
  expect(catalogFailureMessage(new Error('something else entirely'))).toContain(
    `(Error ${ERROR.catalogUnreachable})`,
  );
});
