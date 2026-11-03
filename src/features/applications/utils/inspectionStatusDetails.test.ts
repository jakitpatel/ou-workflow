import { describe, expect, it } from 'vitest'
import {
  getInspectionStatusInputParam,
  getInspectionStatusSavedState,
} from './inspectionStatusDetails'

describe('getInspectionStatusSavedState', () => {
  it('restores Python-style invoice state including the selected RFR', () => {
    const statusDetails =
      "{'savedState': {'version': 1, 'stage': 'generated', 'setup': {'inspectionNeeded': True, 'feeRequired': True, 'awaitPayment': True, 'selectedRfrId': '531549', 'rfr': {'id': 'SHOUKI.BENJAMIN', 'name': 'BENJAMIN, SHOUKI', 'lookupKey': '531549', 'isActive': True}, 'feeAmount': '600.00'}, 'email': {'sent': False, 'sentAt': None}}}"

    const savedState = getInspectionStatusSavedState<unknown>(statusDetails)

    expect(savedState).toMatchObject({
      version: 1,
      stage: 'generated',
      setup: {
        inspectionNeeded: true,
        feeRequired: true,
        awaitPayment: true,
        selectedRfrId: '531549',
        rfr: {
          id: 'SHOUKI.BENJAMIN',
          name: 'BENJAMIN, SHOUKI',
          lookupKey: '531549',
          isActive: true,
        },
        feeAmount: '600.00',
      },
      email: { sent: false, sentAt: null },
    })
  })

  it('restores a Python-style savedState nested inside an object', () => {
    const savedState = getInspectionStatusSavedState<unknown>({
      savedState: "{'setup': {'inspectionNeeded': False}, 'payment': {'paid': True}}",
    })

    expect(savedState).toEqual({
      setup: { inspectionNeeded: false },
      payment: { paid: true },
    })
  })
})

describe('StatusDetails reprs containing quotes', () => {
  // Python's repr switches to double quotes when a value contains an apostrophe.
  const repr =
    `{'savedState': {'company': "O'Brien's Bakery", 'note': 'He said "ok"', 'mixed': 'it\\'s "both"', 'sent': True, 'sentAt': None}, 'inputParam': "{company:O'Brien's}"}`

  it('reads savedState values with apostrophes and double quotes intact', () => {
    expect(getInspectionStatusSavedState<unknown>(repr)).toEqual({
      company: "O'Brien's Bakery",
      note: 'He said "ok"',
      mixed: `it's "both"`,
      sent: true,
      sentAt: null,
    })
  })

  it('reads a nested repr savedState string with an apostrophe', () => {
    expect(
      getInspectionStatusSavedState<unknown>({ savedState: `{'company': "O'Brien's", 'paid': False}` }),
    ).toEqual({ company: "O'Brien's", paid: false })
  })

  it('reads JSON StatusDetails with quotes unchanged', () => {
    const json = JSON.stringify({
      savedState: { company: "O'Brien's", note: 'He said "ok"' },
      inputParam: '{visitDate:2026-11-01}',
    })
    expect(getInspectionStatusSavedState<unknown>(json)).toEqual({
      company: "O'Brien's",
      note: 'He said "ok"',
    })
    expect(getInspectionStatusInputParam(json)).toBe('{visitDate:2026-11-01}')
  })

  it('returns null instead of a corrupted object for unreadable text', () => {
    expect(getInspectionStatusSavedState(`{'savedState': {'company': 'O'Brien'}}`)).toBeNull()
  })
})
