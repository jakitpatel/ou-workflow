import { describe, expect, it } from 'vitest'
import { getOffsetPagination } from './pagination'

describe('getOffsetPagination', () => {
  it('summarises a partial single page by the fetched page size', () => {
    expect(getOffsetPagination({ offset: 0, pageSize: 50, totalCount: 16 })).toEqual({
      start: 1, end: 16, currentPage: 1, totalPages: 1, hasPrevious: false, hasNext: false,
    })
  })

  it('numbers later pages from the offset and disables Next on the last page', () => {
    expect(getOffsetPagination({ offset: 100, pageSize: 50, totalCount: 120 })).toMatchObject({
      start: 101, end: 120, currentPage: 3, totalPages: 3, hasNext: false, hasPrevious: true,
    })
    expect(getOffsetPagination({ offset: 50, pageSize: 50, totalCount: 100 }).hasNext).toBe(false)
    expect(getOffsetPagination({ offset: 0, pageSize: 20, totalCount: 21 }).hasNext).toBe(true)
  })

  it('reads 0-0 and Page 0 of 0 for an empty result', () => {
    expect(getOffsetPagination({ offset: 0, pageSize: 20, totalCount: 0 })).toEqual({
      start: 0, end: 0, currentPage: 0, totalPages: 0, hasPrevious: false, hasNext: false,
    })
  })

  it('keeps an out-of-range offset inside the result', () => {
    expect(getOffsetPagination({ offset: 200, pageSize: 50, totalCount: 60 })).toMatchObject({
      start: 60, end: 60, currentPage: 2, totalPages: 2, hasNext: false, hasPrevious: true,
    })
  })
})
