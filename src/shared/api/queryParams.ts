export function buildPaginationParams(page: number, limit: number): URLSearchParams {
  const params = new URLSearchParams()
  params.append('page[limit]', String(limit))
  params.append('page[offset]', String(page))
  return params
}

export function buildSortParams(sortBy?: string): URLSearchParams {
  const params = new URLSearchParams()

  if (sortBy) {
    params.append('sort', sortBy)
  }

  return params
}

export function mergeParams(...paramSets: URLSearchParams[]): URLSearchParams {
  const merged = new URLSearchParams()

  paramSets.forEach((params) => {
    params.forEach((value, key) => {
      merged.append(key, value)
    })
  })

  return merged
}

export function addFilterParams(
  params: URLSearchParams,
  filters: Record<string, string | undefined>,
): void {
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value.trim() !== '' && value !== 'all') {
      params.append(key, value.trim())
    }
  })
}
