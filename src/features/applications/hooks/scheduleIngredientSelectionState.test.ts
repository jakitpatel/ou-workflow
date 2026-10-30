import { describe, expect, it } from 'vitest'
import { getApplicationIngredientRowId, getScheduleATaskScratchpad, withScheduleIngredientSelection, withScheduleIngredientState, type ScheduleAScratchpad } from './useScheduleAIngredients'

describe('Schedule A selection source', () => {
  it('uses ingredient selection over saved task selection and preserves other state', () => {
    const ingredients = [
      { ApplicationID: 1166, IngredientId: 566, isSelected: true },
      { ApplicationID: 1166, IngredientId: 567, isSelected: false },
      { ApplicationID: 1166, IngredientId: 568 },
    ]
    const ids = ingredients.map(getApplicationIngredientRowId)
    const saved: ScheduleAScratchpad = {
      flags: { [ids[1]]: { flagged: true, note: 'Keep note' } },
      halacha: { [ids[1]]: { open: true, note: 'Keep review' } },
      resolved: { [ids[1]]: true, [ids[2]]: true, 'kash-123': true },
      rounds: [], attachments: {}, eirReceived: true, eirReviewComplete: false,
      eirNeedsEntry: false, eirNotRequired: false, scheduleAReady: false,
    }
    const result = withScheduleIngredientSelection(saved, ingredients)
    expect(result.resolved).toEqual({ [ids[0]]: true, 'kash-123': true })
    expect(result).toEqual({ ...saved, resolved: result.resolved })
    expect(saved.resolved[ids[1]]).toBe(true)
    const taskState = getScheduleATaskScratchpad(saved)
    expect(taskState).not.toHaveProperty('resolved')
    expect(taskState).not.toHaveProperty('flags')
    expect(taskState).not.toHaveProperty('halacha')
    expect(taskState).toEqual({
      rounds: saved.rounds, attachments: {}, eirReceived: true, eirReviewComplete: false,
      eirNeedsEntry: false, eirNotRequired: false, scheduleAReady: false,
    })
    const fromIngredients = withScheduleIngredientState(saved, [
      { ...ingredients[0], isFlagged: true, flaggedNote: 'Ingredient note', isHalachic: true, halachicNote: 'Review note' },
      { ...ingredients[1], isFlagged: false, flaggedNote: '' },
      ingredients[2],
    ])
    expect(fromIngredients.flags).toEqual({
      [ids[0]]: { flagged: true, note: 'Ingredient note' },
      [ids[1]]: { flagged: false, note: '' },
      [ids[2]]: { flagged: false, note: '' },
    })
    expect(fromIngredients.halacha).toEqual({
      [ids[0]]: { open: true, note: 'Review note' },
      [ids[1]]: { open: false, note: '' },
      [ids[2]]: { open: false, note: '' },
    })
    expect(saved.halacha[ids[1]]).toEqual({ open: true, note: 'Keep review' })
    expect(withScheduleIngredientSelection(result, [
      { ...ingredients[0], isSelected: false },
      { ...ingredients[1], isSelected: true },
      ingredients[2],
    ]).resolved).toEqual({ [ids[1]]: true, 'kash-123': true })
  })
})
