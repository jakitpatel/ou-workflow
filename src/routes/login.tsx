import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'

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

import { User, Lock, ShieldCheck, LogIn } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { login } = useUser()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [strategy, setStrategy] = useState<'none' | 'api'>('none')

  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  const apiLogin = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) throw new Error('Login failed')
      return res.json()
    },
    onSuccess: (data) => {
      login({ username: data.username, role: data.role, token: data.token, strategy: 'api' })
      navigate({ to: '/' })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (strategy === 'none') {
      login({ username, strategy: 'none' })
      navigate({ to: '/' })
    } else if (strategy === 'api') {
      apiLogin.mutate({ username, password })
    }
  }

  const handleOkta = () => {
    alert('Okta login not yet implemented!')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-blue-900">
        <LogIn className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Login</h1>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Login Options</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username Input */}
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              ref={usernameRef}
              className="pl-10"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
            />
          </div>

          {/* Password Input */}
          {strategy === 'api' && (
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
              <Input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
              />
            </div>
          )}

          {/* Strategy Selector */}
          <Select value={strategy} onValueChange={(val) => setStrategy(val as 'none' | 'api')}>
            <SelectTrigger className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <SelectValue placeholder="Choose login strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Security</SelectItem>
              <SelectItem value="api">API Security</SelectItem>
            </SelectContent>
          </Select>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-transform hover:scale-[1.02]"
          >
            {strategy === 'api' && apiLogin.isPending ? 'Logging in...' : 'Login'}
          </Button>

          {apiLogin.isError && (
            <p className="text-red-600 text-sm text-center">Login failed. Please try again.</p>
          )}
        </form>
      </Card>

      {/* Okta Card */}
      <Card className="w-full max-w-sm p-6 bg-white rounded-xl shadow-lg border border-blue-100">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Okta</h2>
        <Button
          onClick={handleOkta}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-transform hover:scale-[1.02]"
        >
          Login with Okta
        </Button>
      </Card>
    </div>
  )
}