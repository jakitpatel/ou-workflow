import { describe, expect, it } from 'vitest'
import { buildNoFeeInspectionResult } from './inspectionInvoiceCompletion'

describe('no-fee inspection completion', () => {
  it('returns the selected RFR username in the task result', () => {
    expect(buildNoFeeInspectionResult(true, 'RFR518620')).toBe(
      '{selectRFR:YES, RFR:RFR518620}',
    )
  })

  it('preserves the no-inspection result', () => {
    expect(buildNoFeeInspectionResult(false, '')).toBe('Inspection not needed')
  })

  it('requires an RFR when inspection is needed', () => {
    expect(() => buildNoFeeInspectionResult(true, '')).toThrow('Select an RFR')
    expect(() => buildNoFeeInspectionResult(true, '   ')).toThrow('Select an RFR')
  })
})
