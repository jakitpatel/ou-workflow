import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { registerUserContext, fetchProfileLayout } from "@/api";
import { cognitoLogout } from "@/auth/authService";
import type { UserRole, PaginationMode, StageLayout } from "@/types/application";

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
  delegated: UserRole[] | null;
  loginTime: number | null;
  apiBaseUrl: string | null;
  stageLayout?: StageLayout;
  paginationMode?: PaginationMode;
};

type UserContextType = StoredUser & {
  token: string | null; // derived from sessionStorage (not persisted here)
  setApiBaseUrl: (url: string | null) => void;
  setRole: (role: string | null) => void;
  setRoles: (roles: UserRole[] | null) => void;
  setStageLayout: (layout: StageLayout) => void;
  setPaginationMode: (mode: PaginationMode) => void;
  login: (
    data: {
      username?: string | null;
      role?: string;
      roles?: UserRole[] | null;
      delegated?: UserRole[] | null;
      stageLayout?: StageLayout;
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
  const [delegated, setDelegated] = useState<UserRole[] | null>(stored?.delegated ?? null);
  const [loginTime, setLoginTime] = useState<number | null>(
    stored?.loginTime ?? null
  );
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(
    stored?.apiBaseUrl ?? null
  );

  const [stageLayout, setStageLayout] = useState<StageLayout>(
    stored?.stageLayout ?? 'mixed'
  );

  const [paginationMode, setPaginationMode] = useState<PaginationMode>(
    stored?.paginationMode ?? 'infinite'
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
      delegated,
      loginTime,
      apiBaseUrl,
      stageLayout,
      paginationMode,
    });
  }, [username, role, roles, delegated, loginTime, apiBaseUrl, paginationMode, stageLayout]);
  /* ------------------------------------------------------------------
   * Register context with API base URL
   * ------------------------------------------------------------------ */
  useEffect(() => {
    registerUserContext({ apiBaseUrl });
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!token || !username) return;

    let cancelled = false;

    async function loadProfileLayout() {
      try {
        const records = await fetchProfileLayout({
          token,
          username,
        });

        if (!records || records.length === 0) return;

        // Pick latest record
        const latest = records.at(-1);
        const profileStr = latest?.attributes?.Profile;

        if (!profileStr) return;

        const parsed = JSON.parse(profileStr);

        if (cancelled) return;

        if (parsed.stageLayout) {
          setStageLayout(parsed.stageLayout);
        }
        if (parsed.paginationMode) {
          setPaginationMode(parsed.paginationMode);
        }
      } catch (err) {
        console.warn("⚠️ Failed to hydrate profile layout:", err);
      }
    }

    loadProfileLayout();

    return () => {
      cancelled = true;
    };
  }, [token, username]);

  /* ------------------------------------------------------------------
   * Login Handler
   * ------------------------------------------------------------------ */
  const login = (
    data: {
      username?: string | null;
      role?: string;
      roles?: UserRole[] | null;
      delegated?: UserRole[] | null;
      stageLayout?: StageLayout;
      paginationMode?: PaginationMode;
    },
    onComplete?: () => void
  ) => {
    const now = Date.now();

    setUsername(data.username ?? null);
    setRole(data.role ?? null);
    setRoles(data.roles ?? null);
    setDelegated(data.delegated ?? null);
    setStageLayout(data.stageLayout ?? 'mixed');
    setPaginationMode(data.paginationMode ?? 'infinite');
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
    setDelegated(null);
    setLoginTime(null);
    setStageLayout("mixed");
    setPaginationMode("infinite");

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
      delegated,
      loginTime,
      apiBaseUrl,
      token,
      setApiBaseUrl,
      setRole,
      setRoles,
      setDelegated,
      login,
      logout,
      stageLayout,
      setStageLayout,
      paginationMode,
      setPaginationMode,
    }),
    [
      username,
      role,
      roles,
      delegated,
      loginTime,
      apiBaseUrl,
      token,
      stageLayout,
      paginationMode
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