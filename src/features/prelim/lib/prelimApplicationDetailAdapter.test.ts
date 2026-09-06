import { describe, expect, it } from 'vitest'
import { mapPrelimApplicationDetailToApplicationDetail } from './prelimApplicationDetailAdapter'

describe('mapPrelimApplicationDetailToApplicationDetail', () => {
  it('uses the actual application ID instead of the external reference for intake details', () => {
    const result = mapPrelimApplicationDetailToApplicationDetail({
      applicationId: 3719,
      externalReferenceId: 820,
    })

    expect(result.applicationId).toBe('3719')
  })

  it('does not substitute the external reference when the application ID is missing', () => {
    const result = mapPrelimApplicationDetailToApplicationDetail({ externalReferenceId: 820 })

    expect(result.applicationId).toBe('')
  })

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
