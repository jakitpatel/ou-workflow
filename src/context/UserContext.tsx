// src/context/UserContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { LoginStrategy } from '@/types/auth'

type UserContextType = {
  username: string | null
  role: string | null
  token: string | null
  strategy: LoginStrategy | null
  activeScreen: string
  loginTime: number | null   // 👈 timestamp in ms
  login: (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => void
  logout: () => void
  setActiveScreen: (screen: string) => void
  setRole: (role: string | null) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<LoginStrategy | null>(null)
  const [loginTime, setLoginTime] = useState<number | null>(null)
  const [activeScreen, setActiveScreen] = useState<'ncrc-dashboard' | 'tasks-dashboard'>('ncrc-dashboard')

  // Load from storage on refresh
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)

      const now = Date.now()
      const expiresIn = 24 * 60 * 60 * 1000 // 24 hrs in ms

      if (parsed.loginTime && now - parsed.loginTime > expiresIn) {
        // expired
        localStorage.removeItem('user')
      } else {
        setUsername(parsed.username)
        setRole(parsed.role)
        setToken(parsed.token)
        setStrategy(parsed.strategy)
        setLoginTime(parsed.loginTime)
      }
    }
  }, [])

  const login = (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => {
    const now = Date.now()
    setUsername(data.username)
    setRole(data.role || null)
    setToken(data.token || null)
    setStrategy(data.strategy)
    setLoginTime(now)

    localStorage.setItem(
      'user',
      JSON.stringify({
        username: data.username,
        role: data.role || null,
        token: data.token || null,
        strategy: data.strategy,
        loginTime: now, // 👈 save as number (ms since epoch)
      })
    )
  }

  const logout = () => {
    setUsername(null)
    setRole(null)
    setToken(null)
    setStrategy(null)
    setLoginTime(null)
    localStorage.removeItem('user')
  }

  return (
    <UserContext.Provider
      value={{ username, role, setRole, token, strategy, activeScreen, loginTime, login, logout, setActiveScreen }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}