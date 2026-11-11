import { formatAttachmentReference } from './contractAttachments'

/** A file the user uploaded to attach to an outgoing WFApplicationMessage email. */
export type UploadedEmailAttachment = {
  fileName: string
  fileUrl: string
  sizeBytes: number
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const readString = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim()
  }
  return ''
}

const FILE_URL_KEYS = ['file_path', 'FilePath', 'filePath', 'file_url', 'fileUrl', 'link', 'url', 'downloadUrl', 'download_url', 'Location']
const FILE_NAME_KEYS = ['FileName', 'fileName', 'filename', 'name', 'originalName']

/**
 * Reads the stored file's reference from an `/upload_files` response ({ message, file_path, link },
 * optionally wrapped in `data` / `data.attributes`). Throws when no reference was returned, because
 * the email service could not attach the file.
 */
export function readUploadedEmailAttachment(response: unknown, file: File): UploadedEmailAttachment {
  const data = asRecord(asRecord(response).data ?? response)
  const source = { ...asRecord(response), ...data, ...asRecord(data.attributes) }
  const fileUrl = readString(source, FILE_URL_KEYS)
  if (!fileUrl) throw new Error(`Upload completed but no file URL was returned for ${file.name}.`)
  return {
    fileName: readString(source, FILE_NAME_KEYS) || file.name,
    fileUrl,
    sizeBytes: file.size,
  }
}

/** The WFApplicationMessage `Attachments` value: "name<url>, name<url>", or null when there are none. */
export function formatEmailAttachments(attachments: UploadedEmailAttachment[]): string | null {
  return attachments.map((item) => formatAttachmentReference(item.fileName, item.fileUrl)).join(', ') || null
}
