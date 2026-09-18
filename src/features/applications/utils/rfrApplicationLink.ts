export function buildRfrApplicationUrl(applicationId: string, baseUrl = import.meta.env.BASE_URL || '/') {
  const basePath = baseUrl.replace(/\/+$/, '')
  const path = `${basePath}/ou-workflow/rfr-dashboard/${encodeURIComponent(applicationId)}`
  return typeof window === 'undefined' ? path : new URL(path, window.location.origin).toString()
}
