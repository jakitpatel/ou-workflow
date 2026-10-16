import { useState } from 'react'

export function getRecommendedRfrUsername(globalData: unknown): string {
  try {
    const data: unknown = typeof globalData === 'string' ? JSON.parse(globalData) : globalData
    if (!data || typeof data !== 'object' || !('RFRRecommendation' in data)) return ''
    return typeof data.RFRRecommendation === 'string' ? data.RFRRecommendation.trim() : ''
  } catch {
    return ''
  }
}

type RfrOption = { lookupKey: string; id: string; userName: string; assigneeValue: string; isActive: boolean }

export function useInspectionRfrSelection<T extends RfrOption>(
  recommendation: string,
  rfrs: T[],
  allowDefault: boolean,
) {
  // undefined uses the recommendation; null explicitly opens the picker.
  const [choice, setSelectedRfrId] = useState<string | null | undefined>(undefined)
  const recommendedRfr = recommendation ? rfrs.find((rfr) =>
    rfr.isActive && [rfr.userName, rfr.assigneeValue, rfr.id].some(
      (value) => value.trim().toLowerCase() === recommendation.toLowerCase(),
    ),
  ) ?? null : null
  const selectedRfrId = choice === undefined
    ? (allowDefault ? recommendedRfr?.lookupKey ?? null : null)
    : choice
  return { recommendedRfr, selectedRfrId, setSelectedRfrId }
}
