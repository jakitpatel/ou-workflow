/**
 * Authentication Service for PKCE-based AWS Cognito OAuth
 */

import { cognitoConfig } from "@/auth/cognitoConfig";
import { getCognitoCallbackUrl, getCognitoLogoutUrl } from "@/features/auth/model/cognitoOAuth";
import {
  clearTokens,
  getAccessToken,
  getIdToken,
  getUserInfo,
  isAuthenticated,
  refreshAccessToken,
  storeAuthRedirect,
  storePendingOAuthState,
} from "@/features/auth/model/sessionManager";
import jsSHA from "jssha";

export type { AuthenticatedSessionUser } from "@/features/auth/model/sessionManager";

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  if (crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest("SHA-256", data);
  }

  const shaObj = new jsSHA("SHA-256", "TEXT");
  shaObj.update(plain);
  return shaObj.getHash("ARRAYBUFFER") as ArrayBuffer;
}

function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}

async function authlogin(): Promise<void> {
  if (!cognitoConfig) {
    alert("Cognito config is not found. Check config file.");
    return;
  }

  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  storePendingOAuthState({ codeVerifier, state });

  const callbackUrl = getCognitoCallbackUrl();
  const params = new URLSearchParams({
    response_type: cognitoConfig.oauth.responseType,
    client_id: cognitoConfig.userPoolWebClientId,
    redirect_uri: callbackUrl,
    state,
    scope: cognitoConfig.oauth.scope.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://${cognitoConfig.domain}/oauth2/authorize?${params.toString()}`;
  window.location.href = authUrl;
}

function cognitoLogout() {
  clearTokens();

  const logoutUri = getCognitoLogoutUrl();
  const logoutUrl = `https://${cognitoConfig.domain}/logout?client_id=${cognitoConfig.userPoolWebClientId}&logout_uri=${encodeURIComponent(
    logoutUri,
  )}`;

  window.location.href = logoutUrl;
}

function requireAuth(): boolean {
  if (!isAuthenticated()) {
    storeAuthRedirect(window.location.pathname + window.location.search);
    window.location.href = "/login";
    return false;
  }

  return true;
}

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  let headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    try {
      token = await refreshAccessToken();
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
      response = await fetch(url, { ...options, headers });
    } catch {
      requireAuth();
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
}

export {
  authlogin,
  authenticatedFetch,
  clearTokens,
  cognitoLogout,
  getAccessToken,
  getIdToken,
  getUserInfo,
  isAuthenticated,
  refreshAccessToken,
  requireAuth,
};
