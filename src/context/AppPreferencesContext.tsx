import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { registerUserContext, fetchProfileLayout } from "@/api";
import { useUser } from "@/context/UserContext";
import {
  clearStoredAppPreferences,
  getDefaultAppPreferences,
  loadStoredAppPreferences,
  saveStoredAppPreferences,
  type StoredAppPreferences,
} from "@/context/appPreferencesStorage";
import type { PaginationMode, StageLayout } from "@/types/application";

type AppPreferencesContextType = StoredAppPreferences & {
  setApiBaseUrl: (url: string | null) => void;
  setStageLayout: (layout: StageLayout) => void;
  setPaginationMode: (mode: PaginationMode) => void;
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

  useEffect(() => {
    saveStoredAppPreferences({
      apiBaseUrl,
      stageLayout,
      paginationMode,
    });
  }, [apiBaseUrl, stageLayout, paginationMode]);

  useEffect(() => {
    registerUserContext({ apiBaseUrl });
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!token || !username) {
      return;
    }

    let cancelled = false;

    async function loadProfilePreferences() {
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
    clearStoredAppPreferences();
  };

  const value = useMemo<AppPreferencesContextType>(
    () => ({
      apiBaseUrl,
      stageLayout,
      paginationMode,
      setApiBaseUrl,
      setStageLayout,
      setPaginationMode,
      resetAppPreferences,
    }),
    [apiBaseUrl, stageLayout, paginationMode],
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
