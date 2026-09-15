import { describe, expect, it } from 'vitest'
import { getDesignatedRfrName } from './designatedRfrName'

describe('designated RFR display name', () => {
  it('displays FIRST LAST from the contact object', () => {
    expect(getDesignatedRfrName({ FIRST: 'Shouki', LAST: 'Benjamin', ID: 'SHOUKI.BENJAMIN', PREFIX: '', MIDDLE: '' })).toBe('Shouki Benjamin')
  })
  it('handles partial names, whitespace, and legacy strings', () => {
    expect(getDesignatedRfrName({ FIRST: ' Shouki ', LAST: '' })).toBe('Shouki')
    expect(getDesignatedRfrName({ LAST: ' Benjamin ' })).toBe('Benjamin')
    expect(getDesignatedRfrName(' Shouki Benjamin ')).toBe('Shouki Benjamin')
  })
  it('leaves missing names empty for the existing dash fallback', () => {
    expect(getDesignatedRfrName(undefined)).toBe('')
    expect(getDesignatedRfrName(null)).toBe('')
    expect(getDesignatedRfrName({})).toBe('')
  })
})
