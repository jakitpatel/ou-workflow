import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@/context/UserContext";
import {
  clearStoredAppPreferences,
  getDefaultAppPreferences,
  loadStoredAppPreferences,
  saveStoredAppPreferences,
  type StoredAppPreferences,
} from "@/context/appPreferencesStorage";
import { fetchProfileLayout, fetchUserPerson, type UserPerson } from "@/features/profile/api";
import { registerUserContext } from "@/shared/api/httpClient";
import type { NavigationMenuType, PaginationMode, StageLayout } from "@/types/application";

type AppPreferencesContextType = StoredAppPreferences & {
  userPerson: UserPerson | null;
  setApiBaseUrl: (url: string | null) => void;
  setStageLayout: (layout: StageLayout) => void;
  setPaginationMode: (mode: PaginationMode) => void;
  setNavigationMenuType: (type: NavigationMenuType) => void;
  resetAppPreferences: () => void;
};

const AppPreferencesContext = createContext<AppPreferencesContextType | undefined>(
  undefined,
);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const stored = loadStoredAppPreferences();
  const defaults = getDefaultAppPreferences();
  const { token, username } = useUser();

  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(stored.apiBaseUrl);
  const [stageLayout, setStageLayout] = useState<StageLayout>(stored.stageLayout);
  const [paginationMode, setPaginationMode] = useState<PaginationMode>(
    stored.paginationMode,
  );
  const [navigationMenuType, setNavigationMenuType] = useState<NavigationMenuType>(
    stored.navigationMenuType,
  );
  const [userPerson, setUserPerson] = useState<UserPerson | null>(null);

  useEffect(() => {
    saveStoredAppPreferences({
      apiBaseUrl,
      stageLayout,
      paginationMode,
      navigationMenuType,
    });
  }, [apiBaseUrl, stageLayout, paginationMode, navigationMenuType]);

  useEffect(() => {
    registerUserContext({ apiBaseUrl });
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!token || !username) {
      setUserPerson(null);
      return;
    }

    let cancelled = false;

    async function loadProfilePreferences() {
      try {
        const person = await fetchUserPerson({
          token,
          username: username ?? undefined,
        });

        if (!cancelled) {
          setUserPerson(person);
        }
      } catch (error) {
        console.warn("Failed to hydrate user person:", error);
      }

      try {
        const records = await fetchProfileLayout({
          token,
          username: username ?? undefined,
        });

        if (!records || records.length === 0) {
          return;
        }

        const latest = records.at(-1);
        const profileStr = latest?.attributes?.Profile;

        if (!profileStr || cancelled) {
          return;
        }

        const parsed = JSON.parse(profileStr) as Partial<StoredAppPreferences>;

        if (parsed.stageLayout) {
          setStageLayout(parsed.stageLayout);
        }

        if (parsed.paginationMode) {
          setPaginationMode(parsed.paginationMode);
        }

        if (parsed.navigationMenuType) {
          setNavigationMenuType(parsed.navigationMenuType);
        }
      } catch (error) {
        console.warn("Failed to hydrate profile layout:", error);
      }
    }

    loadProfilePreferences();

    return () => {
      cancelled = true;
    };
  }, [token, username]);

  const resetAppPreferences = () => {
    setApiBaseUrl(defaults.apiBaseUrl);
    setStageLayout(defaults.stageLayout);
    setPaginationMode(defaults.paginationMode);
    setNavigationMenuType(defaults.navigationMenuType);
    clearStoredAppPreferences();
  };

  const value = useMemo<AppPreferencesContextType>(
    () => ({
      apiBaseUrl,
      stageLayout,
      paginationMode,
      navigationMenuType,
      userPerson,
      setApiBaseUrl,
      setStageLayout,
      setPaginationMode,
      setNavigationMenuType,
      resetAppPreferences,
    }),
    [apiBaseUrl, stageLayout, paginationMode, navigationMenuType, userPerson],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error("useAppPreferences must be used within an AppPreferencesProvider");
  }
  return ctx;
}
