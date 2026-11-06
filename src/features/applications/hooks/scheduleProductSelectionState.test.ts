import { describe, expect, it } from 'vitest'
import { getApplicationProductRowId, getScheduleBTaskScratchpad, withScheduleProductSelection, withScheduleProductState, type ScheduleBScratchpad } from './useScheduleBProducts'

describe('Schedule A selection source', () => {
  it('uses product selection over saved task selection and preserves other state', () => {
    const products = [
      { ApplicationID: 1166, ScheduleProductId: 566, isSelected: true },
      { ApplicationID: 1166, ScheduleProductId: 567, isSelected: false },
      { ApplicationID: 1166, ScheduleProductId: 568 },
    ]
    const ids = products.map(getApplicationProductRowId)
    const saved: ScheduleBScratchpad = {
      flags: { [ids[1]]: { flagged: true, note: 'Keep note' } },
      halacha: { [ids[1]]: { open: true, note: 'Keep review' } },
      resolved: { [ids[1]]: true, [ids[2]]: true, 'kash-123': true },
      rounds: [], attachments: {}, eirReceived: true, eirReviewComplete: false,
      eirNeedsEntry: false, eirNotRequired: false, scheduleBReady: false,
    }
    const result = withScheduleProductSelection(saved, products)
    expect(result.resolved).toEqual({ [ids[0]]: true, 'kash-123': true })
    expect(result).toEqual({ ...saved, resolved: result.resolved })
    expect(saved.resolved[ids[1]]).toBe(true)
    const taskState = getScheduleBTaskScratchpad(saved)
    expect(taskState).not.toHaveProperty('resolved')
    expect(taskState).not.toHaveProperty('flags')
    expect(taskState).not.toHaveProperty('halacha')
    expect(taskState).toEqual({
      rounds: saved.rounds, attachments: {}, eirReceived: true, eirReviewComplete: false,
      eirNeedsEntry: false, eirNotRequired: false, scheduleBReady: false,
    })
    const fromProducts = withScheduleProductState(saved, [
      { ...products[0], isFlagged: true, flaggedNote: 'Product note', isHalachic: true, halachicNote: 'Review note' },
      { ...products[1], isFlagged: false, flaggedNote: '' },
      products[2],
    ])
    expect(fromProducts.flags).toEqual({
      [ids[0]]: { flagged: true, note: 'Product note' },
      [ids[1]]: { flagged: false, note: '' },
      [ids[2]]: { flagged: false, note: '' },
    })
    expect(fromProducts.halacha).toEqual({
      [ids[0]]: { open: true, note: 'Review note' },
      [ids[1]]: { open: false, note: '' },
      [ids[2]]: { open: false, note: '' },
    })
    expect(saved.halacha[ids[1]]).toEqual({ open: true, note: 'Keep review' })
    expect(withScheduleProductSelection(result, [
      { ...products[0], isSelected: false },
      { ...products[1], isSelected: true },
      products[2],
    ]).resolved).toEqual({ [ids[1]]: true, 'kash-123': true })
  })
})
