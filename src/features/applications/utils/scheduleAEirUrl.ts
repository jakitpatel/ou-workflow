import { getOuDirectLoginUrl } from './inspectionNotification'

export const getScheduleAEirUrl = (
  visitId?: string | number | null,
  mode = import.meta.env.MODE,
): string => {
  const normalizedVisitId = String(visitId ?? '').trim()
  if (!normalizedVisitId || normalizedVisitId.toUpperCase() === 'NULL') return ''

  const url = new URL('/oudirect/inspections/RfrVisitInspectionForm', getOuDirectLoginUrl(mode))
  url.search = new URLSearchParams({
    type: 'Historical',
    mode: 'view',
    subtype: 'short',
    visitID: normalizedVisitId,
    menu: 'VisitsAsRfr',
  }).toString()
  return url.toString()
}
