import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { AppPreferencesProvider } from '@/context/AppPreferencesContext.tsx'
import { UserProvider } from '@/context/UserContext.tsx'
import { appQueryClient } from '@/shared/api/queryClient'

import './index.css'
import reportWebVitals from './reportWebVitals.ts'
import { routeTree } from './routeTree.gen'

// Shared app QueryClient instance
export const queryClient = appQueryClient

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, ''),
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
    context: {
      queryClient: typeof queryClient
    }
  }
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <AppPreferencesProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" />
          </AppPreferencesProvider>
        </UserProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

reportWebVitals()
