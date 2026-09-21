/**
 * Centralized Admin Authentication & Token Management Utility
 * Ensures consistent admin session persistence across localStorage & sessionStorage
 */

export const ADMIN_TOKEN_KEY = 'feat_admin_token';
export const ADMIN_SESSION_KEY = 'feather_admin_session';

export interface AdminSessionData {
  token: string;
  user: {
    email: string;
    role?: string;
    displayName?: string;
    uid?: string;
    lastLogin?: string;
  };
}

/**
 * Retrieves the currently active admin authentication token
 */
export const getAdminToken = (): string => {
  try {
    const localToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (localToken && localToken.trim()) return localToken.trim();

    const sessionToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (sessionToken && sessionToken.trim()) return sessionToken.trim();

    // Fallback: check serialized session objects
    const sessionStr = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && typeof parsed === 'object' && parsed.token) {
        // Self-heal the direct token key
        localStorage.setItem(ADMIN_TOKEN_KEY, parsed.token);
        sessionStorage.setItem(ADMIN_TOKEN_KEY, parsed.token);
        return parsed.token;
      }
    }
  } catch (err) {
    console.warn('[AdminAuth] Error retrieving token:', err);
  }
  return '';
};

/**
 * Retrieves the stored admin user profile
 */
export const getStoredAdminUser = (): AdminSessionData['user'] | null => {
  try {
    const sessionStr = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && (parsed.user || parsed.email)) {
        return parsed.user || parsed;
      }
    }
  } catch (err) {
    console.warn('[AdminAuth] Error retrieving user profile:', err);
  }
  return null;
};

/**
 * Persists admin session securely into both localStorage and sessionStorage
 */
export const saveAdminSession = (token: string, user: AdminSessionData['user']): void => {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
    const sessionPayload: AdminSessionData = { token, user };
    const serialized = JSON.stringify(sessionPayload);
    localStorage.setItem(ADMIN_SESSION_KEY, serialized);
    sessionStorage.setItem(ADMIN_SESSION_KEY, serialized);
  } catch (err) {
    console.warn('[AdminAuth] Error saving session:', err);
  }
};

/**
 * Completely clears all admin sessions from storage
 */
export const removeAdminSession = (): void => {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (err) {
    console.warn('[AdminAuth] Error removing session:', err);
  }
};

/**
 * Standard HTTP headers for admin requests
 */
export const getAdminAuthHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = getAdminToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['x-admin-token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};
