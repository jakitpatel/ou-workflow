import { useState } from 'react'
import { FileText, Lock, X } from 'lucide-react'
import type { TaskNote } from '@/types/application'

export type NoteTab = 'private' | 'public'

type Props = {
  open: boolean
  applicantCompany?: string
  applicationId?: number | null
  contextType?: 'task' | 'application'
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
  onReplySubmit: (params: { parentMessageId: string; text: string }) => Promise<void>
}

type PublicNoteNode = {
  note: TaskNote
  noteId: string
  parentMessageId: string | null
  idx: number
  children: PublicNoteNode[]
}

type ReplyTone = {
  rail: string
  card: string
  badge: string
}

const REPLY_TONES: ReplyTone[] = [
  { rail: 'border-slate-200', card: 'border-slate-200 bg-white', badge: 'bg-blue-50 text-blue-700' },
  { rail: 'border-emerald-300', card: 'border-emerald-200 bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-800' },
  { rail: 'border-amber-300', card: 'border-amber-200 bg-amber-50/45', badge: 'bg-amber-100 text-amber-800' },
  { rail: 'border-cyan-300', card: 'border-cyan-200 bg-cyan-50/45', badge: 'bg-cyan-100 text-cyan-800' },
]

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

const formatNoteDate = (value: string): string => {
  const cleaned = value.trim()
  if (!cleaned || cleaned === '-') return '-'
  const date = new Date(cleaned)
  if (Number.isNaN(date.getTime())) return cleaned

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

const getInitials = (name: string): string => {
  const value = name.trim()
  if (!value || value === '-') return 'NA'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

const getNoteId = (note: TaskNote, idx: number): string => {
  const idCandidate = (note as any)?.MessageID ?? (note as any)?.messageId ?? (note as any)?.id
  if (idCandidate !== undefined && idCandidate !== null && String(idCandidate).trim()) {
    return String(idCandidate)
  }
  return `note-${idx}`
}

const getParentMessageId = (note: TaskNote): string => {
  const idCandidate = (note as any)?.MessageID ?? (note as any)?.messageId ?? (note as any)?.id
  if (idCandidate !== undefined && idCandidate !== null && String(idCandidate).trim()) {
    return String(idCandidate)
  }
  return ''
}

const getThreadParentMessageId = (note: TaskNote): string | null => {
  const candidate =
    (note as any)?.parentMessageId ??
    (note as any)?.ParentMessageId ??
    (note as any)?.parent_message_id

  if (candidate === undefined || candidate === null) return null

  const value = String(candidate).trim()
  if (!value || value === '0') return null
  return value
}

const getSortableTimestamp = (note: TaskNote): number => {
  const rawDate = getMetaValue(note, 'createdDate', 'created_date', 'SentDate', 'sentDate')
  const timestamp = rawDate && rawDate !== '-' ? new Date(rawDate).getTime() : Number.NaN
  if (!Number.isNaN(timestamp)) return timestamp

  const rawMessageId = (note as any)?.MessageID ?? (note as any)?.messageId ?? (note as any)?.id
  const numericMessageId = Number(rawMessageId)
  if (!Number.isNaN(numericMessageId)) return numericMessageId

  return Number.MAX_SAFE_INTEGER
}

const buildPublicNoteThreads = (notes: TaskNote[]): PublicNoteNode[] => {
  const nodes: PublicNoteNode[] = notes.map((note, idx) => ({
    note,
    noteId: getNoteId(note, idx),
    parentMessageId: getThreadParentMessageId(note),
    idx,
    children: [],
  }))

  const nodeById = new Map<string, PublicNoteNode>(nodes.map((node) => [node.noteId, node]))
  const roots: PublicNoteNode[] = []

  for (const node of nodes) {
    const parentId = node.parentMessageId
    if (!parentId || parentId === node.noteId) {
      roots.push(node)
      continue
    }

    const parent = nodeById.get(parentId)
    if (!parent) {
      roots.push(node)
      continue
    }

    parent.children.push(node)
  }

  const sortNodes = (list: PublicNoteNode[]) => {
    list.sort((a, b) => {
      const aTime = getSortableTimestamp(a.note)
      const bTime = getSortableTimestamp(b.note)
      if (aTime === bTime) return a.idx - b.idx
      return aTime - bTime
    })

    for (const node of list) {
      sortNodes(node.children)
    }
  }

  sortNodes(roots)
  return roots
}

export function TaskNotesDrawer({
  open,
  applicantCompany,
  applicationId,
  contextType = 'task',
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
  onReplySubmit,
}: Props) {
  const [replyOpenById, setReplyOpenById] = useState<Record<string, boolean>>({})
  const [replyTextById, setReplyTextById] = useState<Record<string, string>>({})
  const [replySubmittingById, setReplySubmittingById] = useState<Record<string, boolean>>({})

  if (!open) return null

  const notesTitle = contextType === 'application' ? 'Application Notes' : 'Task Notes'
  const currentLabel = contextType === 'application' ? 'Current Application' : 'Current Task'

  const notes = activeTab === 'private' ? privateNotes : publicNotes
  const isLoading = activeTab === 'private' ? loadingPrivate : loadingPublic
  const canSubmit = composeText.trim().length > 0 && !isSubmitting
  const publicNoteThreads = activeTab === 'public' ? buildPublicNoteThreads(publicNotes) : []

  const renderPublicNode = (node: PublicNoteNode, depth: number) => {
    const { note, noteId, children } = node
    const fromName = getMetaValue(note, 'fromUser', 'from_user', 'FromUser')
    const fromRole =
      getMetaValue(note, 'fromUserRole', 'from_user_role') !== '-'
        ? getMetaValue(note, 'fromUserRole', 'from_user_role')
        : 'NCRC'
    const createdAt = formatNoteDate(
      getMetaValue(note, 'createdDate', 'created_date', 'SentDate', 'sentDate')
    )
    const isReplyOpen = Boolean(replyOpenById[noteId])
    const isReplySubmitting = Boolean(replySubmittingById[noteId])
    const parentMessageId = getParentMessageId(note)
    const replyText = replyTextById[noteId] ?? ''
    const canReply = Boolean(parentMessageId) && replyText.trim().length > 0 && !isReplySubmitting
    const tone = REPLY_TONES[Math.min(depth, REPLY_TONES.length - 1)]

    return (
      <div key={noteId} className={depth > 0 ? `ml-4 border-l ${tone.rail} pl-3` : ''}>
        <article className={`rounded-lg border p-2.5 shadow-sm ${tone.card}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#185087] text-[11px] font-semibold text-white">
              {getInitials(fromName)}
            </div>
            <span className="text-sm font-semibold text-slate-900">{fromName}</span>
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tone.badge}`}>
              {fromRole}
            </span>
            <span className="text-[11px] text-slate-500">{createdAt}</span>
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-900">{getNoteText(note)}</p>

          {isReplyOpen ? (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="flex items-start gap-2">
                <textarea
                  className="min-h-[64px] flex-1 resize-y rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Reply..."
                  value={replyText}
                  onChange={(e) => setReplyTextById((prev) => ({ ...prev, [noteId]: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!canReply) return
                    setReplySubmittingById((prev) => ({ ...prev, [noteId]: true }))
                    try {
                      await onReplySubmit({
                        parentMessageId,
                        text: replyText.trim(),
                      })
                      setReplyTextById((prev) => ({ ...prev, [noteId]: '' }))
                      setReplyOpenById((prev) => ({ ...prev, [noteId]: false }))
                    } finally {
                      setReplySubmittingById((prev) => ({ ...prev, [noteId]: false }))
                    }
                  }}
                  disabled={!canReply}
                  className="rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReplySubmitting ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReplyOpenById((prev) => ({ ...prev, [noteId]: !Boolean(prev[noteId]) }))}
              className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Reply
            </button>
          </div>
        </article>

        {children.length > 0 ? (
          <div className="mt-2 space-y-2">{children.map((child) => renderPublicNode(child, depth + 1))}</div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between bg-gray-800 px-4 py-3 text-white">
          <div>
            <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5" />
              <span>{notesTitle}</span>
            </h3>
            <p className="text-xs text-gray-200">
              {applicantCompany || 'Unknown Company'}
              {applicationId ? ` - AppId: ${applicationId}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
            aria-label={`Close ${notesTitle.toLowerCase()} drawer`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{currentLabel}</p>
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
              {activeTab === 'private'
                ? notes.map((note, idx) => {
                    const noteId = getNoteId(note, idx)
                    const fromName = getMetaValue(note, 'fromUser', 'from_user', 'FromUser')
                    const fromRole =
                      getMetaValue(note, 'fromUserRole', 'from_user_role') !== '-'
                        ? getMetaValue(note, 'fromUserRole', 'from_user_role')
                        : 'NCRC'
                    const createdAt = formatNoteDate(
                      getMetaValue(note, 'createdDate', 'created_date', 'SentDate', 'sentDate')
                    )

                    return (
                      <article
                        key={noteId}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#185087] text-[11px] font-semibold text-white">
                            {getInitials(fromName)}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{fromName}</span>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                            {fromRole}
                          </span>
                          <span className="text-[11px] text-slate-500">{createdAt}</span>
                          <span className="ml-auto inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            <Lock className="h-3 w-3" />
                            Private
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-slate-900">{getNoteText(note)}</p>
                        <div className="mt-2" />
                      </article>
                    )
                  })
                : publicNoteThreads.map((node) => renderPublicNode(node, 0))}
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
