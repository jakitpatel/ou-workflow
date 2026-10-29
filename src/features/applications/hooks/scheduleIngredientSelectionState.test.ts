import { describe, expect, it } from 'vitest'
import { getApplicationIngredientRowId, withScheduleIngredientSelection, type ScheduleAScratchpad } from './useScheduleAIngredients'

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
    expect(withScheduleIngredientSelection(result, [
      { ...ingredients[0], isSelected: false },
      { ...ingredients[1], isSelected: true },
      ingredients[2],
    ]).resolved).toEqual({ [ids[1]]: true, 'kash-123': true })
  })
})
