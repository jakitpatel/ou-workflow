const STORAGE_KEYS = {
  accessToken: "access_token",
  idToken: "id_token",
  refreshToken: "refresh_token",
  oauthHandled: "oauth_handled",
  oauthState: "oauth_state",
  pkceCodeVerifier: "pkce_code_verifier",
  authRedirect: "auth_redirect",
} as const;

function getItem(key: string): string | null {
  return sessionStorage.getItem(key);
}

function setItem(key: string, value: string): void {
  sessionStorage.setItem(key, value);
}

function removeItem(key: string): void {
  sessionStorage.removeItem(key);
}

export type SessionTokens = {
  accessToken: string;
  idToken: string;
  refreshToken?: string | null;
};

export type PendingOAuthState = {
  codeVerifier: string;
  state: string;
};

export function getAccessToken(): string | null {
  return getItem(STORAGE_KEYS.accessToken);
}

export function getIdToken(): string | null {
  return getItem(STORAGE_KEYS.idToken);
}

export function getRefreshToken(): string | null {
  return getItem(STORAGE_KEYS.refreshToken);
}

export function storeTokens(tokens: SessionTokens): void {
  setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
  setItem(STORAGE_KEYS.idToken, tokens.idToken);

  if (tokens.refreshToken) {
    setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
  }
}

export function clearTokenStorage(): void {
  removeItem(STORAGE_KEYS.accessToken);
  removeItem(STORAGE_KEYS.idToken);
  removeItem(STORAGE_KEYS.refreshToken);
}

export function storePendingOAuthState({
  codeVerifier,
  state,
}: PendingOAuthState): void {
  setItem(STORAGE_KEYS.pkceCodeVerifier, codeVerifier);
  setItem(STORAGE_KEYS.oauthState, state);
}

export function getCodeVerifier(): string | null {
  return getItem(STORAGE_KEYS.pkceCodeVerifier);
}

export function getOAuthState(): string | null {
  return getItem(STORAGE_KEYS.oauthState);
}

export function clearPendingOAuthState(): void {
  removeItem(STORAGE_KEYS.pkceCodeVerifier);
  removeItem(STORAGE_KEYS.oauthState);
}

export function hasHandledOAuthCallback(): boolean {
  return getItem(STORAGE_KEYS.oauthHandled) === "1";
}

export function markOAuthCallbackHandled(): void {
  setItem(STORAGE_KEYS.oauthHandled, "1");
}

export function clearOAuthHandledFlag(): void {
  removeItem(STORAGE_KEYS.oauthHandled);
}

export function storeAuthRedirect(path: string): void {
  setItem(STORAGE_KEYS.authRedirect, path);
}

export function getAuthRedirect(): string | null {
  return getItem(STORAGE_KEYS.authRedirect);
}

export function consumeAuthRedirect(defaultPath = "/"): string {
  const redirect = getItem(STORAGE_KEYS.authRedirect) || defaultPath;
  removeItem(STORAGE_KEYS.authRedirect);
  return redirect;
}

export function clearAuthRedirect(): void {
  removeItem(STORAGE_KEYS.authRedirect);
}

export function clearSessionArtifacts(): void {
  clearTokenStorage();
  clearPendingOAuthState();
  clearOAuthHandledFlag();
  clearAuthRedirect();
}
