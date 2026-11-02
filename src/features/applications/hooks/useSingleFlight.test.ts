import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useSingleFlight } from './useSingleFlight'

it('runs one action at a time and ignores calls made before the first settles', async () => {
  let finish!: () => void
  const action = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
  const { result } = renderHook(() => useSingleFlight())

  let first!: Promise<unknown>
  act(() => {
    first = result.current.run(action)
    void result.current.run(action)
    void result.current.run(action)
  })
  expect(action).toHaveBeenCalledOnce()
  expect(result.current.isRunning).toBe(true)

  await act(async () => {
    finish()
    await first
  })
  expect(result.current.isRunning).toBe(false)

  await act(async () => {
    await result.current.run(async () => undefined)
  })
  expect(result.current.inFlightRef.current).toBe(false)
})

it('releases the guard when the action throws or rejects', async () => {
  const { result } = renderHook(() => useSingleFlight())
  await act(async () => {
    await expect(result.current.run(() => { throw new Error('sync') })).rejects.toThrow('sync')
    await expect(result.current.run(() => Promise.reject(new Error('async')))).rejects.toThrow('async')
  })
  const next = vi.fn(async () => 'ok')
  let value: unknown
  await act(async () => {
    value = await result.current.run(next)
  })
  expect(next).toHaveBeenCalledOnce()
  expect(value).toBe('ok')
})
