import { createFileRoute, redirect } from "@tanstack/react-router"
import { getUserInfo, handleOAuthCallback } from "@/components/auth/authService"
import { useUser } from "@/context/UserContext"
import { useEffect } from "react"

export const Route = createFileRoute("/cognito-directcallback")({
  beforeLoad: async () => {
    console.log('beforeLoad start');

    // Prevent rerunning OAuth flow on refresh
    if (sessionStorage.getItem("cognito_callback_done") === "1") {
      const redirectTo = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")

      return { user: null, redirectTo }
    }

    try {
      // Step 1: OAuth → tokens
      const ok = await handleOAuthCallback()
      if (!ok) return { user: null }

      // Step 2: parse user info
      const data = getUserInfo()
      if (!data) return { user: null }

      console.log('beforeLoad returning user:', data.username)

      return {
        user: {
          username: data.username,
          roles: data.roles,
          role: "ALL",
          token: data.access_token,
          strategy: "cognito",
        }
      }
    } catch {
      return { user: null }
    }
  },

  component: CognitoDirectCallback,
})

function CognitoDirectCallback() {
  const { login } = useUser()
  const navigate = Route.useNavigate()
  console.log("Route full path:", Route.fullPath);   // ✅ Add here
  console.log('useLoaderData called');
  const loaderData = Route.useLoaderData() ?? { user: null }
  console.log('loaderData:', loaderData);
  const user = loaderData.user
  const redirectTo = loaderData.redirectTo

  useEffect(() => {
    // Handle redirect case
    if (redirectTo) {
      navigate({ to: redirectTo })
      return
    }

    if (!user) {
      navigate({ to: "/login" })
      return
    }

    login(user, () => {
      sessionStorage.setItem("cognito_callback_done", "1")

      const finalDest = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")

      navigate({ to: finalDest })
    })
  }, [])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}
