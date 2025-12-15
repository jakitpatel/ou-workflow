import { createFileRoute, redirect } from "@tanstack/react-router"
import { getUserInfo, handleOAuthCallback } from "@/auth/authService"
import { useUser } from "@/context/UserContext"
import { useEffect } from "react"
import { isRedirect } from "@tanstack/react-router"
import type { UserRole, LoginStrategy } from "@/types/application"

// ============================================================================
// Types
// ============================================================================

interface UserData {
  username: string
  roles: UserRole[] | null
  role: string
  token: string
  strategy: LoginStrategy | null;
}

interface LoaderData {
  user: UserData
}

// ============================================================================
// Route Configuration
// ============================================================================

export const Route = createFileRoute("/cognito-directcallback")({
  /**
   * beforeLoad: Handles early authentication checks and prevents duplicate processing
   * - Runs before the loader
   * - Used for redirects and validation
   */
  beforeLoad: async ({ location }) => {
    console.log('[beforeLoad] Starting authentication flow')
    console.log('[beforeLoad] Current path:', location.pathname)

    // Check if OAuth callback has already been processed
    const isCallbackProcessed = sessionStorage.getItem("cognito_callback_done") === "1"
    
    if (isCallbackProcessed) {
      console.log('[beforeLoad] Callback already processed, redirecting...')
      
      const redirectTo = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")
      
      throw redirect({ to: redirectTo })
    }
    console.log('[beforeLoad] Validation passed, proceeding to loader')
  },

  /**
   * loader: Handles the OAuth callback and user data extraction
   * - Runs after beforeLoad
   * - Returns data accessible via useLoaderData()
   * - Throws redirects for error cases (NO component mounting)
   * - Only returns data for successful authentication
   */
  loader: async ({ location }): Promise<LoaderData> => {
    console.log('[loader] Processing OAuth callback', location.pathname)
    if (sessionStorage.getItem("cognito_callback_done") === "1") {
      throw redirect({ to: "/" })
    }
    try {
      // Step 1: Exchange authorization code for tokens
      const isCallbackSuccessful = await handleOAuthCallback()
      
      if (!isCallbackSuccessful) {
        console.error('[loader] OAuth callback failed')
        throw redirect({ 
          to: "/login",
          search: { error: "oauth_callback_failed" }
        })
      }

      console.log('[loader] OAuth callback successful, extracting user info')

      // Step 2: Extract and parse user information from tokens
      const userData = getUserInfo()
      
      if (!userData) {
        console.error('[loader] Failed to extract user info from tokens')
        throw redirect({ 
          to: "/login",
          search: { error: "user_info_extraction_failed" }
        })
      }

      console.log('[loader] User authenticated:', userData.username)
      console.log('[loader] User roles:', userData.roles)

      // Step 3: Structure user data for application context
      const user: UserData = {
        username: userData.username,
        roles: userData.roles,
        role: "ALL", // Default role or compute based on roles
        token: userData.access_token,
        strategy: "cognito",
      }

      // ✅ Only return data - component will handle login + navigation
      return { user }

    } catch (error) {
      // Handle redirect throws
      if (isRedirect(error)) {
        throw error
      }

      console.error('[loader] Unexpected error during authentication:', error)
      
      throw redirect({ 
        to: "/login",
        search: { 
          error: error instanceof Error ? error.message : "unknown_error" 
        }
      })
    }
  },

  component: CognitoDirectCallback,
})

// ============================================================================
// Component
// ============================================================================

/**
 * CognitoDirectCallback Component
 * 
 * This component only renders on successful authentication.
 * All error cases are handled via redirects in the loader.
 * 
 * Responsibilities:
 * 1. Update application context with authenticated user
 * 2. Mark callback as processed
 * 3. Navigate to final destination
 */
function CognitoDirectCallback() {
  const { login } = useUser()
  const navigate = Route.useNavigate()
  const { user } = Route.useLoaderData()

  console.log('[Component] Rendering with authenticated user:', user)

  useEffect(() => {
    console.log('[Component] Updating user context')

    // Update application context with authenticated user
    login(user, () => {
      console.log('[Component] User logged in to context successfully')
      
      // Mark callback as processed to prevent re-execution on refresh
      sessionStorage.setItem("cognito_callback_done", "1")

      // Determine final destination
      const finalDestination = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")

      console.log('[Component] Redirecting to:', finalDestination)

      navigate({ to: finalDestination })
    })
  }, [])

  // Show loading state while context update is in progress
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-lg text-blue-700 font-medium">
          Completing authentication...
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Setting up your session
        </p>
      </div>
    </div>
  )
}