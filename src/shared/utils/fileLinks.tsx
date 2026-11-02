import { useEffect, useRef, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react'
import { toast } from 'sonner'
import { fetchWithAuth, resolveApiBaseUrl } from '@/shared/api/httpClient'

const fileRoute = /^\/(?:file|download_file|submission_file|download_submission_file)\/\d+\/?$|^\/files\/\d+\/[^/]+$/

/** Recognize only our API's document routes; never send credentials to an external origin. */
export function fileLinkPath(value: string): string | null {
  if (value.startsWith('s3://')) return value
  try {
    const api = new URL(resolveApiBaseUrl(), window.location.origin)
    const url = new URL(value, api.origin)
    const loopback = (host: string) => ['localhost', '127.0.0.1'].includes(host)
    if (![api.origin, window.location.origin].includes(url.origin) &&
        !(loopback(url.hostname) && loopback(window.location.hostname))) return null
    const prefix = api.pathname.replace(/\/$/, '')
    const path = prefix && url.pathname.startsWith(prefix + '/') ? url.pathname.slice(prefix.length) : url.pathname
    return fileRoute.test(path) ? path : null
  } catch { return null }
}

export async function signedFileUrl(value: string): Promise<string> {
  const path = fileLinkPath(value)
  if (!path) {
    const url = new URL(value, window.location.origin)
    if (!['https:', 'http:', 'blob:'].includes(url.protocol)) throw new Error('Unsupported document link')
    return url.href
  }
  // Always refresh at use time; persisted links and open drawers may outlive the five-minute TTL.
  const base = resolveApiBaseUrl().replace(/\/$/, '')
  const apiRoot = base.replace(/\/api$/, '')
  const data = await fetchWithAuth<{ url: string }>({ path: `${base.endsWith('/api') ? '/..' : ''}/file_link`,
    method: 'POST', body: { path } })
  // An empty 2xx is not a link (F15): never treat it as one.
  if (!data || typeof data.url !== 'string' || !data.url.startsWith('/') || !fileRoute.test(data.url.split('?')[0])) {
    throw new Error('Invalid document link response')
  }
  const url = new URL(`${apiRoot}${data.url}`, window.location.origin)
  if (url.origin !== new URL(apiRoot || '/', window.location.origin).origin) {
    throw new Error('Invalid document link response')
  }
  return url.href
}

const downloadRoute = /^\/(?:download_file|download_submission_file)\//

/** Open synchronously to preserve popup permissions, then navigate only after authorization succeeds. */
export async function openFileLink(value: string): Promise<void> {
  // Download routes answer with an attachment: a tab opened for one would stay on about:blank (NEW-11).
  if (downloadRoute.test(fileLinkPath(value) ?? '')) return downloadFileLink(value)
  const popup = window.open('about:blank', '_blank')
  if (popup) popup.opener = null
  try {
    const url = await signedFileUrl(value)
    if (!popup) throw new Error('Allow popups to open this document')
    popup.location.replace(url)
  } catch (error) {
    popup?.close()
    toast.error(error instanceof Error ? error.message : 'Unable to open document')
  }
}

const downloadName = (value: string, fileName?: string) => {
  if (fileName?.trim()) return fileName.trim()
  try {
    const last = new URL(value, window.location.origin).pathname.split('/').filter(Boolean).pop() ?? ''
    return /^\d+$/.test(last) ? 'document' : decodeURIComponent(last)
  } catch {
    return 'document'
  }
}

const dispositionName = (header: string | null) => {
  const match = header?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
  try {
    return match ? decodeURIComponent((match[1] ?? match[2]).trim()) : undefined
  } catch {
    return match?.[2]?.trim()
  }
}

/**
 * Downloads without opening a tab (NEW-11): an attachment response leaves a tab opened for it on
 * about:blank. The signed URL is fetched and saved through a temporary object URL.
 */
export async function downloadFileLink(value: string, fileName?: string): Promise<void> {
  try {
    const response = await fetch(await signedFileUrl(value))
    if (!response.ok) throw new Error(`Unable to download document (${response.status})`)
    const objectUrl = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = downloadName(value, fileName || dispositionName(response.headers.get('content-disposition')))
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Unable to download document')
  }
}

export function SignedFileLink({ href, onClick, onAuxClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href || !fileLinkPath(href)) return
    event.preventDefault()
    if (props.download !== undefined && props.download !== false) {
      void downloadFileLink(href, typeof props.download === 'string' ? props.download : undefined)
      return
    }
    void openFileLink(href)
  }
  return <a {...props} href={href} referrerPolicy="no-referrer" onClick={event => {
    onClick?.(event)
    if (!event.defaultPrevented) open(event)
  }} onAuxClick={event => {
    onAuxClick?.(event)
    if (!event.defaultPrevented && event.button === 1) open(event)
  }} />
}

