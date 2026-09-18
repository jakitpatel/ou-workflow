import { createContext, useCallback, useState, type ReactNode } from 'react'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import { useSSEConnection, type SSEMessage } from '@/shared/api/useSSEConnection'

type Listener = {
  onMessage: (message: SSEMessage) => void
  onError?: (error: Event) => void
}

export const EventsContext = createContext<((listener: Listener) => () => void) | null>(null)

export function EventsProvider({
  children,
  endpoint = '/events/',
  token,
  enabled = true,
}: {
  children: ReactNode
  endpoint?: string
  token?: string | null
  enabled?: boolean
}) {
  const [listeners] = useState(() => new Set<Listener>())
  const subscribe = useCallback((listener: Listener) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [listeners])

  useSSEConnection((message) => {
    for (const listener of listeners) {
      try {
        listener.onMessage(message)
      } catch (error) {
        console.error('SSE listener failed', error)
      }
    }
  }, {
    endpoint,
    token,
    enabled,
    onError: (event) => {
      for (const listener of listeners) {
        try {
          listener.onError?.(event)
        } catch (error) {
          console.error('SSE error listener failed', error)
        }
      }
    },
  })

  return <EventsContext.Provider value={subscribe}>{children}</EventsContext.Provider>
}

export function AuthenticatedEventsProvider({ children }: { children: ReactNode }) {
  const { token, username } = useUser()
  const { apiBaseUrl } = useAppPreferences()
  const baseUrl = apiBaseUrl?.trim().replace(/\/+$/, '')
  return (
    <EventsProvider
      key={username ?? ''}
      token={token}
      endpoint={baseUrl ? `${baseUrl}/events/` : '/events/'}
      enabled={Boolean(token)}
    >
      {children}
    </EventsProvider>
  )
}
