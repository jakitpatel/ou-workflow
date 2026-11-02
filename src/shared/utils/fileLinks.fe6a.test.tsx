import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), error: vi.fn(), base: 'https://api.example.test' }))
vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: mocks.fetch, resolveApiBaseUrl: () => mocks.base }))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
import { openFileLink, SignedFileFrame, SignedFileLink, signedFileUrl } from './fileLinks'

// fe6a NEW-1 (embedded documents use signed links), NEW-11 (downloads open no tab), F15 (empty 2xx).
const nowSeconds = () => Math.floor(Date.now() / 1000)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.base = 'https://api.example.test'
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SignedFileFrame (NEW-1)', () => {
  it('never loads the unsigned URL: it signs first, then frames the signed link', async () => {
    const exp = nowSeconds() + 300
    mocks.fetch.mockResolvedValue({ url: `/file/26?link_exp=${exp}&link_sig=s1` })
    const { container } = render(<SignedFileFrame src="/file/26" title="Bichel document" />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Loading document')
    const frame = await screen.findByTitle('Bichel document')
    expect(frame.getAttribute('src')).toBe(`https://api.example.test/file/26?link_exp=${exp}&link_sig=s1`)
    expect(mocks.fetch).toHaveBeenCalledWith({ path: '/file_link', method: 'POST', body: { path: '/file/26' } })
  })

  it('shows the refusal and re-signs on "Reload preview"', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('Not authorized on application 1356'))
    render(<SignedFileFrame src="/file/26" title="Bichel document" />)
    expect((await screen.findByRole('alert')).textContent).toContain('Not authorized on application 1356')
    mocks.fetch.mockResolvedValue({ url: '/file/26?link_sig=s2' })
    fireEvent.click(screen.getByRole('button', { name: 'Reload preview' }))
    expect((await screen.findByTitle('Bichel document')).getAttribute('src')).toBe('https://api.example.test/file/26?link_sig=s2')
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
  })

  it('a refused link rendered in the frame (expired / revoked) shows the reason and offers a reload', async () => {
    mocks.fetch.mockResolvedValue({ url: '/file/26?link_sig=s1' })
    render(<SignedFileFrame src="/file/26" title="Bichel document" />)
    const frame = (await screen.findByTitle('Bichel document')) as HTMLIFrameElement
    // A same-origin frame (the local API proxy) whose document is the API's JSON refusal.
    Object.defineProperty(frame, 'contentDocument', {
      value: { body: { innerText: '{\n  "error": "Invalid or expired file link"\n}' } },
    })
    fireEvent.load(frame)
    expect((await screen.findByRole('alert')).textContent).toContain('Invalid or expired file link')
    expect(screen.getByRole('button', { name: 'Reload preview' })).toBeTruthy()
  })

  it('re-signs before expiry while the frame has not loaded, and not after it loaded', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mocks.fetch
      .mockResolvedValueOnce({ url: `/file/26?link_exp=${nowSeconds() + 60}&link_sig=first` })
      .mockResolvedValue({ url: `/file/26?link_exp=${nowSeconds() + 400}&link_sig=second` })
    render(<SignedFileFrame src="/file/26" title="Bichel document" />)
    await screen.findByTitle('Bichel document')
    await act(async () => {
      vi.advanceTimersByTime(31_000)
    })
    await waitFor(() => expect(screen.getByTitle('Bichel document').getAttribute('src')).toContain('link_sig=second'))
    fireEvent.load(screen.getByTitle('Bichel document'))
    await act(async () => {
      vi.advanceTimersByTime(400_000)
    })
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
  })
})

describe('downloads (NEW-11)', () => {
  const stubDownload = () => {
    const open = vi.spyOn(window, 'open')
    const fetchFile = vi.fn().mockResolvedValue(
      new Response('bytes', { headers: { 'content-disposition': 'attachment; filename="FIX-fe6a doc.txt"' } }),
    )
    vi.stubGlobal('fetch', fetchFile)
    const createObjectURL = vi.fn(() => 'blob:fe6a')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
    return { open, fetchFile, clicked }
  }

  it('a download route is saved in place: no about:blank tab is opened', async () => {
    const { open, fetchFile, clicked } = stubDownload()
    mocks.fetch.mockResolvedValue({ url: '/download_file/26?link_sig=signed' })
    await openFileLink('https://api.example.test/download_file/26')
    expect(open).not.toHaveBeenCalled()
    expect(fetchFile).toHaveBeenCalledWith('https://api.example.test/download_file/26?link_sig=signed')
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('FIX-fe6a doc.txt')
    expect(clicked[0].href).toBe('blob:fe6a')
    vi.unstubAllGlobals()
  })

  it('a link with a download attribute downloads instead of opening a tab', async () => {
    const { open, clicked } = stubDownload()
    mocks.fetch.mockResolvedValue({ url: '/file/7?link_sig=signed' })
    render(<SignedFileLink href="/file/7" download="invoice.pdf">Download</SignedFileLink>)
    fireEvent.click(screen.getByRole('link', { name: 'Download' }))
    await waitFor(() => expect(clicked).toHaveLength(1))
    expect(clicked[0].download).toBe('invoice.pdf')
    expect(open).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('a failed download shows the reason and saves nothing', async () => {
    const { clicked, fetchFile } = stubDownload()
    fetchFile.mockResolvedValue(new Response('{"error":"Invalid or expired file link"}', { status: 403 }))
    mocks.fetch.mockResolvedValue({ url: '/download_file/26?link_sig=signed' })
    await openFileLink('/download_file/26')
    expect(clicked).toHaveLength(0)
    expect(mocks.error).toHaveBeenCalledWith('Unable to download document (403)')
    vi.unstubAllGlobals()
  })
})

describe('F15: an empty 2xx from /file_link is not a link', () => {
  it('rejects instead of throwing a TypeError', async () => {
    mocks.fetch.mockResolvedValue(undefined)
    await expect(signedFileUrl('/file/1')).rejects.toThrow('Invalid document link response')
  })
})
