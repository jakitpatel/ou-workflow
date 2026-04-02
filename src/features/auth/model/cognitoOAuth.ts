import { cognitoConfig } from "@/auth/cognitoConfig";

export type AuthorizationCodeTokenResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
};

export function getCognitoCallbackUrl(): string {
  const origin = cognitoConfig.oauth.redirectSignIn;
  const base = import.meta.env.BASE_URL || "/";
  return `${origin}${base.replace(/\/$/, "")}/cognito-directcallback`;
}

export function getCognitoLogoutUrl(): string {
  const origin = cognitoConfig.oauth.redirectSignOut;
  const base = import.meta.env.BASE_URL || "/";
  return `${origin}${base.replace(/\/$/, "")}/cognito-logout`;
}

export async function exchangeAuthorizationCodeForTokens({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}): Promise<AuthorizationCodeTokenResponse> {
  const tokenResponse = await fetch(`https://${cognitoConfig.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cognitoConfig.userPoolWebClientId,
      code,
      redirect_uri: getCognitoCallbackUrl(),
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    console.error("Token response error:", text);
    throw new Error(text);
  }

  return tokenResponse.json();
}
