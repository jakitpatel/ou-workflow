import type { ApplicationDetail, Company, Plant } from '@/types/application'

type CreationFlag = boolean | 'Y' | 'N' | null

export type ApplicationOverviewDetail = Omit<ApplicationDetail, 'company' | 'plants'> & {
  company: (Company & { is_new?: CreationFlag })[]
  plants: (Plant & {
    ownsId?: number | string
    status?: string
    is_new_plant?: CreationFlag
    is_new_owns?: CreationFlag
  })[]
}

export function normalizeCreationFlag(value: unknown): boolean | undefined {
  if (value === true || value === 'Y') return true
  if (value === false || value === 'N') return false
  return undefined
}
