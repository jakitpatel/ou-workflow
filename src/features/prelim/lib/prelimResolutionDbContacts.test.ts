import { describe, expect, it } from 'vitest'
import { getPlantDbRecord, toPlantDrawerData } from './prelimResolution'
import { getResolutionDbContacts } from './prelimResolutionDbContacts'

const other = {
  Active: 1, Email: 'info@oliocostadoro.com', FirstName: 'Rosa', LastName: 'Bisogno',
  Title: '', Voice: '0743 23061',
}
const billing = { FirstName: 'Billing', Email: 'billing@example.com' }
const primary = { FirstName: 'Primary' }

describe('resolution database contacts', () => {
  it.each([false, true])('pairs submitted Other with KASH otherContact (wrapped response: %s)', (wrapped) => {
    const submitted = toPlantDrawerData({
      plantName: 'Plant', plantAddress: '', plantCity: '', plantCountry: '',
      plantContacts: { OtherContact: [{ contactFirst: 'Submitted Other' }] },
    })
    const records = [{ plantContacts: { primaryContact: [primary], otherContact: [other], billingContact: [billing] } }]
    const db = getPlantDbRecord(wrapped ? { data: records } : records)
    const result = getResolutionDbContacts(undefined, db, submitted.secondaryContactLabel)
    expect(result.dbPlantMarketingContact).toEqual(other)
    expect(result.dbPlantPrimaryContact).toEqual(primary)
  })

  it('keeps an absent Other contact empty instead of displaying Billing', () => {
    expect(getResolutionDbContacts(undefined, { plantContacts: { billingContact: [billing] } }, 'Other').dbPlantMarketingContact).toBeUndefined()
    expect(getResolutionDbContacts(undefined, undefined, 'Other').dbPlantMarketingContact).toBeUndefined()
  })

  it.each([undefined, 'Billing', 'Marketing'])('preserves legacy billing selection for %s', (label) => {
    const result = getResolutionDbContacts(
      { companyContacts: { primaryContact: [primary], billingContact: [billing] } },
      { plantContacts: { billingContact: [billing], otherContact: [other] } }, label,
    )
    expect(result.dbPlantMarketingContact).toEqual(billing)
    expect(result.dbCompanyPrimaryContact).toEqual(primary)
    expect(result.dbCompanyBillingContact).toEqual(billing)
  })
})
