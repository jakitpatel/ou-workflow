import { Check, Pencil, Trash2, X } from 'lucide-react'
import type { useScheduleProductActions } from '../hooks/useScheduleProductActions'
import type { ScheduleBProductRow } from '../hooks/useScheduleBProducts'

export function ScheduleProductActionButtons({ row, actions, onDelete }: {
  row: ScheduleBProductRow
  actions: ReturnType<typeof useScheduleProductActions>
  /** Opens a delete confirmation; deleting straight from the row is irreversible. */
  onDelete: () => void
}) {
  const editing = actions.editingId === row.productId
  const button = (label: string, onClick: () => void, icon: React.ReactNode) => (
    <button type="button" title={label} aria-label={label} onClick={onClick}
      disabled={!row.productId || actions.pending}
      className="rounded p-1 text-blue-700 hover:bg-blue-50 disabled:opacity-40">{icon}</button>
  )
  return <>
    {editing ? <>
      {button('Save product', actions.save, <Check className="h-4 w-4" />)}
      {button('Cancel editing', actions.cancel, <X className="h-4 w-4" />)}
    </> : button('Edit product', () => actions.start(row), <Pencil className="h-4 w-4" />)}
    {button('Delete product', onDelete, <Trash2 className="h-4 w-4" />)}
  </>
}
