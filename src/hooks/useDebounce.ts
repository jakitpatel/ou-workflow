import { useEffect, useRef, useState } from 'react'

export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay])

  return debouncedValue
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay = 500,
  immediate = false,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedCallback = ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (immediate && !timeoutRef.current) {
      callback(...args)
    }

    timeoutRef.current = setTimeout(() => {
      if (!immediate) {
        callback(...args)
      }
      timeoutRef.current = null
    }, delay)
  }) as T

  return debouncedCallback
}
