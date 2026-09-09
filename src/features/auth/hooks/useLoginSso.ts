import { useCallback, useEffect, useRef, useState } from 'react'
import { authlogin, isAuthenticated } from '@/auth/authService'
import { saveStoredAppPreferences, type StoredAppPreferences } from '@/context/appPreferencesStorage'

export function useLoginSso(preferences: StoredAppPreferences, search: string) {
  const { apiBaseUrl, stageLayout, paginationMode, navigationMenuType } = preferences
  const attempted = useRef(false)
  const inFlight = useRef(false)
  const [isStartingLogin, setIsStartingLogin] = useState(false)
  const [startupError, setStartupError] = useState('')
  const query = new URLSearchParams(search)
  const hasOAuthError = query.has('error')
  const signedOut = query.get('signedOut') === '1'

  const startLogin = useCallback(async () => {
    if (inFlight.current || isAuthenticated() || !apiBaseUrl || apiBaseUrl === 'http://localhost:3001') return
    attempted.current = true
    inFlight.current = true
    setIsStartingLogin(true)
    setStartupError('')
    try {
      try {
        saveStoredAppPreferences({ apiBaseUrl, stageLayout, paginationMode, navigationMenuType })
      } catch {
        // Preference persistence must not prevent sign-in.
      }
      await authlogin()
      // Keep the lock until navigation completes so a second request cannot replace PKCE state.
    } catch {
      inFlight.current = false
      setIsStartingLogin(false)
      setStartupError('Unable to start sign-in. Please try again.')
    }
  }, [apiBaseUrl, stageLayout, paginationMode, navigationMenuType])

  useEffect(() => {
    if (attempted.current || hasOAuthError || signedOut) return
    void startLogin()
  }, [hasOAuthError, signedOut, startLogin])

  return {
    startLogin,
    isStartingLogin,
    error: startupError || (hasOAuthError ? 'Sign-in could not be completed. Please try again.' : ''),
  }
}
