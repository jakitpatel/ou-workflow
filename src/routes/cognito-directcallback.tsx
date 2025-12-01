import { createFileRoute, redirect } from "@tanstack/react-router"
import { handleOAuthCallback } from "@/components/auth/authService"
import { fetchRoles } from "@/api"
import { useUser } from "@/context/UserContext"
import { useEffect } from "react"
import type { QueryClient } from "@tanstack/react-query"

export const Route = createFileRoute("/cognito-directcallback")({
  beforeLoad: async ({ context }) => {
    const queryClient = (context as { queryClient: QueryClient }).queryClient;
    console.log("[CognitoCallback] Starting OAuth handler...")

    // 🔒 Prevent browser re-executing OAuth flow on refresh
    if (sessionStorage.getItem("cognito_callback_done") === "1") {
      console.warn("[CognitoCallback] Already completed, redirecting...")
      const redirectTo = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")
      throw redirect({
        to: redirectTo,
      })
    }

    try {
      // 1) Handle OAuth callback
      const ok = await handleOAuthCallback()
      if (!ok) {
        throw redirect({
          to: "/login",
          search: { error: "OAuth callback invalid" },
        })
      }

      const token = sessionStorage.getItem("access_token")
      if (!token) {
        throw redirect({
          to: "/login",
          search: { error: "Token missing" },
        })
      }

      // 2) Fetch roles via queryClient
      const data = await queryClient.fetchQuery({
        queryKey: ["roles"],
        queryFn: () => fetchRoles({ token }), // username required by type but not used
      }) as any // fetchRoles returns UserRoleTokenResponse but is typed as any[]

      if (!data || !data.user_info) {
        throw redirect({
          to: "/login",
          search: { error: "Unable to load user info" },
        })
      }

      const roles = Array.isArray(data.user_info.roles)
        ? data.user_info.roles.map((r: { role_name?: string }) => ({ name: r.role_name || "" }))
        : []

      // 3) Store final user object in sessionStorage for use in component
      sessionStorage.setItem(
        "final_user_json",
        JSON.stringify({
          username: data.user_info.user_id,
          role: "ALL",
          roles,
          token: data.access_token,
          strategy: "cognito",
        })
      )

      // Mark as done ONLY after successful completion
      sessionStorage.setItem("cognito_callback_done", "1")
    } catch (error) {
      // Cleanup on error to allow retry
      sessionStorage.removeItem("cognito_callback_done")
      sessionStorage.removeItem("final_user_json")
      throw error
    }

    // No redirect yet → wait until component loads to complete login
  },

  component: CognitoDirectCallback,
})

function CognitoDirectCallback() {
  const { login } = useUser()
  const navigate = Route.useNavigate()

  useEffect(() => {
    const savedUser = sessionStorage.getItem("final_user_json");

    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      sessionStorage.removeItem("final_user_json");

      // Use the new login callback pattern
      login(userObj, () => {
        navigate({ to: "/" });
      });
    } else {
      // fallback if something went wrong
      navigate({ to: "/login" });
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}