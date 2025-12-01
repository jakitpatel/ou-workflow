import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './index.css'
import reportWebVitals from './reportWebVitals.ts'
import { UserProvider } from './context/UserContext.tsx' // 👈
import { Toaster } from 'sonner';

// Create a QueryClient instance  for React Query
export const queryClient = new QueryClient()

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, ''), // remove trailing slash if any like "/dashboard"
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
    context: {
      queryClient: QueryClient
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
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </UserProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
