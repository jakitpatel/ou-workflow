import { describe, expect, it } from 'vitest'
import { getDetailBillingType } from './contractBillingType'

describe('getDetailBillingType (application detail "Fee" section)', () => {
  it.each([
    [{ Fee: { billingType: 'plant' } }, 'plant'],
    [{ Fee: { billingType: 'company' } }, 'company'],
    [{ fee: { billingType: 'Plant ' } }, 'plant'],
    [{ Fee: [{ billingType: 'plant' }] }, 'plant'],
    [{ Fee: { BillingType: 'PLANT' } }, 'plant'],
  ])('reads %j as %s', (detail, expected) => {
    expect(getDetailBillingType(detail)).toBe(expected)
  })

  it.each([undefined, null, {}, { Fee: null }, { Fee: {} }, { Fee: { billingType: 'region' } }, { Fee: [] }])(
    'defaults to company for %j',
    (detail) => {
      expect(getDetailBillingType(detail)).toBe('company')
    },
  )
})
