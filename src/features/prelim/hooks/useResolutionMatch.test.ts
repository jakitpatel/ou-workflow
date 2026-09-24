import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResolutionMatch } from './useResolutionMatch'

describe('resolution match selection', () => {
  it('does not carry a search selection into another resolution task', () => {
    const matches = [{ Id: 1, Address: '' }]
    const { result, rerender } = renderHook(({ scope }) => useResolutionMatch(matches, undefined, scope), {
      initialProps: { scope: 'company:1' },
    })
    act(() => result.current.setSelectedMatch({ Id: 1443584, Address: '' }))
    rerender({ scope: 'plant:2' })
    expect(result.current.selectedMatch?.Id).toBe(1)
    expect(result.current.createdMatch).toBeNull()
  })
  it('keeps explicit search, manual, and create-new choices when suggestions refresh', () => {
    const matches = [{ Id: 1, Address: '', companyName: 'Suggested' }]
    const { result, rerender } = renderHook(({ list }) => useResolutionMatch(list), {
      initialProps: { list: matches },
    })
    expect(result.current.selectedMatch?.Id).toBe(1)
    act(() => result.current.setSelectedMatch({ Id: 1443584, Address: '' }))
    rerender({ list: [...matches] })
    expect(result.current.selectedMatch?.Id).toBe(1443584)
    act(() => result.current.setSelectedMatch(null))
    rerender({ list: [...matches] })
    expect(result.current.selectedMatch).toBeNull()
  })

  it('uses the saved ID initially and preserves a newly created match on refresh', () => {
    const matches = [
      { Id: 1, Address: '' },
      { Id: 2, Address: '' },
    ]
    const { result, rerender } = renderHook(({ list }) => useResolutionMatch(list, '2'), {
      initialProps: { list: matches },
    })
    expect(result.current.selectedMatch?.Id).toBe(2)
    act(() => {
      result.current.setCreatedMatch({ Id: 3, Address: '' })
      result.current.setSelectedMatch({ Id: 3, Address: '' })
    })
    rerender({ list: [...matches] })
    expect(result.current.selectedMatch?.Id).toBe(3)
    expect(result.current.createdMatch?.Id).toBe(3)
  })
})
