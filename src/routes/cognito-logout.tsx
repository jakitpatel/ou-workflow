import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { clearTokens } from '@/components/auth/authService'

export const Route = createFileRoute('/cognito-logout')({
  component: CognitoLogout,
})

function CognitoLogout() {
  const navigate = useNavigate()

  useEffect(() => {
    // 🔄 Cleanup local session state (safe even if tokens already cleared)
    clearTokens()

    // 🚀 Redirect user to login screen after logout is complete
    navigate({ to: '/login' })
  }, [])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Signing you out...
    </div>
  )
}