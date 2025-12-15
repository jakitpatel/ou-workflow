import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { registerUserContext } from "@/api";
import { cognitoLogout } from "@/auth/authService";
import type { UserRole } from "@/types/application";

/* ------------------------------------------------------------------
 * SessionStorage Helpers
 * ------------------------------------------------------------------ */
const SS_KEY = "user";

function loadStoredUser() {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(data: Record<string, any>) {
  sessionStorage.setItem(SS_KEY, JSON.stringify(data));
}

function clearStoredUser() {
  sessionStorage.removeItem(SS_KEY);
}

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

type StoredUser = {
  username: string | null;
  role: string | null;
  roles: UserRole[] | null;
  loginTime: number | null;
  apiBaseUrl: string | null;
};

type UserContextType = StoredUser & {
  token: string | null; // derived from sessionStorage (not persisted here)
  setApiBaseUrl: (url: string | null) => void;
  setRole: (role: string | null) => void;
  setRoles: (roles: UserRole[] | null) => void;
  login: (
    data: {
      username?: string | null;
      role?: string;
      roles?: UserRole[] | null;
    },
    onComplete?: () => void
  ) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

/* ------------------------------------------------------------------
 * Provider
 * ------------------------------------------------------------------ */
export function UserProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredUser();

  const [username, setUsername] = useState(stored?.username ?? null);
  const [role, setRole] = useState<string | null>(stored?.role ?? null);
  const [roles, setRoles] = useState<UserRole[] | null>(stored?.roles ?? null);
  const [loginTime, setLoginTime] = useState<number | null>(
    stored?.loginTime ?? null
  );
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(
    stored?.apiBaseUrl ?? null
  );

  // 🔐 Token is owned by auth layer (Cognito callback)
  const token = sessionStorage.getItem("access_token");

  /* ------------------------------------------------------------------
   * Persist user snapshot to sessionStorage
   * ------------------------------------------------------------------ */
  useEffect(() => {
    saveStoredUser({
      username,
      role,
      roles,
      loginTime,
      apiBaseUrl,
    });
  }, [username, role, roles, loginTime, apiBaseUrl]);
  /* ------------------------------------------------------------------
   * Register context with API base URL
   * ------------------------------------------------------------------ */
  useEffect(() => {
    registerUserContext({ apiBaseUrl });
  }, [apiBaseUrl]);

  /* ------------------------------------------------------------------
   * Login Handler
   * ------------------------------------------------------------------ */
  const login = (
    data: {
      username?: string | null;
      role?: string;
      roles?: UserRole[] | null;
    },
    onComplete?: () => void
  ) => {
    const now = Date.now();

    setUsername(data.username ?? null);
    setRole(data.role ?? null);
    setRoles(data.roles ?? null);
    setLoginTime(now);

    // allow state flush before redirect
    requestAnimationFrame(() => {
      onComplete?.();
    });
  };

  /* ------------------------------------------------------------------
   * Logout Handler
   * ------------------------------------------------------------------ */
  const logout = () => {
    setUsername(null);
    setRole(null);
    setRoles(null);
    setLoginTime(null);

    clearStoredUser();

    // Clear OAuth artifacts like (access_token, id_token, refresh_token,oauth_handled,cognito_callback_done)
    cognitoLogout();
  };

  /* ------------------------------------------------------------------
   * Memoized Context Value
   * ------------------------------------------------------------------ */
  const value = useMemo<UserContextType>(
    () => ({
      username,
      role,
      roles,
      loginTime,
      apiBaseUrl,
      token,
      setApiBaseUrl,
      setRole,
      setRoles,
      login,
      logout,
    }),
    [
      username,
      role,
      roles,
      loginTime,
      apiBaseUrl,
      token,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/* ------------------------------------------------------------------
 * Hook
 * ------------------------------------------------------------------ */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}