import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquarePlus, X } from 'lucide-react'
import { toast } from 'sonner'

export type CreateTaskNotePayload = {
  text: string
  isPrivate: boolean
}

type Props = {
  open: boolean
  taskName: string
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onSubmit: (payload: CreateTaskNotePayload) => Promise<void> | void
}

export function CreateTaskNoteModal({
  open,
  taskName,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) {
      setText('')
      setIsPrivate(false)
      setLocalError('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isSubmitting, onClose, open])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSubmitting && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [isSubmitting, onClose],
  )

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      setLocalError('Note text is required.')
      return
    }

    setLocalError('')
    try {
      await onSubmit({
        text: text.trim(),
        isPrivate,
      })
      toast.success('Note created successfully')
    } catch (err: any) {
      const message =
        err?.details?.status ||
        err?.details?.message ||
        err?.message ||
        error ||
        'Failed to create note'
      setLocalError(message)
      toast.error(message)
    }
  }, [error, isPrivate, onSubmit, text])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fadeIn"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl animate-scaleIn"
      >
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-3 top-3 text-gray-600 hover:text-gray-800 disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={22} />
        </button>

        <h3 className="mb-2 text-lg font-semibold text-gray-900">Create Note</h3>
        <p className="mb-4 text-sm text-gray-700">
          Task: <span className="font-medium">{taskName}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Text</label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setLocalError('')
              }}
              disabled={isSubmitting}
              placeholder="Enter note..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is-private-note"
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is-private-note" className="text-sm text-gray-700">
              Is Private
            </label>
          </div>

          {(localError || error) && (
            <p className="text-xs text-red-600">{localError || error}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
            Create Note
          </button>
        </div>
      </div>
    </div>
  )
}
