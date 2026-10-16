import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getRecommendedRfrUsername, useInspectionRfrSelection } from './useInspectionRfrSelection'

const recommended = { lookupKey: 'person-1', id: 'selected.rfr', userName: 'selected.rfr', assigneeValue: 'selected.rfr', isActive: true }
const other = { ...recommended, lookupKey: 'person-2', id: 'other.rfr', userName: 'other.rfr', assigneeValue: 'other.rfr' }

describe('inspection RFR recommendation', () => {
  it('reads the recommendation from serialized or parsed global data', () => {
    expect(getRecommendedRfrUsername('{"RFRRecommendation":" selected.rfr "}')).toBe('selected.rfr')
    expect(getRecommendedRfrUsername({ RFRRecommendation: 'selected.rfr' })).toBe('selected.rfr')
    for (const value of [undefined, null, '', '{broken', {}, { RFRRecommendation: 42 }]) {
      expect(getRecommendedRfrUsername(value)).toBe('')
    }
  })

  it('selects by username when the lookup arrives and preserves manual changes on refresh', () => {
    const { result, rerender } = renderHook(({ rfrs }) => useInspectionRfrSelection('SELECTED.RFR', rfrs, true), {
      initialProps: { rfrs: [] as typeof recommended[] },
    })
    expect(result.current.selectedRfrId).toBeNull()
    rerender({ rfrs: [recommended, other] })
    expect(result.current.selectedRfrId).toBe('person-1')
    act(() => result.current.setSelectedRfrId(null))
    rerender({ rfrs: [recommended, other] })
    expect(result.current.selectedRfrId).toBeNull()
    act(() => result.current.setSelectedRfrId('person-2'))
    rerender({ rfrs: [recommended, other] })
    expect(result.current.selectedRfrId).toBe('person-2')
    act(() => result.current.setSelectedRfrId(undefined))
    expect(result.current.selectedRfrId).toBe('person-1')
  })

  it('preserves a restored choice and skips missing or inactive recommendations', () => {
    const { result, rerender } = renderHook(({ username, active, enabled }) =>
      useInspectionRfrSelection(username, [{ ...recommended, isActive: active }, other], enabled), {
      initialProps: { username: 'selected.rfr', active: true, enabled: true },
    })
    act(() => result.current.setSelectedRfrId('saved-rfr'))
    expect(result.current.selectedRfrId).toBe('saved-rfr')
    act(() => result.current.setSelectedRfrId(undefined))
    rerender({ username: 'missing', active: true, enabled: true })
    expect(result.current.selectedRfrId).toBeNull()
    rerender({ username: 'selected.rfr', active: false, enabled: true })
    expect(result.current.selectedRfrId).toBeNull()
    rerender({ username: 'selected.rfr', active: true, enabled: false })
    expect(result.current.selectedRfrId).toBeNull()
  })
})
