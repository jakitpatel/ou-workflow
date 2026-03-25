import { X } from 'lucide-react'
import type { TaskNote } from '@/types/application'

export type NoteTab = 'private' | 'public'

type Props = {
  open: boolean
  applicantCompany?: string
  applicationId?: number | null
  taskName: string
  activeTab: NoteTab
  privateNotes: TaskNote[]
  publicNotes: TaskNote[]
  loadingPrivate: boolean
  loadingPublic: boolean
  composeText: string
  composePrivate: boolean
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onTabChange: (tab: NoteTab) => void
  onComposeTextChange: (text: string) => void
  onComposePrivateChange: (value: boolean) => void
  onSubmit: () => void
}

const normalizeNoteValue = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const getNoteText = (note: TaskNote): string => {
  const directCandidates = [
    note.note,
    note.text,
    note.details,
    (note as any)?.message,
    (note as any)?.content,
    (note as any)?.note1,
  ]

  for (const item of directCandidates) {
    const value = normalizeNoteValue(item)
    if (value) return value
  }

  const dynamicNoteKey = Object.keys(note).find((key) => /^note\d*$/i.test(key))
  if (dynamicNoteKey) {
    const value = normalizeNoteValue((note as any)[dynamicNoteKey])
    if (value) return value
  }

  return '-'
}

const getMetaValue = (note: TaskNote, ...keys: string[]): string => {
  for (const key of keys) {
    const value = normalizeNoteValue((note as any)?.[key])
    if (value) return value
  }
  return '-'
}

export function TaskNotesDrawer({
  open,
  applicantCompany,
  applicationId,
  taskName,
  activeTab,
  privateNotes,
  publicNotes,
  loadingPrivate,
  loadingPublic,
  composeText,
  composePrivate,
  isSubmitting,
  error,
  onClose,
  onTabChange,
  onComposeTextChange,
  onComposePrivateChange,
  onSubmit,
}: Props) {
  if (!open) return null

  const notes = activeTab === 'private' ? privateNotes : publicNotes
  const isLoading = activeTab === 'private' ? loadingPrivate : loadingPublic
  const canSubmit = composeText.trim().length > 0 && !isSubmitting

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between bg-gray-800 px-4 py-3 text-white">
          <div>
            <h3 className="text-lg font-semibold">Task Notes</h3>
            <p className="text-xs text-gray-200">
              {applicantCompany || 'Unknown Company'}
              {applicationId ? ` · AppId: ${applicationId}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
            aria-label="Close task notes drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current Task</p>
          <p className="text-sm font-medium text-gray-900">{taskName}</p>
        </div>

        <div className="border-b border-gray-200 px-2">
          <button
            type="button"
            onClick={() => onTabChange('private')}
            className={`mr-1 rounded-t-md px-3 py-2 text-sm font-medium ${
              activeTab === 'private'
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Private Notes
            <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
              {privateNotes.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('public')}
            className={`rounded-t-md px-3 py-2 text-sm font-medium ${
              activeTab === 'public'
                ? 'border-b-2 border-emerald-600 text-emerald-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Public Notes
            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
              {publicNotes.length}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-5 text-center">
              <p className="text-sm text-gray-500">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-5 text-center">
              <p className="text-sm text-gray-500">No notes found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note, idx) => (
                <article key={idx} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-slate-600">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5">
                        From: {getMetaValue(note, 'fromUser', 'from_user')}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5">
                        To: {getMetaValue(note, 'toUser', 'to_user')}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {getMetaValue(note, 'createdDate', 'created_date')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-900">{getNoteText(note)}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-4">
          <div className="mb-1 text-sm font-semibold text-gray-900">Create Note</div>
          <textarea
            value={composeText}
            onChange={(e) => onComposeTextChange(e.target.value)}
            className="min-h-[84px] w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder={`Add a ${composePrivate ? 'private' : 'public'} note...`}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={composePrivate}
                onChange={(e) => onComposePrivateChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {composePrivate ? 'Private note' : 'Public note'}
            </label>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Note'}
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
