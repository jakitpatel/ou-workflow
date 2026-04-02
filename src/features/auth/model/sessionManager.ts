import { cognitoConfig } from "@/auth/cognitoConfig";
import type { UserRole } from "@/types/application";
import { exchangeAuthorizationCodeForTokens } from "./cognitoOAuth";
import {
  clearPendingOAuthState,
  clearSessionArtifacts,
  consumeAuthRedirect,
  getAccessToken as getStoredAccessToken,
  getAuthRedirect,
  getCodeVerifier,
  getIdToken as getStoredIdToken,
  getOAuthState,
  getRefreshToken,
  hasHandledOAuthCallback,
  markOAuthCallbackHandled,
  storeAuthRedirect,
  storePendingOAuthState,
  storeTokens,
} from "./tokenStorage";

type JwtPayload = Record<string, unknown> & {
  exp?: number;
  email?: string;
  app_username?: string;
  roles?: string[];
  delegated?: string[];
};

export type AuthenticatedSessionUser = {
  username: string;
  roles: UserRole[] | null;
  delegated: UserRole[] | null;
  role: string;
  token: string;
};

export type SessionUserInfo = {
  email: string;
  username: string;
  roles: UserRole[] | null;
  delegated: UserRole[] | null;
  access_token: string;
  id_token: string;
};

function decodeJwtPayload(token: string): JwtPayload {
  return JSON.parse(atob(token.split(".")[1])) as JwtPayload;
}

function mapRoleNames(values: unknown): UserRole[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => ({ name: String(value) }));
}

export function getAccessToken(): string | null {
  return getStoredAccessToken();
}

export function getIdToken(): string | null {
  return getStoredIdToken();
}

export function isAuthenticated(): boolean {
  const accessToken = getStoredAccessToken();
  const idToken = getStoredIdToken();

  if (!accessToken || !idToken) {
    return false;
  }

  try {
    const payload = decodeJwtPayload(idToken);
    const exp = Number(payload.exp) * 1000;

    if (!exp || Date.now() >= exp) {
      clearSessionArtifacts();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error parsing token:", error);
    clearSessionArtifacts();
    return false;
  }
}

export function getUserInfo(): SessionUserInfo | null {
  try {
    const idToken = getStoredIdToken();
    const accessToken = getStoredAccessToken();

    if (!idToken || !accessToken) {
      return null;
    }

    const idPayload = decodeJwtPayload(idToken);
    const accessPayload = decodeJwtPayload(accessToken);

    return {
      email: String(idPayload.email ?? ""),
      username: String(accessPayload.app_username ?? ""),
      roles: mapRoleNames(accessPayload.roles),
      delegated: mapRoleNames(accessPayload.delegated),
      access_token: accessToken,
      id_token: idToken,
    };
  } catch (error) {
    console.error("Error parsing user info:", error);
    return null;
  }
}

export function clearTokens(): void {
  clearSessionArtifacts();
}

export function toAuthenticatedSessionUser(
  userInfo: SessionUserInfo,
): AuthenticatedSessionUser {
  return {
    username: userInfo.username,
    roles: userInfo.roles,
    delegated: userInfo.delegated,
    role: "ALL",
    token: userInfo.access_token,
  };
}

export function getAuthenticatedSessionUser(): AuthenticatedSessionUser | null {
  const userInfo = getUserInfo();
  if (!userInfo) {
    return null;
  }

  return toAuthenticatedSessionUser(userInfo);
}

export async function completeOAuthCallback({
  search = window.location.search,
  pathname = window.location.pathname,
  onClearUrl,
  exchangeCodeForTokens,
}: {
  search?: string;
  pathname?: string;
  onClearUrl?: (cleanPath: string) => void;
  exchangeCodeForTokens: (params: {
    code: string;
    codeVerifier: string;
  }) => Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
  }>;
}): Promise<SessionUserInfo | null> {
  if (hasHandledOAuthCallback()) {
    return getUserInfo();
  }

  const urlParams = new URLSearchParams(search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");
  const error = urlParams.get("error");

  if (error) {
    const errorDescription = urlParams.get("error_description") || error;
    throw new Error(errorDescription);
  }

  if (!code) {
    console.warn("No authorization code found in URL.");
    return null;
  }

  const savedState = getOAuthState();
  if (savedState && savedState !== state) {
    throw new Error("Invalid state parameter - possible CSRF attack");
  }

  const codeVerifier = getCodeVerifier();
  if (!codeVerifier) {
    throw new Error("No PKCE code_verifier found. Session issue.");
  }

  onClearUrl?.(pathname);

  const tokens = await exchangeCodeForTokens({
    code,
    codeVerifier,
  });

  storeTokens({
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    refreshToken: tokens.refresh_token,
  });
  clearPendingOAuthState();
  markOAuthCallbackHandled();

  return getUserInfo();
}

export async function loadAuthenticatedSessionUserFromCallback({
  search = window.location.search,
  pathname = window.location.pathname,
  onClearUrl,
  exchangeCodeForTokens,
}: {
  search?: string;
  pathname?: string;
  onClearUrl?: (cleanPath: string) => void;
  exchangeCodeForTokens: (params: {
    code: string;
    codeVerifier: string;
  }) => Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
  }>;
}): Promise<AuthenticatedSessionUser | null> {
  const userInfo = await completeOAuthCallback({
    search,
    pathname,
    onClearUrl,
    exchangeCodeForTokens,
  });

  if (!userInfo) {
    return null;
  }

  return toAuthenticatedSessionUser(userInfo);
}

export async function loadAuthenticatedSessionUserFromCognitoCallback({
  search = window.location.search,
  pathname = window.location.pathname,
  onClearUrl,
}: {
  search?: string;
  pathname?: string;
  onClearUrl?: (cleanPath: string) => void;
} = {}): Promise<AuthenticatedSessionUser | null> {
  return loadAuthenticatedSessionUserFromCallback({
    search,
    pathname,
    onClearUrl,
    exchangeCodeForTokens: exchangeAuthorizationCodeForTokens,
  });
}

export function setupLocalDevSession({
  accessToken,
  idToken,
  username,
  roles,
  delegated,
  role = "ALL",
}: {
  accessToken: string;
  idToken: string;
  username: string;
  roles: UserRole[] | null;
  delegated: UserRole[] | null;
  role?: string;
}): AuthenticatedSessionUser {
  storeTokens({
    accessToken,
    idToken,
  });

  return {
    username,
    roles,
    delegated,
    role,
    token: accessToken,
  };
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const tokenResponse = await fetch(`https://${cognitoConfig.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cognitoConfig.userPoolWebClientId,
      refresh_token: refreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token refresh failed: ${await tokenResponse.text()}`);
  }

  const tokens = await tokenResponse.json();

  storeTokens({
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    refreshToken,
  });

  return tokens.access_token;
}

export {
  clearPendingOAuthState,
  consumeAuthRedirect,
  getAuthRedirect,
  getCodeVerifier,
  getOAuthState,
  hasHandledOAuthCallback,
  markOAuthCallbackHandled,
  storeAuthRedirect,
  storePendingOAuthState,
  storeTokens,
};
