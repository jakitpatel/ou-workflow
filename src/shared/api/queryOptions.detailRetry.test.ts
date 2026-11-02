import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { createAppError } from './errors'
import { queryOptionDefaults, shouldRetryApiQueryUnlessTimedOut } from './queryOptions'

describe('application detail retry policy', () => {
  it('does not retry a request that already hit the client timeout', () => {
    const timeout = createAppError('Request timed out. Please try again.', { code: 'TIMEOUT_ERROR' })
    expect(shouldRetryApiQueryUnlessTimedOut(0, timeout)).toBe(false)
  })

  it('still retries network and 5xx failures, but not 4xx', () => {
    expect(shouldRetryApiQueryUnlessTimedOut(0, createAppError('x', { code: 'NETWORK_ERROR' }))).toBe(true)
    expect(shouldRetryApiQueryUnlessTimedOut(0, createAppError('x', { status: 500 }))).toBe(true)
    expect(shouldRetryApiQueryUnlessTimedOut(2, createAppError('x', { status: 500 }))).toBe(false)
    expect(shouldRetryApiQueryUnlessTimedOut(0, createAppError('x', { status: 404 }))).toBe(false)
  })

  it('makes the detail loader reject after one timed-out attempt instead of three', async () => {
    const queryFn = vi
      .fn()
      .mockRejectedValue(createAppError('Request timed out. Please try again.', { code: 'TIMEOUT_ERROR' }))
    const client = new QueryClient()
    await expect(
      client.ensureQueryData({
        queryKey: ['FIX-fu', 'detail'],
        queryFn,
        ...queryOptionDefaults.applicationsDetail,
      }),
    ).rejects.toThrow('Request timed out')
    expect(queryFn).toHaveBeenCalledTimes(1)
  })
})
