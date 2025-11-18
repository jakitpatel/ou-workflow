import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { loginApi } from "@/api";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Lock, ShieldCheck, LogIn, Server } from 'lucide-react'
import { authlogin } from "@/components/auth/authService";

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const {
    login,
    username,
    token,
    loginTime,
    apiBaseUrl,
    setApiBaseUrl, // 👈 from UserContext
  } = useUser()

  const navigate = useNavigate()

  const [formUsername, setFormUsername] = useState('')
  const [password, setPassword] = useState('')
  const [strategy, setStrategy] = useState<'none' | 'api' | 'cognito' | 'cognitodirect'>('cognito')
  const [error, setError] = useState('')
  const [availableServers, setAvailableServers] = useState<string[]>([])

  const usernameRef = useRef<HTMLInputElement>(null)

  // 🔹 Load API servers from window.__APP_CONFIG__
  useEffect(() => {
    const config = (window as any).__APP_CONFIG__
    if (config) {
      const servers = Object.keys(config)
        .filter((key) => key.startsWith('API_CLIENT_URL'))
        .map((key) => config[key])
        .filter(Boolean)
      setAvailableServers(servers)

      // if no server selected yet, pick the first one
      if (!apiBaseUrl && servers.length > 0) {
        setApiBaseUrl(servers[0])
      }
    }
  }, [apiBaseUrl, setApiBaseUrl])

  // 🔹 Auto-redirect if user is already logged in
  useEffect(() => {
    if (username && token && loginTime) {
      const now = Date.now()
      const expiresIn = 24 * 60 * 60 * 1000 // 24 hrs
      if (now - loginTime < expiresIn) {
        navigate({ to: '/' })
      }
    }
  }, [username, token, loginTime, navigate])

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  // 🔹 API login mutation
  const apiLogin = useMutation({
    mutationFn: loginApi, // 👈 use selected server
    onSuccess: (data) => {
      login({
        username: formUsername,
        role: data.role,
        token: data.access_token,
        strategy: 'api',
      })
      navigate({ to: '/' })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiBaseUrl) {
      setError('Please select an API server first.')
      return
    }

    if (strategy === 'none') {
      if (!formUsername.trim()) {
        setError('Username is required for No Security login.')
        return
      }
      setError('')
      login({ username: formUsername, strategy: 'none' })
      navigate({ to: '/' })
    }

    if (strategy === 'api') {
      if (!formUsername.trim() || !password.trim()) {
        setError('Username and password are required for API login.')
        return
      }
      setError('')
      apiLogin.mutate({ username: formUsername, password })
    }

    if (strategy === 'cognito') {
      handleCognito()
    }

    if (strategy === 'cognitodirect') {
      handleCognitoDirect()
    }
  }

  const handleCognito = () => {
    if (!apiBaseUrl) {
      setError('Please select an API server before using Cognito login.')
      return
    }
    // ✅ persist the selected server before redirect
    try {
      const storedUser = localStorage.getItem('user')
      const parsed = storedUser ? JSON.parse(storedUser) : {}
      parsed.apiBaseUrl = apiBaseUrl
      localStorage.setItem('user', JSON.stringify(parsed))
      console.log('[handleCognito] Saved apiBaseUrl before redirect:', apiBaseUrl)
    } catch (err) {
      console.warn('[handleCognito] Failed to persist apiBaseUrl:', err)
    }
    const base = import.meta.env.BASE_URL || '/'
    const origin = window.location.origin
    const callBackUrl = `${origin}${base.replace(/\/$/, '')}/cognito-callback`
    const returnUrl = encodeURIComponent(callBackUrl)
    const loginUrl = `${apiBaseUrl}/api/auth/login?return_url=${returnUrl}`

    console.log('Redirecting to:', loginUrl)
    window.location.replace(loginUrl)
  }

  const handleCognitoDirect = () => {
    if (!apiBaseUrl) {
      setError('Please select an API server before using Cognito login.')
      return
    }
    // ✅ persist the selected server before redirect
    try {
      const storedUser = localStorage.getItem('user')
      const parsed = storedUser ? JSON.parse(storedUser) : {}
      parsed.apiBaseUrl = apiBaseUrl
      localStorage.setItem('user', JSON.stringify(parsed))
      console.log('[handleCognito] Saved apiBaseUrl before redirect:', apiBaseUrl)
    } catch (err) {
      console.warn('[handleCognito] Failed to persist apiBaseUrl:', err)
    }
    //sessionStorage.setItem('auth_redirect', window.location.pathname + window.location.search);
    authlogin();
    /*const base = import.meta.env.BASE_URL || '/'
    const origin = window.location.origin
    const callBackUrl = `${origin}${base.replace(/\/$/, '')}/cognito-callback`
    const returnUrl = encodeURIComponent(callBackUrl)
    const loginUrl = `${apiBaseUrl}/api/auth/login?return_url=${returnUrl}`

    console.log('Redirecting to:', loginUrl)
    window.location.replace(loginUrl)
    */
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-blue-900">
        <LogIn className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Login</h1>
      </div>

      <Card className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Login Options</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* 🔹 Server Selector */}
          <div>
            <label className="text-sm font-medium text-blue-800 mb-1 block">
              Select API Server
            </label>
            <Select
              value={apiBaseUrl || ''}
              onValueChange={(val) => setApiBaseUrl(val)}
            >
              <SelectTrigger className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" />
                <SelectValue placeholder="Choose API server" />
              </SelectTrigger>
              <SelectContent>
                {availableServers.map((url, i) => (
                  <SelectItem key={i} value={url}>
                    {url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🔹 Strategy Selector */}
          <Select
            value={strategy}
            onValueChange={(val) => setStrategy(val as 'none' | 'api' | 'cognito')}
          >
            <SelectTrigger className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <SelectValue placeholder="Choose login strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Security</SelectItem>
              <SelectItem value="api">API Security</SelectItem>
              <SelectItem value="cognito">Cognito Security</SelectItem>
              <SelectItem value="cognitodirect">Cognito Direct Security</SelectItem>
            </SelectContent>
          </Select>

          {/* 🔹 Username/Password (API mode only) */}
          {strategy === 'api' && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                <Input
                  placeholder="Username"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  ref={usernameRef}
                  className="pl-10"
                  autoComplete="username"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                <Input
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
                />
              </div>
            </>
          )}

          {/* 🔹 Submit */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-transform hover:scale-[1.02]"
          >
            {strategy === 'api' && apiLogin.isPending ? 'Logging in...' : 'Login'}
          </Button>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          {apiLogin.isError && (
            <p className="text-red-600 text-sm text-center">Login failed. Please try again.</p>
          )}
        </form>
      </Card>
    </div>
  )
}