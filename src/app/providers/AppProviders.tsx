import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { UserProvider } from '@/context/UserContext'
import { AppPreferencesProvider } from '@/context/AppPreferencesContext'
import { queryClient, appRouter } from '@/app/router/createAppRouter'

type AppProvidersProps = {
  children?: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
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
