import { describe, expect, it } from 'vitest'
import { mapPrelimApplicationDetailToApplicationDetail } from './prelimApplicationDetailAdapter'

describe('mapPrelimApplicationDetailToApplicationDetail', () => {
  it('preserves the intake overview date and process-day values', () => {
    const result = mapPrelimApplicationDetailToApplicationDetail({
      externalReferenceId: 1,
      createdDate: '2026-02-27 14:46:07.605093',
      daysInProcess: 12,
      daysOverdue: 3,
    })

    expect(result.createdDate).toBe('2026-02-27 14:46:07.605093')
    expect(result.daysInProcess).toBe(12)
    expect(result.daysOverdue).toBe(3)
  })
})
