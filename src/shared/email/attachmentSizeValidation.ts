const DEFAULT_MAX_EMAIL_ATTACHMENT_SIZE_MB = 25

const configuredMaxSizeMb = Number(import.meta.env.VITE_MAX_EMAIL_ATTACHMENT_SIZE_MB)

export const MAX_EMAIL_ATTACHMENT_SIZE_MB =
  Number.isFinite(configuredMaxSizeMb) && configuredMaxSizeMb > 0
    ? configuredMaxSizeMb
    : DEFAULT_MAX_EMAIL_ATTACHMENT_SIZE_MB

export const MAX_EMAIL_ATTACHMENT_SIZE_BYTES = MAX_EMAIL_ATTACHMENT_SIZE_MB * 1024 * 1024

const extractAttachmentUrls = (attachments?: string) => {
  if (!attachments?.trim()) return []

  const references = attachments.split(', ').map((reference) => reference.trim())
  const urls = references.flatMap((reference) => {
    const enclosedReference = reference.match(/<([^>]+)>/)?.[1]?.trim()
    const fileReference = enclosedReference || reference

    // S3 object references are resolved by WFApplicationMessage on the server and are not
    // directly accessible to the browser for a Content-Length check.
    if (/^s3:\/\/\S+$/i.test(fileReference)) return []

    const httpUrl = fileReference.match(/https?:\/\/\S+/i)?.[0]
    if (!httpUrl) {
      throw new Error(
        `Unable to verify attachment size because no file URL was provided: ${reference}`,
      )
    }
    return [httpUrl]
  })

  return [...new Set(urls)]
}

const getRemoteFileSize = async (url: string) => {
  let response: Response
  try {
    response = await fetch(url, { method: 'HEAD' })
  } catch {
    throw new Error(`Unable to verify attachment size: ${url}`)
  }

  if (!response.ok) throw new Error(`Unable to verify attachment size: ${url}`)

  const size = Number(response.headers.get('content-length'))
  if (!Number.isFinite(size) || size < 0) {
    throw new Error(`Attachment size was not provided by the file server: ${url}`)
  }

  return size
}

export const assertEmailAttachmentSize = async (attachments?: string) => {
  const urls = extractAttachmentUrls(attachments)
  if (urls.length === 0) return 0

  const sizes = await Promise.all(urls.map(getRemoteFileSize))
  const totalSize = sizes.reduce((total, size) => total + size, 0)
  assertKnownEmailAttachmentSize(totalSize)
  return totalSize
}

export const assertKnownEmailAttachmentSize = (totalSize: number) => {
  if (totalSize <= MAX_EMAIL_ATTACHMENT_SIZE_BYTES) return

  const totalSizeMb = totalSize / 1024 / 1024
  throw new Error(
    `Total attachment size is ${totalSizeMb.toFixed(2)} MB. The maximum allowed size is ${MAX_EMAIL_ATTACHMENT_SIZE_MB} MB.`,
  )
}
