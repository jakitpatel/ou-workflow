import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fetchApplicationTasks } from '@/features/tasks/api'
import { useTasks } from './useTaskQueries'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', role: 'ALL' }) }))
vi.mock('@/features/tasks/api', () => ({
  fetchApplicationTasks: vi.fn(),
  fetchMentionUsers: vi.fn(),
  fetchTaskRoles: vi.fn(),
}))
vi.mock('@/features/applications/api', () => ({ fetchUserByRole: vi.fn() }))

type Args = { days: string | number; page: number }

// Each request answers with a row naming the view it came from; later requests never resolve,
// so the test sees exactly what is on screen while the next view is loading.
const setup = (initialProps: Args = { days: 'pending', page: 0 }) => {
  let calls = 0
  vi.mocked(fetchApplicationTasks).mockImplementation(({ days, page } = {}) => {
    calls += 1
    if (calls > 1) return new Promise(() => {})
    return Promise.resolve({
      data: [{ taskInstanceId: 1, plantName: `view ${days ?? 'pending'} page ${page}` }],
      meta: { total_count: 120, limit: 50, offset: page ?? 0 },
    } as never)
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(({ days, page }: Args) => useTasks(undefined, '', days, page, 50), {
    initialProps,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

const plantNames = (data: unknown) =>
  ((data as { data?: Array<{ plantName: string }> } | undefined)?.data ?? []).map((t) => t.plantName)

describe('Tasks & Notifications view switching', () => {
  it.each([7, 30])('does not show the Pending tasks while the %s Days view loads', async (days) => {
    const { result, rerender } = setup()
    await waitFor(() => expect(plantNames(result.current.data)).toEqual(['view pending page 0']))

    rerender({ days, page: 0 })

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPlaceholderData).toBe(false)
  })

  it('does not show the 7 Days tasks when switching back to Pending', async () => {
    const { result, rerender } = setup({ days: 7, page: 0 })
    await waitFor(() => expect(plantNames(result.current.data)).toEqual(['view 7 page 0']))

    rerender({ days: 'pending', page: 0 })
    await waitFor(() => expect(result.current.isLoading).toBe(true))
    expect(result.current.data).toBeUndefined()
  })

  it('keeps the current page on screen (flagged as placeholder) while the next page of the same view loads', async () => {
    const { result, rerender } = setup()
    await waitFor(() => expect(plantNames(result.current.data)).toEqual(['view pending page 0']))

    rerender({ days: 'pending', page: 50 })

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true))
    expect(plantNames(result.current.data)).toEqual(['view pending page 0'])
  })
})
