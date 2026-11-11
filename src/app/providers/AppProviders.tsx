import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { UserProvider } from '@/context/UserContext'
import { AppPreferencesProvider } from '@/context/AppPreferencesContext'
import { queryClient, appRouter } from '@/app/router/createAppRouter'
import { installRecentErrorCapture } from '@/shared/diagnostics/recentErrors'

type AppProvidersProps = {
  children?: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  // Keeps a short, redacted list of recent errors for "Report an Issue".
  useEffect(() => installRecentErrorCapture(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AppPreferencesProvider>
          <RouterProvider router={appRouter} />
          {children}
          <Toaster position="top-right" />
        </AppPreferencesProvider>
      </UserProvider>
    </QueryClientProvider>
  )
}
