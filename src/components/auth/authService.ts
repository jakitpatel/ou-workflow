/**
 * Authentication Service for PKCE-based AWS Cognito OAuth
 */

import { cognitoConfig } from "@/components/auth/cognitoConfig";
import jsSHA from "jssha";

// Generate random string for PKCE
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

// Generate SHA-256 hash
/*
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}
*/

async function sha256(plain: string): Promise<ArrayBuffer> {
  if (crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest("SHA-256", data);
  } else {
    // Fallback for insecure environments (NOT RECOMMENDED for production)
    const shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.update(plain);
    return shaObj.getHash("ARRAYBUFFER") as ArrayBuffer;
  }
}

// Base64 URL encode
function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Generate PKCE challenge from verifier
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}

function isAuthenticated(): boolean {
  const accessToken = sessionStorage.getItem("access_token");
  const idToken = sessionStorage.getItem("id_token");

  if (!accessToken || !idToken) {
    return false;
  }

  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    const exp = payload.exp * 1000;
    if (Date.now() >= exp) {
      clearTokens();
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error parsing token:", e);
    return false;
  }
}

function getAccessToken(): string | null {
  return sessionStorage.getItem("access_token");
}

function getIdToken(): string | null {
  return sessionStorage.getItem("id_token");
}

function getUserInfo():
  | { email: string; username: string; name: string; sub: string }
  | null {
  try {
    const idToken = getIdToken();
    if (!idToken) return null;

    const payload = JSON.parse(atob(idToken.split(".")[1]));
    return {
      email: payload.email,
      username: payload["cognito:username"] || payload.username,
      name: payload.name,
      sub: payload.sub,
    };
  } catch (e) {
    console.error("Error parsing user info:", e);
    return null;
  }
}

function clearTokens() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("id_token");
  sessionStorage.removeItem("refresh_token");
  sessionStorage.removeItem("oauth_handled");
}

function getReturnUrl(): string {
  const origin = cognitoConfig.oauth.redirectSignIn;
  const base = import.meta.env.BASE_URL || "/";
  return `${origin}${base.replace(/\/$/, "")}/cognito-directcallback`;
}

function getLogoutUrl(): string {
  const origin = cognitoConfig.oauth.redirectSignOut;
  const base = import.meta.env.BASE_URL || "/";
  return `${origin}${base.replace(/\/$/, "")}/cognito-logout`;
}

