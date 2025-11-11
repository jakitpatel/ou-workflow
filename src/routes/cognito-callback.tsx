import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useUser } from '@/context/UserContext'

export const Route = createFileRoute('/cognito-callback')({
  component: CognitoCallback,
})

function CognitoCallback() {
  const { login } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const email = params.get('email') || params.get('user_id')
    const username = params.get('user_id') || email;  // assuming email is used as username
    if (accessToken && username) {
      login({
        username: username,
        token: accessToken,
        strategy: 'cognito', // ✅ correct provider
      })

      setTimeout(() => {
        navigate({ to: '/' }) // ✅ goes to dashboard (home route)
      }, 50) // let context sync to storage first
    } else {
      navigate({ to: '/login' })
    }
  }, [])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}
