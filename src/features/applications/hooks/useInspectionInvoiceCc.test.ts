import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useInspectionInvoiceCc } from './useInspectionInvoiceCc'

describe('useInspectionInvoiceCc', () => {
  it('fills CC when application details arrive and preserves manual edits on refresh', () => {
    const { result, rerender } = renderHook(
      ({ emails }: { emails: Array<string | undefined> }) => useInspectionInvoiceCc(...emails),
      { initialProps: { emails: [undefined, undefined] as Array<string | undefined> } },
    )
    expect(result.current.emailCc).toBe('')
    rerender({ emails: [' tyler.band@ou.org ', 'shouki.benjamin@ou.org'] })
    expect(result.current.emailCc).toBe('tyler.band@ou.org, shouki.benjamin@ou.org')

    act(() => result.current.setEmailCc(''))
    rerender({ emails: ['new.ncrc@ou.org', 'shouki.benjamin@ou.org'] })
    expect(result.current.emailCc).toBe('')

    act(() => result.current.setEmailCc(undefined))
    expect(result.current.emailCc).toBe('new.ncrc@ou.org, shouki.benjamin@ou.org')
  })

  it('omits missing addresses and removes duplicates regardless of case', () => {
    const { result } = renderHook(() =>
      useInspectionInvoiceCc(undefined, '', '  ', 'person@ou.org', 'PERSON@ou.org'),
    )
    expect(result.current.emailCc).toBe('person@ou.org')
  })
})
