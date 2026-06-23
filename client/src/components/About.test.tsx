import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { About } from './About'

function renderAbout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <About />
    </QueryClientProvider>,
  )
}

function mockFetch(value: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok, status, json: () => Promise.resolve(value) }),
  )
}

const sampleCatalog = {
  count: 2,
  items: [
    {
      id: 'single-stroke-roll',
      title: 'Single Stroke Roll',
      kind: 'pattern',
      difficulty: 'Debut',
    },
    {
      id: 'demo-groove',
      title: 'Demo Groove',
      kind: 'song',
      difficulty: 'Intermediate 4',
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('renders the About heading and static copy', () => {
  mockFetch(sampleCatalog)
  renderAbout()
  expect(
    screen.getByRole('heading', { name: /About Notation Hero/i }),
  ).toBeInTheDocument()
})

test('renders the live catalog from /api/catalog on success', async () => {
  mockFetch(sampleCatalog)
  renderAbout()
  await waitFor(() =>
    expect(screen.getByText('Single Stroke Roll')).toBeInTheDocument(),
  )
  // The count is rendered, so a server-side shape change would fail this test.
  expect(screen.getByText('2 pieces')).toBeInTheDocument()
  expect(screen.getByText('Demo Groove')).toBeInTheDocument()
})

test('shows a loading state while /api/catalog is in flight', () => {
  // A never-resolving fetch keeps the query in its pending state.
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<never>(() => {})))
  renderAbout()
  expect(screen.getByText(/Loading the catalog/i)).toBeInTheDocument()
})

test('shows a graceful fallback when /api/catalog fails', async () => {
  mockFetch(undefined, false, 500)
  renderAbout()
  await waitFor(() =>
    expect(screen.getByText(/Could not reach the API/i)).toBeInTheDocument(),
  )
})

test('passes an AbortSignal to the catalog fetch (the 8s timeout is wired)', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(sampleCatalog),
  })
  vi.stubGlobal('fetch', fetchMock)
  renderAbout()
  await waitFor(() =>
    expect(screen.getByText('Single Stroke Roll')).toBeInTheDocument(),
  )
  // Removing `signal: controller.signal` from About.tsx would disable the timeout silently —
  // this assertion fails if the AbortSignal is ever dropped from the fetch call.
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/catalog',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  )
})

test('shows the fallback when the catalog fetch is aborted (timeout fired)', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockRejectedValue(
        new DOMException('The operation was aborted.', 'AbortError'),
      ),
  )
  renderAbout()
  await waitFor(() =>
    expect(screen.getByText(/Could not reach the API/i)).toBeInTheDocument(),
  )
})
