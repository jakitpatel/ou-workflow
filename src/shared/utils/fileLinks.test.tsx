import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), error: vi.fn(), base: 'https://api.example.test' }))
vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: mocks.fetch, resolveApiBaseUrl: () => mocks.base }))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
import { fileLinkPath, MessageAttachmentLinks, openFileLink, SignedFileLink, signedFileUrl } from './fileLinks'

beforeEach(() => { vi.clearAllMocks(); mocks.base = 'https://api.example.test' })

describe('signed document links', () => {
  it('recognizes the five routes without trusting external origins or unsafe schemes', () => {
    for (const path of ['/file/1', '/download_file/1', '/submission_file/1', '/download_submission_file/1/', '/files/1/name.pdf']) {
      expect(fileLinkPath(`https://api.example.test${path}`)).toBe(path)
    }
    expect(fileLinkPath('https://external.test/file/1')).toBeNull()
    expect(fileLinkPath('javascript:alert(1)')).toBeNull()
    expect(fileLinkPath('/api/WFFile')).toBeNull()
  })
  it('requests a fresh link through the authenticated client on every use', async () => {
    mocks.fetch.mockResolvedValue({ url: '/file/1?link_sig=signed' })
    expect(await signedFileUrl('/file/1?link_sig=old')).toBe('https://api.example.test/file/1?link_sig=signed')
    expect(mocks.fetch).toHaveBeenCalledWith({ path: '/file_link', method: 'POST', body: { path: '/file/1' } })
    await signedFileUrl('/file/1')
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
  })
  it('preserves the local API proxy prefix for signing and downloads', async () => {
    mocks.base = '/__local_api'
    mocks.fetch.mockResolvedValue({ url: '/submission_file/2?link_sig=signed' })
    expect(fileLinkPath('/__local_api/submission_file/2')).toBe('/submission_file/2')
    expect(await signedFileUrl('/submission_file/2')).toBe(`${window.location.origin}/__local_api/submission_file/2?link_sig=signed`)
    expect(mocks.fetch.mock.calls[0][0].path).toBe('/file_link')
  })
  it('never navigates the new tab when authorization fails', async () => {
    const popup = { opener: {}, close: vi.fn(), location: { replace: vi.fn() } }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    mocks.fetch.mockRejectedValue(new Error('Forbidden'))
    await openFileLink('/file/1')
    expect(popup.opener).toBeNull()
    expect(popup.close).toHaveBeenCalled()
    expect(popup.location.replace).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('Forbidden')
  })
  it('opens synchronously on click and navigates only to the signed URL', async () => {
    const popup = { opener: {}, close: vi.fn(), location: { replace: vi.fn() } }
    const open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    mocks.fetch.mockResolvedValue({ url: '/file/7?link_sig=signed' })
    render(<SignedFileLink href="/file/7" target="_blank">Certificate</SignedFileLink>)
    fireEvent.click(screen.getByRole('link', { name: 'Certificate' }))
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith('https://api.example.test/file/7?link_sig=signed'))
  })
  it('supports registered S3 message attachments and keeps unknown references as text', () => {
    render(<MessageAttachmentLinks text="Invoice</file/7>, NDA<s3://bucket/nda.pdf>, unknown" />)
    expect(screen.getByRole('link', { name: 'Invoice' }).getAttribute('href')).toBe('/file/7')
    expect(screen.getByRole('link', { name: 'NDA' }).getAttribute('href')).toBe('s3://bucket/nda.pdf')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
  it('rejects an external signing response and leaves ordinary external links alone', async () => {
    mocks.fetch.mockResolvedValue({ url: '//evil.test/file/1' })
    await expect(signedFileUrl('/file/1')).rejects.toThrow('Invalid document link response')
    expect(await signedFileUrl('https://example.test/help')).toBe('https://example.test/help')
    await expect(signedFileUrl('javascript:alert(1)')).rejects.toThrow('Unsupported document link')
  })
})
