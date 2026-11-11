import { useId, useRef } from 'react'
import { Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import type { UploadedEmailAttachment } from '@/features/applications/lib/emailAttachmentUpload'
import { MAX_EMAIL_ATTACHMENT_SIZE_MB } from '@/shared/email/attachmentSizeValidation'

type Props = {
  attachments: UploadedEmailAttachment[]
  isUploading: boolean
  /** Hides add/remove, e.g. once the email has been sent. */
  readOnly?: boolean
  disabled?: boolean
  onUpload: (files: File[]) => Promise<void>
  onRemove: (index: number) => void
}

export function EmailAttachmentsField({ attachments, isUploading, readOnly = false, disabled = false, onUpload, onRemove }: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : []
    if (inputRef.current) inputRef.current.value = ''
    if (files.length === 0) return
    try {
      await onUpload(files)
      toast.success(files.length === 1 ? 'Attachment added' : 'Attachments added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload attachment')
    }
  }

  if (readOnly && attachments.length === 0) return null

  return (
    <div className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Attachments</span>
      {attachments.length > 0 ? (
        <ul className="mt-1 space-y-1" aria-label="Email attachments">
          {attachments.map((attachment, index) => (
            <li key={`${attachment.fileUrl}-${index}`} className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700">
              <Paperclip className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={disabled || isUploading}
                  className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Remove ${attachment.fileName}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!readOnly ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            multiple
            className="sr-only"
            aria-label="Add email attachments"
            disabled={disabled || isUploading}
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            {isUploading ? 'Uploading...' : 'Add files'}
          </button>
          <span className="text-xs text-gray-500">(maximum {MAX_EMAIL_ATTACHMENT_SIZE_MB} MB total)</span>
        </div>
      ) : null}
    </div>
  )
}
