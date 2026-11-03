import type { AnchorHTMLAttributes } from 'react'
import { toast } from 'sonner'
import { resolveApiBaseUrl } from '@/shared/api/httpClient'

/*
 * Signed file links are rolled back (2026-11-02): the API does not support POST /file_link, so
 * documents open through their own GET URLs (/file/<id>, /download_file/<id>, ...) as they did
 * before commit 23817a1. The exported names are kept so the components using them need no change.
 */

const fileRoute = /^\/(?:file|download_file|submission_file|download_submission_file)\/\d+\/?$|^\/files\/\d+\/[^/]+$/

/** Recognize only our API's document routes (used to decide which attachment text is a link). */
export function fileLinkPath(value: string): string | null {
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

/** The document's own URL; only web links are allowed (no javascript:, data:, etc.). */
export async function signedFileUrl(value: string): Promise<string> {
  const url = new URL(value, window.location.origin)
  if (!['https:', 'http:', 'blob:'].includes(url.protocol)) throw new Error('Unsupported document link')
  return url.href
}

export async function openFileLink(value: string): Promise<void> {
  try {
    window.open(await signedFileUrl(value), '_blank', 'noopener,noreferrer')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Unable to open document')
  }
}

/** A plain document link: the browser opens or downloads the GET URL itself. */
export function SignedFileLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
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

/** Embeds a document by its own URL. */
export function SignedFileFrame({ src, title, className }: { src: string; title: string; className?: string }) {
  return <iframe title={title} src={src} className={className} />
}
