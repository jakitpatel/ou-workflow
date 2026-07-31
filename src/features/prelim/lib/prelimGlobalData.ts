import type { ApplicationGlobalData } from '@/types/application'

export function parsePrelimGlobalData(value: unknown): ApplicationGlobalData | undefined {
  if (value && typeof value === 'object') return value as ApplicationGlobalData

  const text = String(value ?? '').trim()
  if (!text) return undefined

  try {
    return JSON.parse(text) as ApplicationGlobalData
  } catch {
    return undefined
  }
}

export function getOwnsResolutionMarker(
  globalData: ApplicationGlobalData | undefined,
  plantId: string | number | null | undefined,
): 'C' | 'M' | null {
  const normalizedPlantId = String(plantId ?? '').trim()
  if (!normalizedPlantId) return null

  const plant = globalData?.plants?.find(
    (candidate) => String(candidate.plant_id ?? '').trim() === normalizedPlantId,
  )

  if (!plant) return null
  return plant.is_new_owns === true ? 'C' : 'M'
}
