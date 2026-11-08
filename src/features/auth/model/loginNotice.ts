/*
 * A one-time message for the login screen, kept in sessionStorage so it survives the Cognito logout
 * redirect (logout -> Cognito /logout -> /cognito-logout -> /login). Logout clears only its own
 * keys, so this one remains until the login screen reads it.
 */
const LOGIN_NOTICE_KEY = 'ncrc.loginNotice'

export const USER_DETAILS_UNAVAILABLE_NOTICE =
  "We couldn't load your user details (502 Bad Gateway). The server may be temporarily unavailable. Please sign in again."

export function storeLoginNotice(message: string): void {
  try {
    sessionStorage.setItem(LOGIN_NOTICE_KEY, message)
  } catch {
    // Storage unavailable (private mode, quota): the toast shown before the redirect remains.
  }
}

export function readLoginNotice(): string | null {
  try {
    return sessionStorage.getItem(LOGIN_NOTICE_KEY)
  } catch {
    return null
  }
}

export function clearLoginNotice(): void {
  try {
    sessionStorage.removeItem(LOGIN_NOTICE_KEY)
  } catch {
    // Nothing to clear.
  }
}