/** Attachment references are stored as comma-separated Name<URL> strings in message history. */
export function MessageAttachmentLinks({ text }: { text: string }) {
  return <span className="inline-flex flex-wrap gap-2">{text.split(/,\s*/).map((entry, index) => {
    const match = entry.match(/^(.*?)<([^>]+)>$/)
    const href = match ? match[2].trim() : entry.trim()
    const name = match ? match[1].trim() : entry.trim()
    return fileLinkPath(href)
      ? <SignedFileLink key={index} href={href} target="_blank" rel="noreferrer" className="text-blue-700 underline">{name || 'Document'}</SignedFileLink>
      : <span key={index}>{entry}</span>
  })}</span>
}

// Re-sign this long before the link's expiry if the frame has not loaded yet.
const RESIGN_MARGIN_MS = 30_000

const linkExpiryMs = (url: string) => {
  try {
    const expiry = Number(new URL(url).searchParams.get('link_exp'))
    return Number.isFinite(expiry) && expiry > 0 ? expiry * 1000 : null
  } catch {
    return null
  }
}

/**
 * Embeds an API document (NEW-1): `/file/<id>` needs authentication, which an iframe cannot send,
 * so the frame loads a short-lived signed link. It is signed when shown, re-signed if it would
 * expire before the frame loaded, and re-signed on "Reload" after a load error.
 */
export function SignedFileFrame({ src, title, className }: { src: string; title: string; className?: string }) {
  const [signed, setSigned] = useState<{ src: string; url?: string; error?: string }>({ src })
  const [attempt, setAttempt] = useState(0)
  const loadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    loadedRef.current = false
    const sign = () => {
      signedFileUrl(src).then(
        (url) => {
          if (cancelled) return
          setSigned({ src, url })
          const expiry = linkExpiryMs(url)
          if (expiry !== null) {
            timer = window.setTimeout(() => {
              if (!loadedRef.current) sign()
            }, Math.min(Math.max(expiry - Date.now() - RESIGN_MARGIN_MS, 1_000), 2 ** 31 - 1))
          }
        },
        (error: unknown) => {
          if (!cancelled) setSigned({ src, error: error instanceof Error ? error.message : 'Unable to load document' })
        },
      )
    }
    sign()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [attempt, src])

  const current = signed.src === src ? signed : { src }
  const onLoad = (event: { currentTarget: HTMLIFrameElement }) => {
    loadedRef.current = true
    // A same-origin refusal (expired or revoked link) renders the API's JSON error in the frame.
    try {
      const text = event.currentTarget.contentDocument?.body?.innerText?.trim() ?? ''
      const message = text.startsWith('{') ? (JSON.parse(text) as { error?: unknown }).error : undefined
      if (typeof message === 'string' && message) setSigned({ src, error: message })
    } catch {
      // Cross-origin document (the normal case for a real file): nothing to inspect.
    }
  }

  if (current.error) {
    return (
      <div role="alert" className={`flex flex-col items-center justify-center gap-3 p-6 text-sm text-red-800 ${className ?? ''}`}>
        <p>The document preview could not be loaded: {current.error}</p>
        <button
          type="button"
          onClick={() => {
            setSigned({ src })
            setAttempt((value) => value + 1)
          }}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-800 hover:bg-red-50"
        >
          Reload preview
        </button>
      </div>
    )
  }
  if (!current.url) {
    return (
      <div role="status" className={`flex items-center justify-center p-6 text-sm text-gray-500 ${className ?? ''}`}>
        Loading document…
      </div>
    )
  }
  return <iframe key={current.url} title={title} src={current.url} onLoad={onLoad} referrerPolicy="no-referrer" className={className} />
}
