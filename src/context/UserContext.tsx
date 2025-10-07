// src/context/UserContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { LoginStrategy } from '@/types/auth'
import { useQuery } from '@tanstack/react-query'
import { fetchRoles } from '@/api'

type UserContextType = {
  username: string | null
  role: string | null
  roles: string[]
  token: string | null
  strategy: LoginStrategy | null
  activeScreen: 'ncrc-dashboard' | 'tasks-dashboard' | null
  loginTime: number | null
  login: (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => void
  logout: () => void
  setActiveScreen: (screen: 'ncrc-dashboard' | 'tasks-dashboard' | null) => void
  setRole: (role: string | null) => void
  setRoles: (roles: string[]) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<LoginStrategy | null>(null)
  const [loginTime, setLoginTime] = useState<number | null>(null)
  const [activeScreen, setActiveScreen] = useState<'ncrc-dashboard' | 'tasks-dashboard' | null>('ncrc-dashboard')

  // 👇 useQuery but disabled — only run when we call refetch()
  const { refetch } = useQuery({
    queryKey: ['roles', username],
    queryFn: () => fetchRoles({ username, token, strategy }),
    enabled: false, // manual mode
    refetchOnWindowFocus: false,
  })

  // 🔹 Fetch roles manually after login (when username changes)
  useEffect(() => {
    if (username) {
      console.log("🔄 Preparing to fetch roles for:", username)
      refetch().then((result) => {
        if (result.data) {
          console.log("✅ Refetch returned data:", result.data)
          setRoles(result.data)

          const defaultRole = role || result.data[0]?.value || null
          setRole(defaultRole)

          localStorage.setItem(
            'user',
            JSON.stringify({
              username,
              role: defaultRole,
              roles: result.data,
              token,
              strategy,
              loginTime,
            })
          )
        }
      })
    }
  }, [username, refetch]) // ⬅️ include refetch in deps

  // 🔹 Load from storage on refresh
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)

      const now = Date.now()
      const expiresIn = 24 * 60 * 60 * 1000 // 24 hrs

      if (parsed.loginTime && now - parsed.loginTime > expiresIn) {
        localStorage.removeItem('user')
      } else {
        setUsername(parsed.username)
        setRole(parsed.role || null)
        setRoles(parsed.roles || [])
        setToken(parsed.token)
        setStrategy(parsed.strategy)
        setLoginTime(parsed.loginTime)
      }
    }
  }, [])

  // 🔹 Basic login
  const login = (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => {
    const now = Date.now()
    setUsername(data.username)
    setRole(data.role || null)
    setRoles([]) // roles will be fetched manually after login
    setToken(data.token || null)
    setStrategy(data.strategy)
    setLoginTime(now)

    localStorage.setItem(
      'user',
      JSON.stringify({
        username: data.username,
        role: data.role || null,
        roles: [],
        token: data.token || null,
        strategy: data.strategy,
        loginTime: now,
      })
    )
  }

  const logout = () => {
    setUsername(null)
    setRole(null)
    setRoles([])
    setToken(null)
    setStrategy(null)
    setLoginTime(null)
    localStorage.removeItem('user')
  }

  return (
    <UserContext.Provider
      value={{
        username,
        role,
        roles,
        setRole,
        setRoles,
        token,
        strategy,
        activeScreen,
        loginTime,
        login,
        logout,
        setActiveScreen,
      }}
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