import { describe, expect, it } from 'vitest'
import { getContractTypeLabel, isNewCompanyContractDetail } from './contractType'

describe('contract type from get_application_details_v2 company.is_new', () => {
  it('is a new-company contract only when is_new is "Y" (or true)', () => {
    expect(isNewCompanyContractDetail({ company: [{ is_new: 'Y' }] })).toBe(true)
    expect(isNewCompanyContractDetail({ company: [{ is_new: true }] })).toBe(true)
  })

  it('defaults to a plant addendum: "N", missing flag, missing company, or no detail', () => {
    expect(isNewCompanyContractDetail({ company: [{ is_new: 'N' }] })).toBe(false)
    expect(isNewCompanyContractDetail({ company: [{}] })).toBe(false)
    expect(isNewCompanyContractDetail({ company: [] })).toBe(false)
    expect(isNewCompanyContractDetail({ company: [null] })).toBe(false)
    expect(isNewCompanyContractDetail(undefined)).toBe(false)
  })

  it('labels the two types', () => {
    expect(getContractTypeLabel(true)).toBe('New Company Certification')
    expect(getContractTypeLabel(false)).toBe('Plant Addendum Certification')
  })
})
