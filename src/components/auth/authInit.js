/**
 * Authentication Initialization Script
 * Include this at the top of every protected page
 *
 * This script:
 * 1. Checks if user is authenticated
 * 2. Redirects to login if not authenticated
 * 3. Adds auth token to all API calls
 * 4. Adds logout button to the page
 */

// Check authentication on page load
(async function() {
  // Check if this is the login page (skip auth check)
  if (window.location.pathname.includes('login.html')) {
    return;
  }

  // Validate config
  if (!validateConfig()) {
    alert('Cognito configuration is incomplete. Please update auth/cognitoConfig.js');
    return;
  }

  // Check if this is an OAuth callback (has ?code= in URL)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code')) {
    // Handle OAuth callback first
    console.log('Handling OAuth callback...');
    try {
      await handleOAuthCallback();
      console.log('OAuth callback handled successfully');
      // Mark this as a fresh login to show token info
      sessionStorage.setItem('show_token_info', 'true');
      // After successful token exchange, redirect to clean URL
      const redirectUrl = sessionStorage.getItem('auth_redirect') || '/';
      sessionStorage.removeItem('auth_redirect');
      window.location.href = redirectUrl;
      return;
    } catch (error) {
      console.error('OAuth callback error:', error);
      alert('Authentication failed: ' + error.message);
      window.location.href = '/login.html';
      return;
    }
  }

  // Check if authenticated
  if (!requireAuth()) {
    // requireAuth will handle the redirect
    return;
  }

  // Get user info to display
  const userInfo = getUserInfo();

  // Check if this is a fresh login (show token info)
  const showTokenBanner = sessionStorage.getItem('show_token_info') === 'true';
  if (showTokenBanner) {
    sessionStorage.removeItem('show_token_info');
  }

  // Add logout button to header and show token info if fresh login
  document.addEventListener('DOMContentLoaded', function() {
    addLogoutButton(userInfo);
    if (showTokenBanner) {
      showTokenInfoBanner();
    }
  });
})();

// Add logout button to page header
function addLogoutButton(userInfo) {
  const header = document.querySelector('header');
  if (!header) return;

  // Create user info and logout container
  const authContainer = document.createElement('div');
  authContainer.className = 'auth-container';
  authContainer.style.cssText = 'display: flex; align-items: center; gap: 15px; margin-left: auto;';

  // Add user email
  if (userInfo && userInfo.email) {
    const userEmail = document.createElement('span');
    userEmail.className = 'user-email';
    userEmail.textContent = userInfo.email;
    userEmail.style.cssText = 'color: #666; font-size: 14px;';
    authContainer.appendChild(userEmail);
  }

  // Add logout button
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Logout';
  logoutBtn.className = 'view-btn logout-btn';
  logoutBtn.onclick = function() {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };
  authContainer.appendChild(logoutBtn);

  // Add to header (look for view-controls or add at end)
  const viewControls = header.querySelector('.view-controls');
  if (viewControls) {
    viewControls.appendChild(authContainer);
  } else {
    header.appendChild(authContainer);
  }
}

