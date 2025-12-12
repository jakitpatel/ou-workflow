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

    // Handle OAuth + token parsing
    const ok = await handleOAuthCallback()
    if (!ok) {
      throw redirect({
        to: "/login",
        search: { error: "OAuth callback invalid" },
      })
    }

    const data = getUserInfo()
    if (!data) {
      throw redirect({
        to: "/login",
        search: { error: "Unable to load user info" },
      })
    }

    // Return data to component — do NOT mark callback_done yet
    return {
      user: {
        username: data.username,
        roles: data.roles,
        role: "ALL",
        token: data.access_token,
        strategy: "cognito",
      },
    }
  },

  component: CognitoDirectCallback,
})

function CognitoDirectCallback() {
  const { login } = useUser()
  const navigate = Route.useNavigate()

  // Data returned from beforeLoad()
  const { user } = Route.useLoaderData()

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" })
      return
    }

    // Perform the actual login inside React
    login(user, () => {
      // Mark OAuth flow completed only after we log them in
      sessionStorage.setItem("cognito_callback_done", "1")

      // Redirect back to original protected route (if any)
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