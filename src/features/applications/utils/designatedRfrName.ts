import type { ApplicationDetail } from '@/types/application'

export function getDesignatedRfrName(value: ApplicationDetail['DesignatedRFR']): string {
  if (typeof value === 'string') return value.trim()
  if (!value) return ''
  return [value.FIRST, value.LAST]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
}
