import { Outlet, createRootRoute, redirect, useRouterState } from '@tanstack/react-router'
import { Navigation } from '@/components/ou-workflow/Navigation'
import { isAuthenticated } from "@/auth/authService"

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
    </div>
  )
}
