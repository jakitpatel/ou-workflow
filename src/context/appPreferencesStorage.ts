import type { NavigationMenuType, PaginationMode, StageLayout } from "@/types/application";

const SS_KEY = "app_preferences";

export type StoredAppPreferences = {
  apiBaseUrl: string | null;
  stageLayout: StageLayout;
  paginationMode: PaginationMode;
  navigationMenuType: NavigationMenuType;
};

export function getDefaultAppPreferences(): StoredAppPreferences {
  return {
    apiBaseUrl: null,
    stageLayout: "mixed",
    paginationMode: "infinite",
    navigationMenuType: "top",
  };
}

export function loadStoredAppPreferences(): StoredAppPreferences {
  const defaults = getDefaultAppPreferences();

  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<StoredAppPreferences>;

    return {
      apiBaseUrl: parsed.apiBaseUrl ?? defaults.apiBaseUrl,
      stageLayout: parsed.stageLayout ?? defaults.stageLayout,
      paginationMode: parsed.paginationMode ?? defaults.paginationMode,
      navigationMenuType: parsed.navigationMenuType ?? defaults.navigationMenuType,
    };
  } catch {
    return defaults;
  }
}

export function saveStoredAppPreferences(data: StoredAppPreferences): void {
  sessionStorage.setItem(SS_KEY, JSON.stringify(data));
}

export function clearStoredAppPreferences(): void {
  sessionStorage.removeItem(SS_KEY);
}
