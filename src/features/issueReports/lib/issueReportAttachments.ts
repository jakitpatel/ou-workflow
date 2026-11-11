import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from '../model/issueReport'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'])
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.log']

const isAllowedFile = (file: File) => {
  if (ALLOWED_TYPES.has(file.type)) return true
  const name = file.name.toLowerCase()
  return !file.type && ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

const formatMb = (bytes: number) => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`

export type AttachmentSelection = {
  files: File[]
  errors: string[]
}

/**
 * Adds newly picked files to the current selection: skips duplicates (same name and size) and
 * rejects unsupported types, files over the size limit, and files beyond the count limit.
 */
export function addIssueAttachments(current: File[], picked: Iterable<File>): AttachmentSelection {
  const files = [...current]
  const errors: string[] = []

  for (const file of picked) {
    if (files.some((existing) => existing.name === file.name && existing.size === file.size)) continue
    if (!isAllowedFile(file)) {
      errors.push(`${file.name}: only images, PDF and text files can be attached.`)
    } else if (file.size > MAX_ATTACHMENT_BYTES) {
      errors.push(`${file.name}: larger than ${formatMb(MAX_ATTACHMENT_BYTES)}.`)
    } else if (file.size === 0) {
      errors.push(`${file.name}: the file is empty.`)
    } else if (files.length >= MAX_ATTACHMENTS) {
      errors.push(`${file.name}: you can attach up to ${MAX_ATTACHMENTS} files.`)
    } else {
      files.push(file)
    }
  }

  return { files, errors }
}

export { formatMb as formatAttachmentSize }
