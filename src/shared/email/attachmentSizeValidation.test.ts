import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertEmailAttachmentSize,
  MAX_EMAIL_ATTACHMENT_SIZE_BYTES,
} from './attachmentSizeValidation'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('assertEmailAttachmentSize', () => {
  it('leaves S3 attachments with spaces and parentheses for the email server to resolve', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      assertEmailAttachmentSize(
        'product list sjnh fr_8402 (1).docx<s3://newcompany-documents/uploads/1449/product list sjnh fr_8402 (1).docx>',
      ),
    ).resolves.toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still checks the invoice URL when an S3 attachment contains spaces', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-length': '1024' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      assertEmailAttachmentSize(
        'Invoice_123.pdf<https://example.com/invoice.pdf>, product list.docx<s3://newcompany-documents/uploads/1449/product list.docx>',
      ),
    ).resolves.toBe(1024)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://example.com/invoice.pdf', {
      method: 'HEAD',
    })
  })

  it('continues to reject oversized HTTP attachments', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-length': String(MAX_EMAIL_ATTACHMENT_SIZE_BYTES + 1),
        }),
      }),
    )

    await expect(
      assertEmailAttachmentSize('Invoice.pdf<https://example.com/invoice.pdf>'),
    ).rejects.toThrow('maximum allowed size')
  })

  it('continues to reject attachments without a supported file reference', async () => {
    await expect(assertEmailAttachmentSize('product list.docx')).rejects.toThrow(
      'no file URL was provided',
    )
  })
})
