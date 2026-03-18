type PrelimListParams = {
  searchTerm?: string
  statusFilter?: string
  page?: number
  limit?: number
}

export const prelimQueryKeys = {
  all: ['prelim'] as const,
  lists: () => [...prelimQueryKeys.all, 'list'] as const,
  list: (params: PrelimListParams) => [...prelimQueryKeys.lists(), params] as const,
  details: () => [...prelimQueryKeys.all, 'detail'] as const,
  detail: (externalReferenceId?: number | null) =>
    [...prelimQueryKeys.details(), externalReferenceId ?? 'unknown'] as const,
  kashrusCompanyDetails: (selectedMatchId?: string | number) =>
    [...prelimQueryKeys.all, 'kashrus-company-details', selectedMatchId ?? 'unknown'] as const,
  kashrusPlantDetails: (selectedMatchId?: string | number) =>
    [...prelimQueryKeys.all, 'kashrus-plant-details', selectedMatchId ?? 'unknown'] as const,
} as const
