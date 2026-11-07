import { fileLinkPath } from '@/shared/utils/fileLinks'

export type MessageAttachment = {
  name: string
  /** Where the attachment is stored, as recorded on the message. */
  reference: string
  /** A URL the browser can open, or null when it can't be opened from the dashboard. */
  href: string | null
  /** s3:// paths are private storage paths: they need a server download route to open. */
  storage: 'link' | 's3' | 'unknown'
}

const stripQuotes = (value: string) => value.trim().replace(/^["']+|["']+$/g, '').trim()

const fileNameOf = (reference: string) => {
  const last = reference.split(/[\\/]/).filter(Boolean).pop() ?? ''
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

const toAttachment = (rawName: string, rawReference: string): MessageAttachment => {
  const reference = stripQuotes(rawReference)
  const name = stripQuotes(rawName) || fileNameOf(reference) || 'Attachment'
  if (/^s3:\/\//i.test(reference)) return { name, reference, href: null, storage: 's3' }
  if (fileLinkPath(reference) || /^https?:\/\//i.test(reference)) {
    return { name, reference, href: reference, storage: 'link' }
  }
  return { name, reference, href: null, storage: 'unknown' }
}

/**
 * Parses a message's `Attachments` text. Entries are stored as `Name<URL>` (names may be quoted
 * and contain commas), separated by commas; bare URLs or names are accepted too.
 */
export function parseMessageAttachments(text: string | null | undefined): MessageAttachment[] {
  const value = text?.trim()
  if (!value) return []

  const tagged = [...value.matchAll(/([^<>]*?)<([^<>]+)>/g)]
  if (tagged.length) {
    return tagged.map(([, name, reference]) =>
      toAttachment(name.replace(/^[\s,;]+/, '').replace(/^attachments?:?\s+/i, ''), reference),
    )
  }

  return value
    .split(/\s*[,;]\s*/)
    .filter((entry) => entry.trim())
    .map((entry) => toAttachment(/^[a-z][a-z0-9+.-]*:\/\//i.test(entry) || entry.startsWith('/') ? '' : entry, entry))
}
