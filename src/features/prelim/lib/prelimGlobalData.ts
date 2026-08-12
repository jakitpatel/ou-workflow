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

const sameId = (left: unknown, right: unknown) => {
  const normalizedLeft = String(left ?? '').trim()
  return normalizedLeft !== '' && normalizedLeft === String(right ?? '').trim()
}

export function getCompanyStatus(
  globalData: ApplicationGlobalData | undefined,
) {
  return globalData?.company_status
}

export function getOwnsStatus(
  globalData: ApplicationGlobalData | undefined,
  ownsId: string | number | null | undefined,
  plantId?: string | number | null,
) {
  const plants = globalData?.plants ?? []
  const plant = plants.find((candidate) => sameId(candidate.owns_id, ownsId))
    ?? plants.find((candidate) => sameId(candidate.plant_id, plantId))
    ?? (plants.length === 1 ? plants[0] : undefined)
  return plant?.owns_status
}

export function getWorkflowStatus(
  globalData: ApplicationGlobalData | undefined,
  wfid: string | number | null | undefined,
  plantId?: string | number | null,
) {
  const plants = globalData?.plants ?? []
  const plant = plants.find((candidate) => sameId(candidate.WFID, wfid))
    ?? plants.find((candidate) => sameId(candidate.plant_id, plantId))
    ?? (plants.length === 1 ? plants[0] : undefined)
  return plant?.wf_status ?? globalData?.wf_status
}
