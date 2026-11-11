import { useState } from 'react'
import { useUser } from '@/context/UserContext'
import { uploadApplicationFile } from '@/features/applications/api'
import { formatEmailAttachments, readUploadedEmailAttachment } from '@/features/applications/lib/emailAttachmentUpload'
import type { UploadedEmailAttachment } from '@/features/applications/lib/emailAttachmentUpload'
import { assertKnownEmailAttachmentSize } from '@/shared/email/attachmentSizeValidation'

type Params = {
  applicationId?: string | number | null
  taskInstanceId?: string | number | null
  /** Stored with the uploaded file (WF_File description). */
  description: string
  /** When this changes (e.g. the drawer reopens or the application changes) the list starts empty. */
  resetKey: string
}

/**
 * Files the user adds to an outgoing email. Each file is uploaded to the application's files through
 * `/upload_files`; the returned references are sent in the message's `Attachments`.
 */
export function useEmailAttachmentUploads({ applicationId, taskInstanceId, description, resetKey }: Params) {
  const { token } = useUser()
  const [state, setState] = useState<{ key: string; items: UploadedEmailAttachment[] }>({ key: resetKey, items: [] })
  const [isUploading, setIsUploading] = useState(false)
  // Reset while rendering when the key changes (closing counts too, so a reopened drawer starts
  // empty). React's "adjust state when a prop changes" pattern; no effect needed.
  if (state.key !== resetKey) setState({ key: resetKey, items: [] })
  const attachments = state.key === resetKey ? state.items : []

  const upload = async (files: FileList | File[]) => {
    const selected = Array.from(files).filter((file) => file.size > 0)
    if (selected.length === 0) return
    if (applicationId === null || applicationId === undefined || String(applicationId).trim() === '') {
      throw new Error('Application id is required before uploading an attachment.')
    }
    const existingSize = attachments.reduce((total, item) => total + item.sizeBytes, 0)
    assertKnownEmailAttachmentSize(existingSize + selected.reduce((total, file) => total + file.size, 0))

    setIsUploading(true)
    try {
      const uploaded = await Promise.all(
        selected.map(async (file) =>
          readUploadedEmailAttachment(
            await uploadApplicationFile({
              file,
              applicationId,
              taskInstanceID: taskInstanceId ?? null,
              description,
              token: token ?? undefined,
            }),
            file,
          ),
        ),
      )
      setState((current) => ({
        key: resetKey,
        items: [...(current.key === resetKey ? current.items : []), ...uploaded],
      }))
    } finally {
      setIsUploading(false)
    }
  }

  const remove = (index: number) =>
    setState((current) => ({
      key: resetKey,
      items: (current.key === resetKey ? current.items : []).filter((_, itemIndex) => itemIndex !== index),
    }))

  return {
    attachments,
    /** The value for WFApplicationMessage `Attachments`. */
    attachmentsValue: formatEmailAttachments(attachments),
    isUploading,
    upload,
    remove,
  }
}
