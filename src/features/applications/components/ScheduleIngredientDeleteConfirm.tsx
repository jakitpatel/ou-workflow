import { ModalSurface } from '@/components/ui/ModalSurface'
import { useEffect, useId, useRef, useState } from 'react'

type Props = {
  ingredientName: string
  itemLabel?: string
  scheduleName?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ScheduleIngredientDeleteConfirm({
  ingredientName,
  itemLabel = 'ingredient',
  scheduleName = 'Schedule A',
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  // `pending` arrives a render late; a synchronous flag stops a double/triple click on Delete.
  const confirmedRef = useRef(false)
  const [confirmed, setConfirmed] = useState(false)
  const busy = pending || confirmed

  useEffect(() => {
    if (!pending) {
      confirmedRef.current = false
      setConfirmed(false)
    }
  }, [pending])

  const handleConfirm = () => {
    if (confirmedRef.current || pending) return
    confirmedRef.current = true
    setConfirmed(true)
    onConfirm()
  }

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])



  return (
    <div
      className="fixed inset-0 pointer-events-auto z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <ModalSurface onClose={onCancel} label={`Delete ${itemLabel}?`} dismissible={!busy}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="text-base font-semibold text-gray-900">
          Delete {itemLabel}?
        </h3>
        <p id={descriptionId} className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{ingredientName || `This ${itemLabel}`}</span>{' '}
          will be removed from {scheduleName}.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </ModalSurface>
    </div>
  )
}
