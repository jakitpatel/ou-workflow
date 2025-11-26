import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRoles, registerUserContext } from "@/api";
import { cognitoLogout } from "@/components/auth/authService";
import type { LoginStrategy } from "@/types/auth";
import type { UserRole } from "@/types/application";

/* ------------------------------------------------------------------
 * LocalStorage Helpers (Clean & Reusable)
 * ------------------------------------------------------------------ */
const LS_KEY = "user";

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(data: Record<string, any>) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function clearStoredUser() {
  localStorage.removeItem(LS_KEY);
}

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */
type ActiveScreen = "ncrc-dashboard" | "tasks-dashboard" | null;

type StoredUser = {
  username: string | null;
  role: string | null;
  roles: UserRole[] | null;
  token: string | null;
  strategy: LoginStrategy | null;
  loginTime: number | null;
  apiBaseUrl: string | null;
};

type UserContextType = StoredUser & {
  activeScreen: ActiveScreen;
  setActiveScreen: (s: ActiveScreen) => void;
  setApiBaseUrl: (url: string | null) => void;
  setRole: (role: string | null) => void;
  setRoles: (roles: UserRole[] | null) => void;
  rolesLoaded: boolean;              // 👈 ADD THIS
  setRolesLoaded: (v: boolean) => void; // 👈 AND THIS
  login: (data: {
    username: string;
    role?: string;
    token?: string;
    strategy: LoginStrategy;
  }) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

/* ------------------------------------------------------------------
 * Provider
 * ------------------------------------------------------------------ */
export function UserProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredUser();

  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [username, setUsername] = useState(stored?.username ?? null);
  const [role, setRole] = useState<string | null>(stored?.role ?? null);
  const [roles, setRoles] = useState<UserRole[] | null>(stored?.roles ?? null);
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [strategy, setStrategy] = useState<LoginStrategy | null>(
    stored?.strategy ?? null
  );
  const [loginTime, setLoginTime] = useState<number | null>(
    stored?.loginTime ?? null
  );
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(
    "ncrc-dashboard"
  );
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(
    stored?.apiBaseUrl ?? null
  );

  /* ------------------------------------------------------------------
   * Persist changes cleanly (ONLY when relevant fields change)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    saveStoredUser({
      username,
      role,
      roles,
      token,
      strategy,
      loginTime,
      apiBaseUrl,
    });
  }, [username, role, roles, token, strategy, loginTime, apiBaseUrl]);

  /* ------------------------------------------------------------------
   * Register context with API base URL on change
   * ------------------------------------------------------------------ */
  useEffect(() => {
    registerUserContext({ apiBaseUrl });
  }, [apiBaseUrl]);

  /* ------------------------------------------------------------------
   * Role loading (React Query)
   * ------------------------------------------------------------------ */
  const { refetch : fetchUserRoles } = useQuery({
    queryKey: ['roles', username, token],
    queryFn: () =>
      fetchRoles({
        username: username ?? '',
        token: token ?? undefined,
        strategy: strategy ?? undefined,
      }),
    enabled: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status && [400, 401, 403, 404, 422].includes(error.status)) return false
      console.log("Retry attempt:", failureCount, "Error:", error);
      return false; //return failureCount < 2
    },
  })

  /* ------------------------------------------------------------------
   * Load roles when token available & apiBaseUrl loaded
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (!token || !apiBaseUrl) return;
    //console.log("Fetching user roles : Token or API Base URL changed:", { token, apiBaseUrl });
    fetchUserRoles().then((res) => {
    const data = res.data as any;
    if (!data || !data.user_info) return;

    const formatted = (data.user_info?.roles || []).map((r: any) => ({
        name: r.role_name,
        value: r.role_name,
        created: null,
    }));

    setRoles(formatted);
    setRole((prev) => prev || "ALL");
    setRolesLoaded(true);
    //console.log("User roles fetched and set:", formatted);
    if (data.access_token) setToken(data.access_token);
    });
  }, [token, apiBaseUrl, fetchUserRoles]);

  /* ------------------------------------------------------------------
   * Login Handler
   * ------------------------------------------------------------------ */
  const login = (data: {
    username: string;
    role?: string;
    token?: string;
    strategy: LoginStrategy;
  }) => {
    const now = Date.now();

    setUsername(data.username);
    setRole(data.role ?? null);
    setRoles(null);
    setToken(data.token ?? null);
    setStrategy(data.strategy);
    setLoginTime(now);
  };

  /* ------------------------------------------------------------------
   * Logout Handler
   * ------------------------------------------------------------------ */
  const logout = () => {
    setUsername(null);
    setRole(null);
    setRoles(null);
    setToken(null);
    setStrategy(null);
    setLoginTime(null);
    setRolesLoaded(false);

    clearStoredUser();
    cognitoLogout();
  };

  /* ------------------------------------------------------------------
   * Memoized value
   * ------------------------------------------------------------------ */
  const value = useMemo<UserContextType>(
    () => ({
      username,
      role,
      roles,
      token,
      strategy,
      loginTime,
      apiBaseUrl,
      activeScreen,
      setActiveScreen,
      setApiBaseUrl,
      setRole,
      setRoles,
      login,
      logout,
      rolesLoaded,
      setRolesLoaded,
    }),
    [
      username,
      role,
      roles,
      token,
      strategy,
      loginTime,
      apiBaseUrl,
      activeScreen,
      rolesLoaded,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/* ------------------------------------------------------------------
 * Hook
 * ------------------------------------------------------------------ */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
