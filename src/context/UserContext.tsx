import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { LoginStrategy } from '@/types/auth'
import { useQuery } from '@tanstack/react-query'
import { fetchRoles, registerUserContext } from '@/api'
import type { UserRole } from '@/types/application'

type UserContextType = {
  username: string | null
  role: string | null
  roles: UserRole[] | null;     // Update this field
  token: string | null
  strategy: LoginStrategy | null
  activeScreen: 'ncrc-dashboard' | 'tasks-dashboard' | null
  loginTime: number | null
  apiBaseUrl: string | null
  setApiBaseUrl: (url: string | null) => void
  login: (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => void
  logout: () => void
  setActiveScreen: (screen: 'ncrc-dashboard' | 'tasks-dashboard' | null) => void
  setRole: (role: string | null) => void
  setRoles: (roles: UserRole[] | null) => void  // 🔄 Updated
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  //const [roles, setRoles] = useState<string[]>([])
  const [roles, setRoles] = useState<UserRole[] | null>(null) // 🔄 Updated
  const [token, setToken] = useState<string | null>(null)
  const [strategy, setStrategy] = useState<LoginStrategy | null>(null)
  const [loginTime, setLoginTime] = useState<number | null>(null)
  const [activeScreen, setActiveScreen] = useState<'ncrc-dashboard' | 'tasks-dashboard' | null>('ncrc-dashboard')

  //const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(
  () => localStorage.getItem('apiBaseUrl') || null
)

  // ✅ Ensure context registration always matches current base URL
  useEffect(() => {
    registerUserContext({ apiBaseUrl })
  }, [apiBaseUrl])

  // ✅ Load from localStorage on startup FIRST (before anything else)
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)
      const now = Date.now()
      const expiresIn = 24 * 60 * 60 * 1000 // 24 hours

      if (parsed.loginTime && now - parsed.loginTime > expiresIn) {
        localStorage.removeItem('user')
      } else {
        setUsername(parsed.username)
        setRole(parsed.role || null)
        setRoles(parsed.roles || [])
        setToken(parsed.token)
        setStrategy(parsed.strategy)
        setLoginTime(parsed.loginTime)
        //console.log(parsed);
        //console.log("[UserContext] Loaded user from storage:", parsed.apiBaseUrl)
        // ✅ Preserve stored API Base URL if present
        if (parsed.apiBaseUrl && parsed.apiBaseUrl !== 'null') {
          setApiBaseUrl(parsed.apiBaseUrl)
        } else {
          /*// fallback: try first configured server
          const config = (window as any).__APP_CONFIG__
          if (config) {
            const servers = Object.keys(config)
              .filter((k) => k.startsWith('API_CLIENT_URL'))
              .map((k) => config[k])
              .filter(Boolean)
            if (servers.length > 0) setApiBaseUrl(servers[0])
          }*/
        }
      }
    } else {
      // No user stored: fallback to first configured server
      /*
      const config = (window as any).__APP_CONFIG__
      if (config) {
        const servers = Object.keys(config)
          .filter((k) => k.startsWith('API_CLIENT_URL'))
          .map((k) => config[k])
          .filter(Boolean)
        if (servers.length > 0) setApiBaseUrl(servers[0])
      }
      */
    }
  }, [])

  // 🔹 Persist selected API server whenever it changes
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)
      parsed.apiBaseUrl = apiBaseUrl
      localStorage.setItem('user', JSON.stringify(parsed))
    }
  }, [apiBaseUrl])

  const { refetch } = useQuery({
    queryKey: ['roles', username, token],
    queryFn: () =>
      fetchRoles({
        username: username ?? '',
        token: token ?? undefined,
        strategy: strategy ?? undefined,
      }),
    enabled: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) return false
      return failureCount < 2
    },
  })

  useEffect(() => {
    if (username && token && apiBaseUrl) {
      refetch().then((result) => {
        if (result.error) {
          const err: any = result.error
          const msg =
            err.details?.msg ||
            err.details?.message ||
            err.message ||
            'Unknown error'

          console.error('❌ Role fetch failed:', msg, err)
          if (
            msg.includes('Signature verification failed') ||
            msg.includes('invalid token') ||
            err.status === 401 ||
            err.status === 422
          ) {
            window.alert('Your session has expired or is invalid. Please log in again.')
            logout()
            const base = import.meta.env.BASE_URL || '/'
            const loginUrl = `${base.replace(/\/$/, '')}/login`
            window.location.replace(loginUrl)
            return
          }
        }

        if (result.data) {
          setRoles(result.data)
          const defaultRole = role || 'ALL'
          setRole(defaultRole)

          // ✅ Preserve current apiBaseUrl while saving user
          localStorage.setItem(
            'user',
            JSON.stringify({
              username,
              role: defaultRole,
              roles: result.data,
              token,
              strategy,
              loginTime,
              apiBaseUrl,
            })
          )
        }
      })
    }
  }, [username, token, refetch, apiBaseUrl])

  const login = (data: { username: string; role?: string; token?: string; strategy: LoginStrategy }) => {
    const now = Date.now()
    setUsername(data.username)
    setRole(data.role || null)
    setRoles([])
    setToken(data.token || null)
    setStrategy(data.strategy)
    setLoginTime(now)

    // ✅ Fallback to existing apiBaseUrl or persisted one
    const stored = localStorage.getItem('user')
    let preservedApiBaseUrl = apiBaseUrl;
    //console.log("apiBaseUrl : "+apiBaseUrl);
    if (!preservedApiBaseUrl && stored) {
      //console.log("preservedApiBaseUrl : "+preservedApiBaseUrl);
      try {
        const parsed = JSON.parse(stored)
        if (parsed.apiBaseUrl && parsed.apiBaseUrl !== 'null') {
          preservedApiBaseUrl = parsed.apiBaseUrl
          //console.log("[UserContext:login] Preserving stored API Base URL:", preservedApiBaseUrl);
          setApiBaseUrl(parsed.apiBaseUrl)
        }
      } catch {}
    }

    // ✅ Include selected API server
    localStorage.setItem(
      'user',
      JSON.stringify({
        username: data.username,
        role: data.role || null,
        roles: [],
        token: data.token || null,
        strategy: data.strategy,
        loginTime: now,
        apiBaseUrl: preservedApiBaseUrl, // ✅ Preserve old one
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
        apiBaseUrl,
        setApiBaseUrl,
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