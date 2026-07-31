import { describe, expect, it } from 'vitest'
import { getOwnsResolutionMarker, parsePrelimGlobalData } from './prelimGlobalData'

describe('prelim global data', () => {
  const globalData = parsePrelimGlobalData(
    JSON.stringify({
      plants: [
        { plant_id: 14064921, owns_id: 14095229, is_new_owns: true },
        { plant_id: 14064922, owns_id: 14095230, is_new_owns: false },
      ],
    }),
  )

  it('marks a newly created OwnsID using the matching plant ID', () => {
    expect(getOwnsResolutionMarker(globalData, '14064921')).toBe('C')
  })

  it('marks a matched OwnsID using the matching plant ID', () => {
    expect(getOwnsResolutionMarker(globalData, 14064922)).toBe('M')
  })

  it('does not borrow a marker from another plant', () => {
    expect(getOwnsResolutionMarker(globalData, 999)).toBeNull()
  })
})
