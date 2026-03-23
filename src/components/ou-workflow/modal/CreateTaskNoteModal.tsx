import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquarePlus, X } from 'lucide-react'

type RecipientType = 'MYSELF' | 'ROLE'

export type CreateTaskNotePayload = {
  toType: RecipientType
  toRole?: string
  text: string
  taskEvent: string
}

type Props = {
  open: boolean
  taskName: string
  roleOptions: string[]
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onSubmit: (payload: CreateTaskNotePayload) => Promise<void> | void
}

export function CreateTaskNoteModal({
  open,
  taskName,
  roleOptions,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [toType, setToType] = useState<RecipientType>('MYSELF')
  const [toRole, setToRole] = useState(roleOptions[0] ?? 'LEGAL')
  const [text, setText] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) {
      setToType('MYSELF')
      setToRole(roleOptions[0] ?? 'LEGAL')
      setText('')
      setLocalError('')
    }
  }, [open, roleOptions])

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

  const recipientLabel = useMemo(
    () => (toType === 'MYSELF' ? 'myself' : toRole),
    [toRole, toType],
  )

  const taskEvent = useMemo(() => {
    if (!text.trim()) return ''
    return `Sent note to ${recipientLabel}: ${text.trim()}`
  }, [recipientLabel, text])

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
    if (toType === 'ROLE' && !toRole.trim()) {
      setLocalError('Please select a role.')
      return
    }

    setLocalError('')
    await onSubmit({
      toType,
      toRole: toType === 'ROLE' ? toRole : undefined,
      text: text.trim(),
      taskEvent,
    })
  }, [onSubmit, taskEvent, text, toRole, toType])

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
            <label className="mb-1 block text-xs font-medium text-gray-700">To whom</label>
            <select
              value={toType === 'MYSELF' ? 'MYSELF' : `ROLE:${toRole}`}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'MYSELF') {
                  setToType('MYSELF')
                } else {
                  setToType('ROLE')
                  setToRole(value.replace('ROLE:', ''))
                }
                setLocalError('')
              }}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              <option value="MYSELF">Myself</option>
              {roleOptions.map((role) => (
                <option key={role} value={`ROLE:${role}`}>
                  {role}
                </option>
              ))}
            </select>
          </div>

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

          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Task event: {taskEvent || '-'}
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
