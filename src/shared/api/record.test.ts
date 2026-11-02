import { describe, expect, it } from 'vitest'
import { asRecord, getErrorMessage } from './record'

describe('JSON and error boundaries', () => {
  it('rejects null, primitive and array records', () => {
    for (const value of [null, undefined, 'text', 7, []]) expect(asRecord(value)).toEqual({})
    const record = { name: 'FIX-lint-f18' }
    expect(asRecord(record)).toBe(record)
  })
  it('preserves API details and safely falls back for arbitrary thrown values', () => {
    expect(getErrorMessage({ details: { status: 'Conflict' }, message: 'Request failed' }, 'Fallback')).toBe('Conflict')
    expect(getErrorMessage({ details: { message: 'Invalid record' } }, 'Fallback')).toBe('Invalid record')
    expect(getErrorMessage(new Error('Network failed'), 'Fallback')).toBe('Network failed')
    for (const value of [null, 'oops', { message: {} }]) expect(getErrorMessage(value, 'Fallback')).toBe('Fallback')
  })
})
