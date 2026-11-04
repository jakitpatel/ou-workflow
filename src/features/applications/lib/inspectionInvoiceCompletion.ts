export function buildNoFeeInspectionResult(inspectionNeeded: boolean | null, rfrUsername: string) {
  if (inspectionNeeded === false) return 'Inspection not needed'
  if (inspectionNeeded !== true || !rfrUsername.trim()) {
    throw new Error('Select an RFR before completing the task')
  }
  return `{selectRFR:YES, RFR:${rfrUsername.trim()}}`
}
