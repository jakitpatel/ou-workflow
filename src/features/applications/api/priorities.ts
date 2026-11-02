import { fetchWithAuth } from '@/shared/api/httpClient'

export type PriorityOption = {
  /** WF_Priorities.PriorityCode, the value the list API filters on. */
  value: string
  label: string
}

// Mirrors WF_Priorities; used for ordering and as the fallback when the lookup is unavailable.
const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW']

export const DEFAULT_PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
]

const toLabel = (code: string, description: unknown) => {
  const text = String(description ?? '')
    .replace(/\s*priority\s*$/i, '')
    .trim()
  if (text) return text
  return code.charAt(0) + code.slice(1).toLowerCase()
}

const priorityRank = (code: string) => {
  const index = PRIORITY_ORDER.indexOf(code)
  return index === -1 ? PRIORITY_ORDER.length : index
}

export function mapPriorityOptions(response: unknown): PriorityOption[] {
  const rows = (response as { data?: unknown })?.data
  if (!Array.isArray(rows)) return []

  const options = rows.flatMap((row): PriorityOption[] => {
    const record = (row ?? {}) as { id?: unknown; attributes?: Record<string, unknown> }
    const code = String(record.attributes?.PriorityCode ?? record.id ?? '')
      .trim()
      .toUpperCase()
    if (!code) return []
    return [{ value: code, label: toLabel(code, record.attributes?.PriorityDescription) }]
  })

  return options.sort((a, b) => priorityRank(a.value) - priorityRank(b.value))
}

export async function fetchPriorityOptions(token?: string | null): Promise<PriorityOption[]> {
  const response = await fetchWithAuth<unknown>({ path: '/api/WFPriority', token })
  return mapPriorityOptions(response)
}
