import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { handleOAuthCallback, getUserInfo } from '@/components/auth/authService'

export const Route = createFileRoute('/cognito-directcallback')({
  component: CognitoDirectCallback,
})

function CognitoDirectCallback() {
  const { login, rolesLoaded } = useUser()
  const navigate = useNavigate()

  // 1️⃣ Handle OAuth first
  useEffect(() => {
    const authenticate = async () => {
      try {
        const ok = await handleOAuthCallback()
        if (!ok) throw new Error("OAuth callback missing valid code")

        const userInfo = getUserInfo()
        if (!userInfo) throw new Error("Failed to extract user info")

        const uname = userInfo.email.split("@")[0]

        login({
          username: uname,
          token: sessionStorage.getItem("access_token")!,
          strategy: "cognitodirect"
        })

        console.log("[CognitoDirectCallback] login complete")
      } catch (err: any) {
        console.error("[CognitoDirectCallback] Auth error:", err)
        navigate({ to: "/login", search: { error: err.message } })
      }
    }

    authenticate()
  }, [])

  // 2️⃣ When roles are ready → navigate
  useEffect(() => {
    if (rolesLoaded) {
      const redirectUrl = sessionStorage.getItem("auth_redirect") || "/"
      sessionStorage.removeItem("auth_redirect")
      navigate({ to: redirectUrl })
    }
  }, [rolesLoaded])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}
