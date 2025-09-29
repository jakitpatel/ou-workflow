// src/context/UserContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import type { LoginStrategy } from '@/types/auth'

type UserContextType = {
  username: string | null
  role: string | null
  token: string | null
  strategy: LoginStrategy | null
  activeScreen: string
  login: (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => void
  logout: () => void
  setActiveScreen: (screen: string) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<LoginStrategy | null>(null)
  const [activeScreen, setActiveScreen] = useState<'ncrc-dashboard' | 'tasks-dashboard'>('ncrc-dashboard')

  // Load from storage on refresh
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUsername(parsed.username)
      setRole(parsed.role)
      setToken(parsed.token)
      setStrategy(parsed.strategy)
    }
  }, [])

  const login = (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => {
    setUsername(data.username)
    setRole(data.role || null)
    setToken(data.token || null)
    setStrategy(data.strategy)

    localStorage.setItem(
      'user',
      JSON.stringify({
        username: data.username,
        role: data.role || null,
        token: data.token || null,
        strategy: data.strategy,
      })
    )
  }

  const logout = () => {
    setUsername(null)
    setRole(null)
    setToken(null)
    setStrategy(null)
    localStorage.removeItem('user')
  }

  return (
    <UserContext.Provider value={{ username, role, setRole,token, strategy, activeScreen, login, logout, setActiveScreen }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within a UserProvider')
  return ctx
}