// Show JWT token information in a temporary banner
function showTokenInfoBanner() {
  try {
    // Get the ID token (contains user claims)
    const idToken = getIdToken();
    if (!idToken) {
      console.warn('No ID token found to display');
      return;
    }

    // Decode JWT (base64 decode the payload)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return;
    }

    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    // Log to console
    console.log('%c🔐 JWT Token Information', 'font-size: 16px; font-weight: bold; color: #667eea;');
    console.log('%cToken Header:', 'font-weight: bold; color: #764ba2;');
    console.table(header);
    console.log('%cToken Payload (Claims):', 'font-weight: bold; color: #764ba2;');
    console.table(payload);
    console.log('%cFormatted Claims:', 'font-weight: bold; color: #764ba2;');
    console.log({
      'Email': payload.email || 'N/A',
      'Username': payload['cognito:username'] || payload.username || 'N/A',
      'Name': payload.name || 'N/A',
      'User ID (sub)': payload.sub || 'N/A',
      'Issuer': payload.iss || 'N/A',
      'Client ID': payload.client_id || payload.aud || 'N/A',
      'Token Use': payload.token_use || 'N/A',
      'Auth Time': payload.auth_time ? new Date(payload.auth_time * 1000).toLocaleString() : 'N/A',
      'Issued At': payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'N/A',
      'Expires': payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A'
    });

    // Create banner container
    const banner = document.createElement('div');
    banner.id = 'jwt-info-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
      animation: slideDown 0.3s ease-out;
    `;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      color: white;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.8;
      transition: opacity 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
    closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';
    closeBtn.onclick = () => banner.remove();

    // Create content container
    const content = document.createElement('div');
    content.style.cssText = 'max-width: 1200px; margin: 0 auto;';

    // Add title
    const title = document.createElement('h3');
    title.textContent = '🔐 JWT Token Information';
    title.style.cssText = 'margin: 0 0 15px 0; font-size: 20px;';
    content.appendChild(title);

    // Create two-column layout
    const columns = document.createElement('div');
    columns.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 20px;';

    // Left column: Header
    const leftCol = document.createElement('div');
    const headerSection = document.createElement('div');
    headerSection.innerHTML = `
      <h4 style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.9;">Token Header:</h4>
      <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
        <div><strong>Algorithm:</strong> ${header.alg || 'N/A'}</div>
        <div><strong>Type:</strong> ${header.typ || 'N/A'}</div>
        ${header.kid ? `<div><strong>Key ID:</strong> ${header.kid}</div>` : ''}
      </div>
    `;
    leftCol.appendChild(headerSection);

    // Right column: Key Claims
    const rightCol = document.createElement('div');
    const claimsSection = document.createElement('div');

    // Format important claims
    const importantClaims = {
      'Email': payload.email || 'N/A',
      'Username': payload['cognito:username'] || payload.username || 'N/A',
      'Name': payload.name || 'N/A',
      'User ID (sub)': payload.sub || 'N/A',
      'Issuer': payload.iss ? payload.iss.split('/').pop() : 'N/A',
      'Client ID': payload.client_id || payload.aud || 'N/A',
      'Token Use': payload.token_use || 'N/A',
      'Auth Time': payload.auth_time ? new Date(payload.auth_time * 1000).toLocaleString() : 'N/A',
      'Issued At': payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'N/A',
      'Expires': payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A'
    };

    let claimsHtml = '<h4 style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.9;">Token Claims:</h4>';
    claimsHtml += '<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-size: 12px;">';

    for (const [key, value] of Object.entries(importantClaims)) {
      claimsHtml += `<div style="margin-bottom: 5px;"><strong>${key}:</strong> ${value}</div>`;
    }

    claimsHtml += '</div>';
    claimsSection.innerHTML = claimsHtml;
    rightCol.appendChild(claimsSection);

    // Add columns to layout
    columns.appendChild(leftCol);
    columns.appendChild(rightCol);
    content.appendChild(columns);

    // Add additional claims section (if any)
    const additionalClaims = Object.keys(payload).filter(key =>
      !['email', 'cognito:username', 'username', 'name', 'sub', 'iss', 'aud',
        'client_id', 'token_use', 'auth_time', 'iat', 'exp'].includes(key)
    );

    if (additionalClaims.length > 0) {
      const additionalSection = document.createElement('div');
      additionalSection.style.cssText = 'margin-top: 15px;';
      let additionalHtml = '<details style="cursor: pointer;"><summary style="font-size: 14px; opacity: 0.9;">Additional Claims (' + additionalClaims.length + ')</summary>';
      additionalHtml += '<div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; margin-top: 10px; font-family: monospace; font-size: 11px;">';

      for (const key of additionalClaims) {
        const value = typeof payload[key] === 'object' ? JSON.stringify(payload[key]) : payload[key];
        additionalHtml += `<div style="margin-bottom: 3px;"><strong>${key}:</strong> ${value}</div>`;
      }

      additionalHtml += '</div></details>';
      additionalSection.innerHTML = additionalHtml;
      content.appendChild(additionalSection);
    }

    // Add auto-dismiss message
    const dismissMsg = document.createElement('div');
    dismissMsg.style.cssText = 'margin-top: 15px; text-align: center; opacity: 0.8; font-size: 12px;';
    dismissMsg.textContent = 'This banner will auto-dismiss in 15 seconds or click × to close';
    content.appendChild(dismissMsg);

    // Assemble banner
    banner.appendChild(closeBtn);
    banner.appendChild(content);

    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Add banner to page
    document.body.insertBefore(banner, document.body.firstChild);

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
      }
    }, 15000);

  } catch (error) {
    console.error('Error displaying token info:', error);
  }
}

// Legacy support: updateBearerToken function for existing code
window.updateBearerToken = function(newToken) {
  console.warn('updateBearerToken is deprecated. Using Cognito authentication.');
  // This function is kept for backward compatibility but does nothing
  // The Cognito tokens are managed automatically
};

// Legacy support: Make sure existing code that checks localStorage for token still works
if (!localStorage.getItem('plant_app_bearer_token') && getAccessToken()) {
  // If there's a Cognito token but no legacy token, create a dummy one
  // so old code doesn't break
  localStorage.setItem('plant_app_bearer_token', 'using-cognito');
}

// Compatibility layer for dataService.js which expects window.authService
window.authService = {
  getToken: function() {
    const token = getAccessToken();
    return token ? `Bearer ${token}` : null;
  },
  setToken: function(newToken) {
    console.warn('authService.setToken is deprecated. Tokens are managed by Cognito.');
    // Tokens are managed automatically by Cognito, ignore this call
    return true;
  },
  isAuthError: function(status) {
    return status === 401 || status === 403;
  }
};
