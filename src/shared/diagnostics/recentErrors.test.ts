import { afterEach, describe, expect, it } from 'vitest'
import {
  MAX_RECENT_ERRORS,
  clearRecentErrors,
  getRecentErrors,
  installRecentErrorCapture,
  recordRecentError,
  redactDiagnosticText,
} from './recentErrors'

afterEach(() => clearRecentErrors())

describe('redactDiagnosticText', () => {
  it('removes tokens, emails, phone numbers, query strings and long opaque values', () => {
    const text = redactDiagnosticText(
      'Bearer abc.def-ghi failed for jane.doe@example.com eyJhbGciOi.eyJzdWIiOjF9.c2lnbmF0dXJl ' +
        'call +1 (212) 555-0100 at GET /api/Company?filter[name]=Acme&q=secret https://x.ou.org/a?code=123 ' +
        'key AKIAABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
    )
    expect(text).not.toMatch(/jane\.doe|abc\.def|eyJ|555-0100|Acme|secret|code=123|AKIAABCDEFGHIJKLMNOP/)
    expect(text).toContain('[email]')
    expect(text).toContain('/api/Company?[query]')
    expect(text).toContain('https://x.ou.org/a?[query]')
  })

  it('keeps ordinary error text and truncates long messages', () => {
    expect(redactDiagnosticText(new Error('Request failed: 500 Internal Server Error'))).toBe(
      'Request failed: 500 Internal Server Error',
    )
    const long = redactDiagnosticText('word '.repeat(200))
    expect(long.length).toBe(300)
    expect(long.endsWith('…')).toBe(true)
  })
})

describe('recent error buffer', () => {
  it('keeps only the latest errors, oldest first, redacted', () => {
    for (let i = 1; i <= MAX_RECENT_ERRORS + 2; i += 1) recordRecentError('api', `error ${i} for a@b.co`)
    const errors = getRecentErrors()
    expect(errors).toHaveLength(MAX_RECENT_ERRORS)
    expect(errors[0].message).toBe('error 3 for [email]')
    expect(errors.at(-1)?.message).toBe(`error ${MAX_RECENT_ERRORS + 2} for [email]`)
  })

  it('ignores empty messages and returns copies', () => {
    recordRecentError('window', '   ')
    expect(getRecentErrors()).toEqual([])
    recordRecentError('window', 'boom')
    getRecentErrors()[0].message = 'changed'
    expect(getRecentErrors()[0].message).toBe('boom')
  })

  it('captures uncaught errors and unhandled rejections until uninstalled', () => {
    const uninstall = installRecentErrorCapture(window)
    expect(installRecentErrorCapture(window)).toBe(uninstall)

    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error', error: new Error('x is undefined') }))
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.defineProperty(rejection, 'reason', { value: new Error('load failed') })
    window.dispatchEvent(rejection)
    expect(getRecentErrors().map((entry) => [entry.source, entry.message])).toEqual([
      ['window', 'x is undefined'],
      ['promise', 'load failed'],
    ])

    uninstall()
    window.dispatchEvent(new ErrorEvent('error', { message: 'after uninstall' }))
    expect(getRecentErrors()).toHaveLength(2)
  })
})
