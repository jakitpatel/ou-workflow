import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns the API URL from the active Vite build mode. */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_CLIENT_URL?.trim() ?? ""
}

/**
 * Returns the app build info: version and commit (from git, the same in every environment built
 * from one commit), the build environment, and the build time. Injected at build time by
 * vite.config.ts (scripts/buildInfo.ts).
 */
export function getBuildInfo() {
  const info = typeof __BUILD_INFO__ === "undefined" ? undefined : __BUILD_INFO__;
  const builtAt = info?.buildTime ? new Date(info.buildTime) : null;
  return {
    version: info?.version ?? "",
    commit: info?.commit ?? "",
    env: info?.env ?? "",
    buildTime: builtAt && !Number.isNaN(builtAt.getTime()) ? builtAt.toLocaleString() : "",
  };
}