async function authlogin(): Promise<void> {
  if (!cognitoConfig) {
    alert("Cognito config is not found. Check config file.");
    return;
  }

  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);

  sessionStorage.setItem("pkce_code_verifier", codeVerifier);
  sessionStorage.setItem("oauth_state", state);

  console.log("Cognito redirect:", cognitoConfig.oauth.redirectSignIn);

  const callBackUrl = getReturnUrl();
  //const returnUrl = encodeURIComponent(callBackUrl);

  const params = new URLSearchParams({
    response_type: cognitoConfig.oauth.responseType,
    client_id: cognitoConfig.userPoolWebClientId,
    redirect_uri: callBackUrl,
    state,
    scope: cognitoConfig.oauth.scope.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://${cognitoConfig.domain}/oauth2/authorize?${params.toString()}`;
  window.location.href = authUrl;
}

async function handleOAuthCallback(): Promise<boolean> {
  console.log("Callback URL:", window.location.href);

  // Prevent double-processing of callback
  if (sessionStorage.getItem("oauth_handled")) {
    console.log("OAuth callback already processed. Skipping.");
    return true;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");
  const error = urlParams.get("error");

  // Handle Cognito error
  if (error) {
    const errorDescription = urlParams.get("error_description") || error;
    throw new Error(errorDescription);
  }

  // If no code present → callback not valid yet
  if (!code) {
    console.warn("No authorization code found in URL.");
    return false;
  }

  // Verify state
  const savedState = sessionStorage.getItem("oauth_state");
  if (savedState && savedState !== state) {
    throw new Error("Invalid state parameter - possible CSRF attack");
  }

  // Verify PKCE
  const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
  if (!codeVerifier) {
    throw new Error("No PKCE code_verifier found. Session issue.");
  }

  // 🔥 IMPORTANT: Strip query params ONLY after reading them
  window.history.replaceState({}, document.title, window.location.pathname);

  try {
    // Exchange the authorization code for tokens
    const tokenResponse = await fetch(`https://${cognitoConfig.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: cognitoConfig.userPoolWebClientId,
        code,
        redirect_uri: getReturnUrl(),
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const txt = await tokenResponse.text();
      console.error("Token response error:", txt);
      throw new Error(txt);
    }

    const tokens = await tokenResponse.json();

    // Store tokens
    sessionStorage.setItem("access_token", tokens.access_token);
    sessionStorage.setItem("id_token", tokens.id_token);
    if (tokens.refresh_token) {
      sessionStorage.setItem("refresh_token", tokens.refresh_token);
    }

    // Cleanup temporary OAuth data
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("pkce_code_verifier");

    // Mark callback as processed
    sessionStorage.setItem("oauth_handled", "1");

    return true;
  } catch (error) {
    console.error("Token exchange error:", error);
    throw error;
  }
}
/*
async function handleOAuthCallback(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const state = urlParams.get("state");
  const error = urlParams.get("error");

  if (error) {
    const errorDescription = urlParams.get("error_description") || error;
    throw new Error(errorDescription);
  }

  if (!code) {
    return false;
  }

  const savedState = sessionStorage.getItem("oauth_state");

  if (savedState && savedState !== state) {
    throw new Error("Invalid state parameter - possible CSRF attack");
  }

  const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
  if (!codeVerifier) {
    throw new Error("No code verifier found. Check session issues.");
  }

  try {
    const tokenResponse = await fetch(`https://${cognitoConfig.domain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: cognitoConfig.userPoolWebClientId,
        code,
        redirect_uri: getReturnUrl(),//cognitoConfig.oauth.redirectSignIn,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(await tokenResponse.text());
    }

    const tokens = await tokenResponse.json();
    sessionStorage.setItem("access_token", tokens.access_token);
    sessionStorage.setItem("id_token", tokens.id_token);
    if (tokens.refresh_token) {
      sessionStorage.setItem("refresh_token", tokens.refresh_token);
    }

    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("pkce_code_verifier");
    window.history.replaceState({}, document.title, window.location.pathname);

    return true;
  } catch (error) {
    console.error("Token exchange error:", error);
    throw error;
  }
}
*/

async function refreshAccessToken(): Promise<string> {
  const refreshToken = sessionStorage.getItem("refresh_token");
  if (!refreshToken) throw new Error("No refresh token available");

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
  sessionStorage.setItem("access_token", tokens.access_token);
  sessionStorage.setItem("id_token", tokens.id_token);

  return tokens.access_token;
}

function cognitoLogout() {
  clearTokens();
  const logout_uri = getLogoutUrl();
  const logoutUrl = `https://${cognitoConfig.domain}/logout?client_id=${cognitoConfig.userPoolWebClientId}&logout_uri=${encodeURIComponent(
    logout_uri,
  )}`;
  window.location.href = logoutUrl;
}

async function initAuth(): Promise<boolean> {
  try {
    const isCallback = await handleOAuthCallback();
    if (isCallback) {
      window.location.href = "/";
      return true;
    }
    return isAuthenticated();
  } catch (error: any) {
    console.error("Auth init error:", error);
    alert(`Auth error: ${error.message}`);
    return false;
  }
}

function requireAuth(): boolean {
  if (!isAuthenticated()) {
    sessionStorage.setItem("auth_redirect", window.location.pathname + window.location.search);
    window.location.href = "/login";
    return false;
  }
  return true;
}

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

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
    } catch (error) {
      requireAuth();
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
}

export {
  authlogin,
  handleOAuthCallback,
  refreshAccessToken,
  isAuthenticated,
  getAccessToken,
  getIdToken,
  getUserInfo,
  cognitoLogout,
  initAuth,
  requireAuth,
  authenticatedFetch,
  clearTokens,
};
