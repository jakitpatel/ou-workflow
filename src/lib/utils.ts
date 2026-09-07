import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import buildInfo from "@/build-info.json";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns the API URL from the active Vite build mode. */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_CLIENT_URL?.trim() ?? ""
}

/**
 * Returns the current app build info (version & timestamp)
 * Auto-generated at build time by scripts/write-build-info.js
 */
export function getBuildInfo() {
  return {
    version: buildInfo.version,
    buildTime: new Date(buildInfo.buildTime).toLocaleString(),
  };
}
