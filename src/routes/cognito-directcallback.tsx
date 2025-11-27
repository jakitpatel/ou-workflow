import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useCallback } from 'react'
import { useUser } from '@/context/UserContext'
import { handleOAuthCallback } from '@/components/auth/authService'
import { fetchRoles } from '@/api'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/cognito-directcallback')({
  component: CognitoDirectCallback,
})

function CognitoDirectCallback() {
  const navigate = useNavigate()
  const { login } = useUser()

  const { refetch: fetchUserRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const token = sessionStorage.getItem("access_token")!
      return fetchRoles({ token })
    },
    enabled: false,
    refetchOnWindowFocus: false,
  })

  const runOAuthFlow = useCallback(async () => {
    try {
      // 🚫 Prevent double execution (production safe)
      if (sessionStorage.getItem("cognito_callback_done") === "1") {
        console.warn("[CognitoDirectCallback] Skipping re-run")
        return
      }

      sessionStorage.setItem("cognito_callback_done", "1")

      // 1) Handle callback — puts token into sessionStorage
      const success = await handleOAuthCallback()
      if (!success) throw new Error("OAuth callback missing or invalid")

      const token = sessionStorage.getItem("access_token")
      if (!token) throw new Error("Token missing after OAuth callback")

      // 2) Fetch roles
      const { data } = await fetchUserRoles()
      if (!data) throw new Error("No data returned from roles fetch")

      const userInfo = data.user_info
      if (!userInfo) throw new Error("Failed to load user info")

      const formattedRoles = (userInfo.roles || []).map((r: any) => ({
        name: r.role_name,
        value: r.role_name,
        created: null,
      }))

      // 3) Login
      login({
        username: userInfo.user_id,
        role: "ALL",
        roles: formattedRoles,
        token: data.access_token,
        strategy: "cognitodirect",
      })

      // 4) Redirect
      const redirectUrl = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")

      navigate({ to: redirectUrl })
      console.log("[CognitoDirectCallback] Completed")

    } catch (err: any) {
      console.error("[CognitoDirectCallback] error:", err)
      navigate({
        to: "/login",
        search: { error: err.message ?? "OAuth failure" },
      })
    }
  }, [navigate, login, fetchUserRoles])

  useEffect(() => {
    runOAuthFlow()
  }, [runOAuthFlow])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}