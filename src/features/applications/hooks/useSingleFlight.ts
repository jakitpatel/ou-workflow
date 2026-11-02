import { useCallback, useRef, useState } from 'react'

/**
 * Runs at most one async action at a time. The ref flips synchronously, so a double or triple
 * click is ignored even before React re-renders the button as disabled (mutation.isPending and
 * other render state update too late to stop the second click).
 */
export function useSingleFlight() {
  const inFlightRef = useRef(false)
  const [isRunning, setIsRunning] = useState(false)

  const run = useCallback(<T>(action: () => Promise<T> | T): Promise<T | undefined> => {
    if (inFlightRef.current) return Promise.resolve(undefined)
    inFlightRef.current = true
    setIsRunning(true)
    let pending: Promise<T>
    try {
      pending = Promise.resolve(action())
    } catch (error) {
      pending = Promise.reject(error)
    }
    return pending.finally(() => {
      inFlightRef.current = false
      setIsRunning(false)
    })
  }, [])

  const guard = useCallback(
    <Args extends unknown[], T>(action: (...args: Args) => Promise<T> | T) =>
      (...args: Args) =>
        run(() => action(...args)),
    [run],
  )

  return { run, guard, isRunning, inFlightRef }
}
