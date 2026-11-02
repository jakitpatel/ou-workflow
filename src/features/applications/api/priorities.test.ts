import { describe, expect, it } from 'vitest'
import { DEFAULT_PRIORITY_OPTIONS, mapPriorityOptions } from './priorities'

describe('mapPriorityOptions (F9)', () => {
  it('maps /api/WFPriority rows to codes ordered by urgency', () => {
    const response = {
      data: ['CRITICAL', 'HIGH', 'LOW', 'NORMAL'].map((code) => ({
        id: code,
        attributes: { PriorityCode: code, PriorityDescription: `${code[0]}${code.slice(1).toLowerCase()} Priority` },
      })),
    }
    expect(mapPriorityOptions(response)).toEqual(DEFAULT_PRIORITY_OPTIONS)
  })

  it('returns no options for an unexpected payload', () => {
    expect(mapPriorityOptions({})).toEqual([])
    expect(mapPriorityOptions(null)).toEqual([])
  })
})
