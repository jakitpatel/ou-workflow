import { describe, expect, it } from 'vitest'
import {
  getCompanyStatus,
  getOwnsResolutionMarker,
  getOwnsStatus,
  getWorkflowStatus,
  parsePrelimGlobalData,
} from './prelimGlobalData'

describe('prelim global data', () => {
  const globalData = parsePrelimGlobalData(
    JSON.stringify({
      company_id: 1389198,
      company_status: 'Certified',
      plants: [
        {
          plant_id: 14064921,
          owns_id: 14095229,
          owns_status: 'Pending',
          WFID: 421,
          wf_status: 'In Progress',
          is_new_owns: true,
        },
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

  it('returns statuses only for their matching displayed IDs', () => {
    expect(getCompanyStatus(globalData)).toBe('Certified')
    expect(getOwnsStatus(globalData, 14095229)).toBe('Pending')
    expect(getOwnsStatus(globalData, 999)).toBeUndefined()
    expect(getWorkflowStatus(globalData, 421)).toBe('In Progress')
    expect(getWorkflowStatus(globalData, 999)).toBeUndefined()
  })
})
