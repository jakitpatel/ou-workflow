/**
 * AWS Cognito Configuration for Your App
 *
 * Replace these values with your actual Cognito settings.
 */

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

// Modify this configuration according to your AWS account setup
export const cognitoConfig: CognitoConfig = {
  region: "us-east-1",
  userPoolId: "us-east-1_d38hiE2QM",
  userPoolWebClientId: "3iec660aiv2evjdtn062s0ap22",
  domain: "us-east-1d38hie2qm.auth.us-east-1.amazoncognito.com", // No https://

  oauth: {
    scope: ["openid", "email", "phone"],
    redirectSignIn: window.location.origin, // Use current app URL
    redirectSignOut: window.location.origin,
    responseType: "code", // Authorization code with PKCE
  },
};

// Helper function to validate configuration keys
export function validateConfig(): boolean {
  const missing: string[] = [];

  if (!cognitoConfig.userPoolId) missing.push("userPoolId");
  if (!cognitoConfig.userPoolWebClientId) missing.push("userPoolWebClientId");
  if (!cognitoConfig.domain) missing.push("domain");

  if (missing.length > 0) {
    console.error("Missing Cognito configuration keys:", missing.join(", "));
    console.error("Please update src/config/cognitoConfig.ts with your AWS Cognito settings.");
    return false;
  }

  return true;
}