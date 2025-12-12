import { createFileRoute, redirect } from "@tanstack/react-router"
import { getUserInfo, handleOAuthCallback } from "@/components/auth/authService"
import { useUser } from "@/context/UserContext"
import { useEffect } from "react"

export const Route = createFileRoute("/cognito-directcallback")({
  beforeLoad: async () => {
    // Prevent rerunning the callback when page is refreshed
    if (sessionStorage.getItem("cognito_callback_done") === "1") {
      const redirectTo = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")
      throw redirect({ to: redirectTo })
    }

    try {
      // Step 1: OAuth code → tokens
      const ok = await handleOAuthCallback()
      if (!ok) {
        return { user: null }  // <-- always return object to avoid undefined
      }

      // Step 2: Extract user info from tokens
      const data = getUserInfo()
      if (!data) {
        return { user: null }  // <-- avoid undefined
      }

      // Step 3: Return for component-side login
      return {
        user: {
          username: data.username,
          roles: data.roles,
          role: "ALL",
          token: data.access_token,
          strategy: "cognito",
        },
      }
    } catch (err) {
      return { user: null } // <-- ALWAYS return safe loader shape
    }
  },

  component: CognitoDirectCallback,
})

function CognitoDirectCallback() {
  const { login } = useUser()
  const navigate = Route.useNavigate()

  // Loader always returns at least: { user: null }
  const { user } = Route.useLoaderData()

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" })
      return
    }

    // Perform login on the client
    login(user, () => {
      // Mark the callback flow complete *after* login succeeds
      sessionStorage.setItem("cognito_callback_done", "1")

      // Redirect back to the protected page or home
      const redirectTo = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")

      navigate({ to: redirectTo })
    })
  }, [])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}