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

  const {
    login,
    setRoles,
    setRole,
    setToken,
    setRolesLoaded,
    rolesLoaded,
  } = useUser()

  /* ------------------------------------------------------------------
   * React Query: Roles fetch (disabled initially)
   * Token passed later AFTER OAuth callback
   * ------------------------------------------------------------------ */
  const { refetch: fetchUserRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const token = sessionStorage.getItem("access_token")!
      return fetchRoles({ token: token})
    },
    enabled: false, // manual trigger ONLY
    refetchOnWindowFocus: false,
  })

  /* ------------------------------------------------------------------
   * STEP 1 — Execute OAuth callback → Then fetch roles → Then login
   * ------------------------------------------------------------------ */
  const runOAuthFlow = useCallback(async () => {
    try {
      // 1) Run Cognito callback → stores token in sessionStorage
      const success = await handleOAuthCallback()
      if (!success) throw new Error("OAuth callback missing or invalid")

      const token = sessionStorage.getItem("access_token")
      if (!token) throw new Error("Token missing after OAuth callback")

      // 2) Fetch roles now that token is ready
      const { data } = await fetchUserRoles()
      if (!data) throw new Error("No data returned from roles fetch")

      const userInfo = (data as any).user_info

      if (!userInfo) throw new Error("Failed to load user info")

      const formattedRoles = (userInfo.roles || []).map((r: any) => ({
        name: r.role_name,
        value: r.role_name,
        created: null,
      }))

      if (data?.access_token) {
        // 3) Login user into app context
        login({
          username: userInfo.user_id,
          roles: formattedRoles,
          token: data?.access_token,
          strategy: "cognitodirect",
        })
        //setToken(data.access_token)
        //setRoles(formattedRoles)
        //setRole((prev) => prev || "ALL")
        setRolesLoaded(true);
        console.log("[CognitoDirectCallback] OAuth + roles + login completed")
      }
    } catch (err: any) {
      console.error("[CognitoDirectCallback] error:", err)
      navigate({
        to: "/login",
        search: { error: err.message ?? "OAuth failure" },
      })
    }
  }, [
    fetchUserRoles,
    login,
    navigate,
    //setRoles,
    //setRole,
    //setToken,
    setRolesLoaded,
  ])

  // Run OAuth handler once on mount
  useEffect(() => {
    runOAuthFlow()
  }, [runOAuthFlow])

  /* ------------------------------------------------------------------
   * STEP 2 — Once roles are ready → redirect
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!rolesLoaded) return

    const redirectUrl = sessionStorage.getItem("auth_redirect") || "/"
    sessionStorage.removeItem("auth_redirect")

    navigate({ to: redirectUrl })
  }, [rolesLoaded, navigate])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}
