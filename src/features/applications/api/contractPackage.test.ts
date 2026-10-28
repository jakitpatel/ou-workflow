import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { generateContractPackage, generateInspectionInvoice } from './index'
import {
  formatAttachmentReference,
  getContractPackageAttachmentUrl,
  getContractInvoiceAttachmentUrl,
} from '../lib/contractAttachments'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

describe('generated contract package references', () => {
  beforeEach(() => vi.clearAllMocks())
  it('preserves storage and browser references for their separate uses', async () => {
    const filePath = 's3://newcompany-documents/contracts/1441/contract_package.pdf'
    vi.mocked(fetchWithAuth).mockResolvedValue({
      applicationId: '1441',
      status: 'ok',
      data: {
        filePath,
        fileId: 1308,
        packagePDFurl: '/file/1308',
        download_url: '/download_file/1308',
      },
    })
    const result = await generateContractPackage({
      payload: {
        applicationId: 1441,
        generatedAt: '2026-10-28',
        coverLetter: { subject: 'Contract', body: 'Cover' },
        invoice: {},
        agreement: {},
        schedules: {},
      },
    })
    expect(result).toMatchObject({
      filePath,
      certificationPackagePdfUrl: '/file/1308',
      downloadUrl: '/download_file/1308',
    })
    expect(
      formatAttachmentReference(
        'Package.pdf',
        getContractPackageAttachmentUrl(
          result.filePath,
          result.certificationPackagePdfUrl,
          result.downloadUrl,
        ),
      ),
    ).toBe(`Package.pdf<${filePath}>`)
  })
  it('retains legacy package references when a saved storage path is absent', () => {
    expect(getContractPackageAttachmentUrl(undefined, '/file/1308', '/download_file/1308')).toBe(
      '/file/1308',
    )
    expect(getContractPackageAttachmentUrl(' ', null, '/download_file/1308')).toBe(
      '/download_file/1308',
    )
  })
})

it('preserves invoicePDFurl separately from browser display/download URLs', async () => {
  vi.mocked(fetchWithAuth).mockResolvedValue({
    display_url: '/file/1307',
    download_url: '/download_file/1307',
    invoiceID: 612522,
    invoicePDFurl: 's3://newcompany-documents/contracts/1441/Contract_Invoice_612522.pdf',
    message_id: 1307,
  })
  const result = await generateInspectionInvoice({
    payload: {
      applicationId: 1441,
      fee: 1250,
      expense: 0,
      invoiceDate: '2026-10-28',
      invoiceType: 'subscription',
      inspectionNeeded: false,
      feeRequired: true,
      awaitPayment: true,
    },
  })
  expect(result).toMatchObject({
    invoiceId: '612522',
    displayUrl: '/file/1307',
    downloadLink: '/download_file/1307',
    invoicePdfUrl: 's3://newcompany-documents/contracts/1441/Contract_Invoice_612522.pdf',
  })
})

it('keeps invoice and package attachment references separate in the same message', () => {
  const invoicePDFurl = 's3://newcompany-documents/contracts/1441/Contract_Invoice_612522.pdf'
  const filePath = 's3://newcompany-documents/contracts/1441/contract_package.pdf'
  const invoiceAttachmentUrl = getContractInvoiceAttachmentUrl(
    invoicePDFurl,
    '/download_file/1307',
    '/file/1307',
  )
  const packageAttachmentUrl = getContractPackageAttachmentUrl(
    filePath,
    '/file/1308',
    '/download_file/1308',
  )
  expect(
    [
      formatAttachmentReference('Invoice.pdf', invoiceAttachmentUrl),
      formatAttachmentReference('Package.pdf', packageAttachmentUrl),
    ].join(', '),
  ).toBe(`Invoice.pdf<${invoicePDFurl}>, Package.pdf<${filePath}>`)
  expect(getContractInvoiceAttachmentUrl(undefined, '/download_file/1307', '/file/1307')).toBe(
    '/download_file/1307',
  )
})
