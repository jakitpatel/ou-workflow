import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), error: vi.fn(), base: 'https://api.example.test' }))
vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: mocks.fetch, resolveApiBaseUrl: () => mocks.base }))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
import { fileLinkPath, MessageAttachmentLinks, openFileLink, SignedFileFrame, SignedFileLink, signedFileUrl } from './fileLinks'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.base = 'https://api.example.test'
})

// Signed links are rolled back: the API has no POST /file_link, so documents use their GET URLs.
describe('document links (GET /file/<id>)', () => {
  it('recognizes the five routes without trusting external origins or unsafe schemes', () => {
    for (const path of ['/file/1', '/download_file/1', '/submission_file/1', '/download_submission_file/1/', '/files/1/name.pdf']) {
      expect(fileLinkPath(`https://api.example.test${path}`)).toBe(path)
    }
    expect(fileLinkPath('https://external.test/file/1')).toBeNull()
    expect(fileLinkPath('javascript:alert(1)')).toBeNull()
    expect(fileLinkPath('/api/WFFile')).toBeNull()
  })

  it('uses the document URL itself and never calls /file_link', async () => {
    expect(await signedFileUrl('https://api.example.test/file/1')).toBe('https://api.example.test/file/1')
    expect(await signedFileUrl('/download_file/2')).toBe(`${window.location.origin}/download_file/2`)
    await expect(signedFileUrl('javascript:alert(1)')).rejects.toThrow('Unsupported document link')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('opens the document URL in a new tab without an opener', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await openFileLink('https://api.example.test/file/1')
    expect(open).toHaveBeenCalledWith('https://api.example.test/file/1', '_blank', 'noopener,noreferrer')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('refuses unsafe links with a message instead of opening them', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await openFileLink('javascript:alert(1)')
    expect(open).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('Unsupported document link')
  })

  it('renders a plain link the browser follows by itself', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<SignedFileLink href="https://api.example.test/file/1" download="nda.pdf">NDA</SignedFileLink>)
    const link = screen.getByRole('link', { name: 'NDA' })
    expect(link.getAttribute('href')).toBe('https://api.example.test/file/1')
    expect(link.getAttribute('download')).toBe('nda.pdf')
    fireEvent.click(link)
    expect(open).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('frames the document URL directly', () => {
    render(<SignedFileFrame title="Bichel document" src="https://api.example.test/file/9" />)
    expect(screen.getByTitle('Bichel document').getAttribute('src')).toBe('https://api.example.test/file/9')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('links registered attachments and keeps unknown references as text', () => {
    render(<MessageAttachmentLinks text="Spec<https://api.example.test/file/3>, notes.txt" />)
    expect(screen.getByRole('link', { name: 'Spec' }).getAttribute('href')).toBe('https://api.example.test/file/3')
    expect(screen.getByText('notes.txt')).toBeTruthy()
  })
})
