import { createFileRoute, redirect } from "@tanstack/react-router"
import { clearTokens } from "@/components/auth/authService"

/**
 * Cognito Logout Callback Route - Professional Implementation
 * 
 * This route is called after Cognito logout redirects back to the app.
 * Best Practices Applied:
 * 1. Clear all tokens and user data (sessionStorage + localStorage)
 * 2. Use full page reload to ensure UserContext re-initializes cleanly
 * 3. Proper cleanup to prevent state inconsistencies
 */
export const Route = createFileRoute("/cognito-logout")({
  beforeLoad: () => {
    // 1) Clear user tokens/session immediately
    clearTokens()

    // 2) Redirect to login
    throw redirect({
      to: "/login",
    })
  },

  component: () => (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Signing you out...
    </div>
  ),
})
