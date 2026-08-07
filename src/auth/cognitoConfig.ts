/** AWS Cognito configuration loaded from the active Vite environment. */

export interface CognitoOAuthConfig {
  scope: string[];
  redirectSignIn: string;
  redirectSignOut: string;
  responseType: string;
}

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  userPoolWebClientId: string;
  domain: string; // Without https://
  oauth: CognitoOAuthConfig;
}

export const cognitoConfig: CognitoConfig = {
  region: import.meta.env.VITE_COGNITO_REGION,
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  userPoolWebClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  domain: import.meta.env.VITE_COGNITO_DOMAIN,

  oauth: {
    scope: ["openid", "email", "phone"],
    redirectSignIn: window.location.origin, // Use current app URL
    redirectSignOut: window.location.origin,
    responseType: "code", // Authorization code with PKCE
  },
};

// Helper function to validate configuration keys
export function validateConfig(): boolean {
  const requiredConfig = {
    VITE_COGNITO_REGION: cognitoConfig.region,
    VITE_COGNITO_USER_POOL_ID: cognitoConfig.userPoolId,
    VITE_COGNITO_CLIENT_ID: cognitoConfig.userPoolWebClientId,
    VITE_COGNITO_DOMAIN: cognitoConfig.domain,
  };

  const missing = Object.entries(requiredConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error("Missing Cognito environment variables:", missing.join(", "));
    return false;
  }

  return true;
}
