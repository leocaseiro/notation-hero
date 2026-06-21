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

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('renders the About heading and static copy', () => {
  mockFetch({
    name: 'Notation Hero',
    phase: 'Phase 1',
    message: 'x',
    timestamp: 't',
  })
  renderAbout()
  expect(
    screen.getByRole('heading', { name: /About Notation Hero/i }),
  ).toBeInTheDocument()
})

test('renders the live /api/about payload on success', async () => {
  mockFetch({
    name: 'Notation Hero',
    phase: 'Phase 1 — deployable AWS slice',
    message: 'Served end-to-end through AWS',
    timestamp: '2026-06-21T00:00:00.000Z',
  })
  renderAbout()
  await waitFor(() =>
    expect(
      screen.getByText(/Phase 1 — deployable AWS slice/),
    ).toBeInTheDocument(),
  )
})

test('shows a graceful fallback when /api/about fails', async () => {
  mockFetch(undefined, false, 500)
  renderAbout()
  await waitFor(() =>
    expect(screen.getByText(/Could not reach the API/i)).toBeInTheDocument(),
  )
})
