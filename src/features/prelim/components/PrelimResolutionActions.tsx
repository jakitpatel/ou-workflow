import { Check, Edit, Plus } from 'lucide-react'
import type { Match } from '@/features/prelim/model/resolution'

type Props = {
  selectedMatch: Match | null
  onCreateNew: () => void | Promise<void>
  canCreate?: boolean
  canEdit?: boolean
  canConfirm?: boolean
  onConfirmEdit: () => void
  onConfirmMatch: () => void | Promise<void>
  onCancelEdit: () => void
  onSaveAndConfirm: () => void | Promise<void>
  isActionable: boolean
  isCreatingNew: boolean
  isSubmitting: boolean
  isEditMode: boolean
}

export function PrelimResolutionActions({
  selectedMatch,
  onCreateNew,
  canCreate: canCreateOverride,
  canEdit: canEditOverride,
  canConfirm: canConfirmOverride,
  onConfirmEdit,
  onConfirmMatch,
  onCancelEdit,
  onSaveAndConfirm,
  isActionable,
  isCreatingNew,
  isSubmitting,
  isEditMode,
}: Props) {
  const actionReady = !!selectedMatch && !isCreatingNew && !isSubmitting
  const canConfirm = (canConfirmOverride ?? isActionable) && actionReady
  const canEdit = (canEditOverride ?? isActionable) && actionReady
  const canCreate =
    (canCreateOverride ?? isActionable) && !isCreatingNew && !isSubmitting

  return (
    <div className="flex justify-end gap-2 border-t border-gray-100 bg-[#f8fafc] px-4 py-2.5">
      {isEditMode ? (
        <>
          <button
            onClick={onCancelEdit}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
              !isSubmitting
                ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            }`}
          >
            Cancel
          </button>

          <button
            onClick={onSaveAndConfirm}
            disabled={!canEdit}
            className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
              canEdit
                ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            {isSubmitting ? 'Saving...' : 'Save & Confirm'}
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onCreateNew}
            disabled={!canCreate}
            className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
              canCreate
                ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {isCreatingNew ? 'Creating...' : 'Create New'}
          </button>

          <button
            onClick={onConfirmEdit}
            disabled={!canEdit}
            className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
              canEdit
                ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            }`}
          >
            <Edit className="h-3.5 w-3.5" />
            Confirm & Edit
          </button>

          <button
            onClick={onConfirmMatch}
            disabled={!canConfirm}
            className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
              canConfirm
                ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            {isSubmitting ? 'Saving...' : 'Confirm Match'}
          </button>
        </>
      )}
    </div>
  )
}
