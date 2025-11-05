import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useUser } from '@/context/UserContext'

export const Route = createFileRoute('/cognito-callback')({
  component: CognitoCallback,
})

function CognitoCallback() {
  const { login } = useUser()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const email = params.get('email') || params.get('user_id')

    if (accessToken && email) {
      login({
        username: email,
        token: accessToken,
        strategy: 'okta',
      })

      // ✅ Clean URL to avoid showing token
      window.history.replaceState({}, '', '/dashboard/')

      // ✅ Redirect to home page after saving
      window.location.assign('/dashboard/')
    } else {
      // Invalid → go back to login screen
      window.location.assign('/dashboard/login')
    }
  }, [login])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}
