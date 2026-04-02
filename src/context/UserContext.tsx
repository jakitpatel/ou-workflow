import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cognitoLogout } from "@/auth/authService";
import { clearStoredAppPreferences } from "@/context/appPreferencesStorage";
import type { UserRole } from "@/types/application";

const SS_KEY = "user";

function loadStoredUser() {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(data: Record<string, unknown>) {
  sessionStorage.setItem(SS_KEY, JSON.stringify(data));
}

function clearStoredUser() {
  sessionStorage.removeItem(SS_KEY);
}

type StoredUser = {
  username: string | null;
  role: string | null;
  roles: UserRole[] | null;
  delegated: UserRole[] | null;
  loginTime: number | null;
};

type UserContextType = StoredUser & {
  token: string | null;
  setRole: (role: string | null) => void;
  setRoles: (roles: UserRole[] | null) => void;
  setDelegated: (roles: UserRole[] | null) => void;
  login: (
    data: {
      username?: string | null;
      role?: string;
      roles?: UserRole[] | null;
      delegated?: UserRole[] | null;
    },
    onComplete?: () => void,
  ) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredUser();

  const [username, setUsername] = useState(stored?.username ?? null);
  const [role, setRole] = useState<string | null>(stored?.role ?? null);
  const [roles, setRoles] = useState<UserRole[] | null>(stored?.roles ?? null);
  const [delegated, setDelegated] = useState<UserRole[] | null>(
    stored?.delegated ?? null,
  );
  const [loginTime, setLoginTime] = useState<number | null>(stored?.loginTime ?? null);

  const token = sessionStorage.getItem("access_token");

  useEffect(() => {
    saveStoredUser({
      username,
      role,
      roles,
      delegated,
      loginTime,
    });
  }, [username, role, roles, delegated, loginTime]);

  const login = (
    data: {
      username?: string | null;
      role?: string;
      roles?: UserRole[] | null;
      delegated?: UserRole[] | null;
    },
    onComplete?: () => void,
  ) => {
    setUsername(data.username ?? null);
    setRole(data.role ?? null);
    setRoles(data.roles ?? null);
    setDelegated(data.delegated ?? null);
    setLoginTime(Date.now());

    requestAnimationFrame(() => {
      onComplete?.();
    });
  };

  const logout = () => {
    setUsername(null);
    setRole(null);
    setRoles(null);
    setDelegated(null);
    setLoginTime(null);

    clearStoredUser();
    clearStoredAppPreferences();
    cognitoLogout();
  };

  const value = useMemo<UserContextType>(
    () => ({
      username,
      role,
      roles,
      delegated,
      loginTime,
      token,
      setRole,
      setRoles,
      setDelegated,
      login,
      logout,
    }),
    [username, role, roles, delegated, loginTime, token],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
