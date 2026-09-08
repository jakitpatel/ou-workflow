import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useContractRcNotification } from './useContractRcNotification'

const mocks = vi.hoisted(() => ({ generateInvoice: vi.fn() }))
vi.mock('@/features/applications/api', () => ({
  generateInspectionInvoice: mocks.generateInvoice,
}))

describe('contract invoice fee requirement', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each([Number(''), Number('   '), 0, -1, NaN, Infinity])(
    'does not call the invoice API for invalid fee %s',
    async (fee) => {
      const { result } = renderHook(() => useContractRcNotification({ token: 'token' }))
      await expect(result.current.generateContractInvoice({
        applicationId: 123,
        fee,
        invoiceDate: '2026-09-08',
      })).rejects.toThrow('Enter the annual certification fee')
      expect(mocks.generateInvoice).not.toHaveBeenCalled()
      expect(result.current.isGeneratingContractInvoice).toBe(false)
    },
  )

  it('sends the entered positive fee to the invoice API', async () => {
    mocks.generateInvoice.mockResolvedValue({ invoiceId: 'invoice-123' })
    const { result } = renderHook(() => useContractRcNotification({ token: 'token' }))
    await act(async () => {
      await result.current.generateContractInvoice({
        applicationId: 123,
        fee: 1250.50,
        invoiceDate: '2026-09-08',
      })
    })
    expect(mocks.generateInvoice).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ fee: 1250.50, feeRequired: true }),
    }))
  })
})
