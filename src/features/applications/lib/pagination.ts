// Page sizes shared by the dashboard data hooks and their pagination controls, so the
// "Showing x-y", page count and Next/Last state always match the rows actually fetched.
export const NCRC_DASHBOARD_PAGE_SIZE = 50
export const PRELIM_DASHBOARD_PAGE_SIZE = 20

export type OffsetPagination = {
  /** 1-based index of the first row shown, 0 when there are no rows. */
  start: number
  /** 1-based index of the last row shown, 0 when there are no rows. */
  end: number
  /** 1-based page number, 0 when there are no rows. */
  currentPage: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

/** Pagination state for lists whose `page` search param is a row offset stepped by `pageSize`. */
export function getOffsetPagination({
  offset,
  pageSize,
  totalCount,
}: {
  offset: number
  pageSize: number
  totalCount: number
}): OffsetPagination {
  const size = Math.max(1, pageSize)
  const total = Math.max(0, totalCount)
  const totalPages = Math.ceil(total / size)
  if (total === 0) {
    return { start: 0, end: 0, currentPage: 0, totalPages, hasPrevious: offset > 0, hasNext: false }
  }

  const safeOffset = Math.max(0, offset)
  return {
    start: Math.min(safeOffset + 1, total),
    end: Math.min(safeOffset + size, total),
    currentPage: Math.min(Math.floor(safeOffset / size) + 1, totalPages),
    totalPages,
    hasPrevious: safeOffset > 0,
    hasNext: safeOffset + size < total,
  }
}
