import { describe, expect, it } from 'vitest'
import { getInspectionStatusSavedState } from './inspectionStatusDetails'

describe('getInspectionStatusSavedState', () => {
  it('restores Python-style invoice state including the selected RFR', () => {
    const statusDetails =
      "{'savedState': {'version': 1, 'stage': 'generated', 'setup': {'inspectionNeeded': True, 'feeRequired': True, 'awaitPayment': True, 'selectedRfrId': '531549', 'rfr': {'id': 'SHOUKI.BENJAMIN', 'name': 'BENJAMIN, SHOUKI', 'lookupKey': '531549', 'isActive': True}, 'feeAmount': '600.00'}, 'email': {'sent': False, 'sentAt': None}}}"

    const savedState = getInspectionStatusSavedState<any>(statusDetails)

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
    const savedState = getInspectionStatusSavedState<any>({
      savedState: "{'setup': {'inspectionNeeded': False}, 'payment': {'paid': True}}",
    })

    expect(savedState).toEqual({
      setup: { inspectionNeeded: false },
      payment: { paid: true },
    })
  })
})
