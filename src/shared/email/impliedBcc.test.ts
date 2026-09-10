import { afterEach, describe, expect, it, vi } from 'vitest'
import { withImpliedBcc } from './impliedBcc'

afterEach(() => vi.unstubAllEnvs())

describe('implied BCC', () => {
  it.each(['a@ou.org', 'KashrusITTestBox@ou.org'])(
    'adds %s to the outgoing BCC without changing the visible draft',
    (address) => {
      vi.stubEnv('VITE_EMAIL_IMPLIED_BCC', address)
      const draft = { bcc: '' }
      expect(withImpliedBcc(draft.bcc)).toBe(address)
      expect(draft.bcc).toBe('')
      expect(withImpliedBcc('other@ou.org')).toBe(`other@ou.org, ${address}`)
    },
  )

  it('normalizes separators and avoids duplicate recipients regardless of casing', () => {
    vi.stubEnv('VITE_EMAIL_IMPLIED_BCC', ' KashrusITTestBox@ou.org ')
    expect(withImpliedBcc('other@ou.org, KASHRUSITTESTBOX@ou.org; other@ou.org')).toBe(
      'other@ou.org, KASHRUSITTESTBOX@ou.org',
    )
  })

  it('preserves manual BCC and allows an empty environment setting', () => {
    vi.stubEnv('VITE_EMAIL_IMPLIED_BCC', '')
    expect(withImpliedBcc('other@ou.org')).toBe('other@ou.org')
    expect(withImpliedBcc()).toBeNull()
    expect(withImpliedBcc(null)).toBeNull()
  })
})
