import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useUser } from '@/context/UserContext'
import { handleOAuthCallback, getUserInfo } from '@/components/auth/authService'

export const Route = createFileRoute('/cognito-directcallback')({
  component: CognitoDirectCallback,
})

function CognitoDirectCallback() {
  const { login } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    const authenticate = async () => {
      try {
        // 🔐 Handle the callback and token exchange
        const ok = await handleOAuthCallback()

        if (!ok) {
          throw new Error('OAuth callback did not contain a valid code.')
        }

        // 👍 Retrieve user info from ID token (after successful token exchange)
        const userInfo = getUserInfo()
        if (!userInfo) {
          throw new Error('Failed to extract user info from ID token.')
        }
        let parts = userInfo.email.split('@');
        let uname = parts[0]; 
        console.log(uname); // Output: user.name
        
        // 💾 Save login state in React context
        login({
          username: uname, //userInfo.username,
          token: sessionStorage.getItem('access_token')!,
          strategy: 'cognitodirect',
        })

        console.log('[CognitoDirectCallback] User logged in:', userInfo)

        // 🧭 Redirect where user originally wanted to go
        const redirectUrl = sessionStorage.getItem('auth_redirect') || '/'
        sessionStorage.removeItem('auth_redirect')

        // Allow time for context persistence
        setTimeout(() => {
          navigate({ to: redirectUrl })
        }, 80)
      } catch (err: any) {
        console.error('[CognitoDirectCallback] Auth error:', err)
        navigate({ to: '/login', search: { error: err.message } })
      }
    }

    authenticate()
  }, [])

  return (
    <div className="flex items-center justify-center h-screen text-lg text-blue-700">
      Authenticating...
    </div>
  )
}
