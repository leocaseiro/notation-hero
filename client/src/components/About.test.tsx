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

const sampleCatalogue = {
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
  mockFetch(sampleCatalogue)
  renderAbout()
  expect(
    screen.getByRole('heading', { name: /About Notation Hero/i }),
  ).toBeInTheDocument()
})

test('renders the live catalogue from /api/catalogue on success', async () => {
  mockFetch(sampleCatalogue)
  renderAbout()
  await waitFor(() =>
    expect(screen.getByText('Single Stroke Roll')).toBeInTheDocument(),
  )
  // The count is rendered, so a server-side shape change would fail this test.
  expect(screen.getByText('2 pieces')).toBeInTheDocument()
  expect(screen.getByText('Demo Groove')).toBeInTheDocument()
})

test('shows a loading state while /api/catalogue is in flight', () => {
  // A never-resolving fetch keeps the query in its pending state.
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<never>(() => {})))
  renderAbout()
  expect(screen.getByText(/Loading the catalogue/i)).toBeInTheDocument()
})

test('shows a graceful fallback when /api/catalogue fails', async () => {
  mockFetch(undefined, false, 500)
  renderAbout()
  await waitFor(() =>
    expect(screen.getByText(/Could not reach the API/i)).toBeInTheDocument(),
  )
})
