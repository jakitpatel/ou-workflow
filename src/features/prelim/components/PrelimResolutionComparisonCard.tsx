import { Check, Edit } from 'lucide-react'
import type { ReactNode } from 'react'

export function ComparisonCard({
  title,
  badge,
  badgeClass,
  note,
  isLast = false,
  editable = false,
  isEditing = false,
  onToggleEdit,
  ignored = false,
  onToggleIgnore,
  ignoreDisabled = false,
  children,
}: {
  title: string
  badge?: string
  badgeClass?: string
  note?: string
  isLast?: boolean
  editable?: boolean
  isEditing?: boolean
  onToggleEdit?: () => void
  ignored?: boolean
  onToggleIgnore?: () => void
  ignoreDisabled?: boolean
  children: ReactNode
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${isLast ? '' : 'mb-4'}`}>
      <div className="border-y border-slate-200 bg-slate-100 px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {badge && (
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide ${badgeClass}`}
            >
              {badge}
            </span>
          )}
          <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">{title}</h4>
          {note && <span className="text-xs italic text-gray-500">{note}</span>}
        </div>
        <div className="flex items-center gap-2">
          {onToggleIgnore && (
            <button
              type="button"
              onClick={onToggleIgnore}
              disabled={ignoreDisabled}
              aria-pressed={ignored}
              aria-label={`Ignore ${badge ?? ''} ${title}`.trim()}
              title="Ignore this contact when completing the task"
              className={`inline-flex h-7 items-center gap-1 rounded border px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ignored ? 'border-amber-400 bg-amber-100 text-amber-800' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Ignore
            </button>
          )}
          {onToggleEdit && (
            <button
              type="button"
              onClick={onToggleEdit}
              disabled={!editable}
              title={isEditing ? 'Stop editing submitted values' : 'Edit submitted values'}
              aria-label={isEditing ? 'Stop editing submitted values' : 'Edit submitted values'}
              className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                editable
                  ? isEditing
                    ? 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
              }`}
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
