export const getScheduleAEirUrl = (visitId?: string | number | null): string => {
  const normalizedVisitId = String(visitId ?? '').trim()
  if (!normalizedVisitId || normalizedVisitId.toUpperCase() === 'NULL') return ''

  const url = new URL('/oudirect/inspections/RfrVisitInspectionForm', import.meta.env.VITE_OUDIRECT_BASE_URL)
  url.search = new URLSearchParams({
    emailLink: 'YF',
    type: 'Inspection',
    category: 'Inspection',
    mode: 'view',
    visitID: normalizedVisitId,
  }).toString()
  return url.toString()
}
