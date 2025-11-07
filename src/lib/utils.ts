import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the appropriate API Base URL depending on build target.
 *
 * Controlled via `.env` values:
 *  - VITE_API_BUILD          → "client" | "local"
 *  - VITE_API_LOCAL_URL      → e.g., http://localhost:3000/api
 *  - VITE_API_CLIENT_URL     → e.g., https://api.example.com
 */
export function getApiBaseUrl(): string {
  const API_BUILD = import.meta.env.VITE_API_BUILD
  const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL
  const API_CLIENT_URL = import.meta.env.VITE_API_CLIENT_URL

  const baseUrlOld =
    API_BUILD === "client" ? API_CLIENT_URL : API_LOCAL_URL

  const baseUrl = (window as any).__APP_CONFIG__?.API_CLIENT_URL ?? '';
  if (!baseUrl) {
    console.warn(
      "[utils:getApiBaseUrl] No API base URL found. Check your .env configuration."
    )
  }

  return baseUrl ?? ""
}