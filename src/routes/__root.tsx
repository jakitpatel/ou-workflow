import { Outlet, createRootRoute, redirect, useRouterState } from '@tanstack/react-router'
//import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
//import { TanstackDevtools } from '@tanstack/react-devtools'
//import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Navigation } from '@/components/ou-workflow/Navigation'
import { isAuthenticated } from "@/components/auth/authService"

// ✅ Normalize base: remove trailing slash
/*
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || ''
const LOGIN_PATH = `${BASE}/login`
const CALLBACK_DIRECT_PATH = `${BASE}/cognito-directcallback`
const COGNITO_LOGOUT_PATH = `${BASE}/cognito-logout`
*/

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    // Use endsWith() for reliable path matching regardless of BASE_URL differences
    const path = location.pathname;
    console.log("Root beforeLoad path:", path); // <-- Add this log
    const isPublicPath = 
        path.endsWith('/login') || 
        path.endsWith('/cognito-directcallback') || 
        path.endsWith('/cognito-logout');
    
    // ✅ If it's a public path, immediately return and allow navigation to proceed
    if (isPublicPath) {
      return; 
    }

    // --- Protected Routes Logic ---
    /*const userStr = sessionStorage.getItem('user')
    if (!userStr) {
      // If user isn't in local storage and not on a public path, redirect to login
      throw redirect({ to: '/login' })
    }*/

    if (!isAuthenticated()) {
      // If user data is stale/invalid, clear it and redirect to login
      sessionStorage.removeItem('user');
      throw redirect({ to: '/login' })
    }
    
    // If we reach here, the user is authenticated and on a protected route.
  },
  component: RootLayout,
})

function RootLayout() {
  const route = useRouterState();
  const path = route.location.pathname;

  const isLoginPage =
    path.endsWith("/login") ||
    path.endsWith("/cognito-directcallback");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ✅ Show nav everywhere except /login */}
      {!isLoginPage && <Navigation />}

      <main className="flex-1">
        <Outlet />
      </main>
      {/*
      <ReactQueryDevtools initialIsOpen={false} />
      <TanstackDevtools
        config={{ position: 'bottom-left' }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />*/}
    </div>
  )
}
