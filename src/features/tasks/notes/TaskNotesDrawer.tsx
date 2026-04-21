import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, AtSign, ChevronDown, ChevronRight, FileText, Hash, MessageSquareMore, X } from 'lucide-react'
import { useMentionUsers } from '@/features/tasks/hooks/useTaskQueries'
import type { NoteTab } from '@/features/tasks/notes/types'
import type { MentionUser } from '@/features/tasks/api'
import type { TaskNote } from '@/types/application'

export type { NoteTab } from '@/features/tasks/notes/types'

type Props = {
  open: boolean
  applicantCompany?: string
  applicationId?: number | null
  contextType?: 'task' | 'application'
  taskName: string
  activeTab: NoteTab
  directedNotes: TaskNote[]
  privateNotes: TaskNote[]
  publicNotes: TaskNote[]
  loadingDirected: boolean
  loadingPrivate: boolean
  loadingPublic: boolean
  composeText: string
  composeToUserId?: string | null
  composePrivate: boolean
  currentUsername?: string | null
  isSubmitting: boolean
  error?: string
  notesTitleOverride?: string
  currentLabelOverride?: string
  singleTabMode?: boolean
  singleTabLabel?: string
  showMyNotesThreadType?: boolean
  hideComposer?: boolean
  hidePrivacyToggle?: boolean
  showPerNoteApplicationId?: boolean
  onApplicationIdClick?: (applicationId: number) => void
  showViewApplicationAction?: boolean
  onViewApplicationClick?: (applicationId: number) => void
  onClose: () => void
  onTabChange: (tab: NoteTab) => void
  onComposeTextChange: (text: string) => void
  onComposeToUserChange: (toUserId: string | null) => void
  onComposePrivateChange: (value: boolean) => void
  onSubmit: () => void
  onReplySubmit: (params: {
    parentMessageId: string
    text: string
    applicationId?: number | null
    taskId?: string
    toUser?: string | null
  }) => Promise<void>
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

type RootTone = {
  avatar: string
  badge: string
  card: string
  replyCount: string
  text: string
  toggle: string
  action: string
}

const REPLY_TONES: ReplyTone[] = [
  { rail: 'border-slate-200', card: 'border-slate-200 bg-white', badge: 'bg-blue-50 text-blue-700' },
  { rail: 'border-emerald-300', card: 'border-emerald-200 bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-800' },
  { rail: 'border-amber-300', card: 'border-amber-200 bg-amber-50/45', badge: 'bg-amber-100 text-amber-800' },
  { rail: 'border-cyan-300', card: 'border-cyan-200 bg-cyan-50/45', badge: 'bg-cyan-100 text-cyan-800' },
]

const PUBLIC_ROOT_TONE: RootTone = {
  avatar: 'bg-emerald-700',
  badge: 'bg-emerald-100 text-emerald-900',
  card: 'border-emerald-300 border-l-4 bg-emerald-50/80 ring-1 ring-emerald-100',
  replyCount: 'bg-emerald-100 text-emerald-900',
  text: 'text-emerald-950',
  toggle: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  action: 'text-emerald-800 hover:bg-emerald-100',
}

const DIRECTED_ROOT_TONE: RootTone = {
  avatar: 'bg-violet-700',
  badge: 'bg-violet-100 text-violet-900',
  card: 'border-violet-300 border-l-4 bg-violet-50/80 ring-1 ring-violet-100',
  replyCount: 'bg-violet-100 text-violet-900',
  text: 'text-violet-950',
  toggle: 'bg-violet-100 text-violet-800 hover:bg-violet-200',
  action: 'text-violet-800 hover:bg-violet-100',
}

const normalizeNoteValue = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const getNoteText = (note: TaskNote): string => {
  const directCandidates = [
    note.note,
    note.text,
    (note as any)?.MessageText,
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

const getCollapsedPreview = (text: string, maxLength = 140): string => {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trimEnd()}...`
}

const normalizeMentionUserName = (value: string): string =>
  value.trim().replace(/^@/, '').toLowerCase()

const mentionPattern = /@mention\(([^)]+)\)|@([A-Za-z0-9._-]+)/gi

const renderNoteTextWithMentionHighlight = (text: string, currentUsername?: string | null) => {
  const normalizedCurrentUsername = normalizeMentionUserName(currentUsername ?? '')
  if (!normalizedCurrentUsername) return text

  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  mentionPattern.lastIndex = 0

  while ((match = mentionPattern.exec(text)) !== null) {
    const matchedText = match[0]
    const mentionedUserName = normalizeMentionUserName(match[1] ?? match[2] ?? '')
    const matchIndex = match.index

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }

    if (mentionedUserName === normalizedCurrentUsername) {
      parts.push(
        <span
          key={`${matchIndex}-${matchedText}`}
          className="rounded bg-amber-100 px-1 font-semibold text-amber-900"
        >
          {matchedText}
        </span>,
      )
    } else {
      parts.push(matchedText)
    }

    lastIndex = matchIndex + matchedText.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length === 0 ? text : parts
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

type MentionContext = {
  start: number
  end: number
  query: string
}

const getMentionContext = (text: string, cursor: number): MentionContext | null => {
  if (!text) return null
  const safeCursor = Number.isFinite(cursor) ? Math.max(0, Math.min(cursor, text.length)) : text.length
  const beforeCursor = text.slice(0, safeCursor)
  const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/)
  if (!match) return null

  const start = beforeCursor.lastIndexOf('@')
  if (start < 0) return null

  return {
    start,
    end: safeCursor,
    query: String(match[2] ?? ''),
  }
}

const getMentionLabel = (user: MentionUser): string => {
  const fallbackName = `${user.firstName} ${user.lastName}`.trim()
  if (fallbackName) return fallbackName
  
  const fullName = user.fullName.trim()
  if (fullName) return fullName

  if (user.userName.trim()) return user.userName.trim()
  if (user.email.trim()) return user.email.trim()
  return user.id
}

const getParentMessageId = (note: TaskNote): string => {
  const idCandidate = (note as any)?.MessageID ?? (note as any)?.messageId ?? (note as any)?.id
  if (idCandidate !== undefined && idCandidate !== null && String(idCandidate).trim()) {
    return String(idCandidate)
  }
  return ''
}

const getNoteApplicationId = (note: TaskNote): number | null => {
  const candidates = [
    (note as any)?.ApplicationID,
    (note as any)?.applicationId,
    (note as any)?.ApplicationId,
  ]

  for (const candidate of candidates) {
    const numericId = Number(candidate)
    if (Number.isFinite(numericId)) {
      return numericId
    }
  }

  return null
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

const countThreadReplies = (node: PublicNoteNode): number =>
  node.children.reduce((count, child) => count + 1 + countThreadReplies(child), 0)

const getLatestThreadTimestamp = (node: PublicNoteNode): number => {
  const childLatest = node.children.map(getLatestThreadTimestamp)
  return Math.max(getSortableTimestamp(node.note), ...childLatest)
}

export function TaskNotesDrawer({
  open,
  applicantCompany,
  applicationId,
  contextType = 'task',
  taskName,
  activeTab,
  directedNotes,
  privateNotes,
  publicNotes,
  loadingDirected,
  loadingPrivate,
  loadingPublic,
  composeText,
  composeToUserId,
  composePrivate,
  currentUsername,
  isSubmitting,
  error,
  notesTitleOverride,
  currentLabelOverride,
  singleTabMode = false,
  singleTabLabel = 'Notes',
  showMyNotesThreadType = false,
  hideComposer = false,
  hidePrivacyToggle = false,
  showPerNoteApplicationId = false,
  onApplicationIdClick,
  showViewApplicationAction = false,
  onViewApplicationClick,
  onClose,
  onTabChange,
  onComposeTextChange,
  onComposeToUserChange,
  onComposePrivateChange,
  onSubmit,
  onReplySubmit,
}: Props) {
  const composeTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [replyOpenById, setReplyOpenById] = useState<Record<string, boolean>>({})
  const [replyTextById, setReplyTextById] = useState<Record<string, string>>({})
  const [replySubmittingById, setReplySubmittingById] = useState<Record<string, boolean>>({})
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({})
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionContext, setMentionContext] = useState<MentionContext | null>(null)

  const { data: mentionUsers = [], isLoading: mentionUsersLoading } = useMentionUsers({
    enabled: open && !hideComposer,
  })

  const notesTitle =
    notesTitleOverride ?? (contextType === 'application' ? 'Application Notes' : 'Task Notes')
  const currentLabel =
    currentLabelOverride ?? (contextType === 'application' ? 'Current Application' : 'Current Task')

  const notes =
    activeTab === 'directed'
      ? directedNotes
      : activeTab === 'private'
        ? privateNotes
        : publicNotes
  const isLoading =
    activeTab === 'directed'
      ? loadingDirected
      : activeTab === 'private'
        ? loadingPrivate
        : loadingPublic
  const canSubmit = composeText.trim().length > 0 && !isSubmitting
  const threadedNotes = activeTab === 'directed' ? directedNotes : publicNotes
  const noteThreads = activeTab === 'private' ? [] : buildPublicNoteThreads(threadedNotes)
  const mentionQuery = mentionContext?.query ?? ''
  const isDirectedTab = activeTab === 'directed'
  const isPrivateTab = activeTab === 'private'
  const isPublicTab = activeTab === 'public'

  const filteredMentionUsers = useMemo(() => {
    const query = mentionQuery.trim().toLowerCase()
    if (!query) return mentionUsers

    return mentionUsers.filter((user) => {
      const searchable = [
        getMentionLabel(user),
        user.userRole,
        user.userName,
        user.email,
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [mentionQuery, mentionUsers])

  const selectedMentionUser = useMemo(() => {
    if (!isDirectedTab || !composeToUserId) return null
    return mentionUsers.find((user) => user.id === composeToUserId) ?? null
  }, [composeToUserId, isDirectedTab, mentionUsers])

  useEffect(() => {
    if (!open) return
    setExpandedThreads({})
    setReplyOpenById({})
    setReplyTextById({})
    setReplySubmittingById({})
  }, [open, activeTab, taskName])

  if (!open) return null

  const openMentionPopupFromText = (nextText: string, cursor: number) => {
    const context = getMentionContext(nextText, cursor)
    if (!context) {
      setMentionContext(null)
      setMentionOpen(false)
      return
    }

    setMentionContext(context)
    setMentionOpen(true)
  }

  const handleComposeChange = (nextText: string, cursor: number) => {
    onComposeTextChange(nextText)
    if (isPrivateTab) {
      setMentionContext(null)
      setMentionOpen(false)
      return
    }
    openMentionPopupFromText(nextText, cursor)
  }

  const handleMentionButtonClick = () => {
    if (isPrivateTab) return

    const textarea = composeTextareaRef.current
    if (!textarea) {
      setMentionContext({
        start: composeText.length,
        end: composeText.length,
        query: '',
      })
      setMentionOpen(true)
      return
    }

    textarea.focus()
    const selectionStart = textarea.selectionStart ?? composeText.length
    const selectionEnd = textarea.selectionEnd ?? composeText.length
    const existingContext = getMentionContext(composeText, selectionStart)
    if (existingContext) {
      setMentionContext(existingContext)
    } else {
      setMentionContext({
        start: selectionStart,
        end: selectionEnd,
        query: '',
      })
    }
    setMentionOpen(true)
  }

  const handlePickMentionUser = (user: MentionUser) => {
    const context = mentionContext ?? getMentionContext(composeText, composeText.length)
    if (context) {
      if (isDirectedTab) {
        const updatedText = `${composeText.slice(0, context.start)}${composeText.slice(context.end)}`
        onComposeTextChange(updatedText)
      } else {
        const mentionLabel = `@${getMentionLabel(user)}`
        const separator = context.start > 0 && !/\s$/.test(composeText.slice(0, context.start)) ? ' ' : ''
        const trailingSpace =
          context.end < composeText.length && /^\s/.test(composeText.slice(context.end))
            ? ''
            : ' '
        const updatedText = `${composeText.slice(0, context.start)}${separator}${mentionLabel}${trailingSpace}${composeText.slice(context.end)}`
        onComposeTextChange(updatedText)
      }
    }

    if (isDirectedTab) {
      onComposeToUserChange(user.id)
    }
    setMentionOpen(false)
    setMentionContext(null)
  }

  const renderPublicNode = (node: PublicNoteNode, depth: number) => {
    const { note, noteId, children } = node
    const fromName = getMetaValue(note, 'fromUser', 'from_user', 'FromUser')
    const toUser = getMetaValue(note, 'toUser', 'to_user', 'ToUser')
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
    const noteApplicationId = getNoteApplicationId(note)
    const isRoot = depth === 0
    const isThreadExpanded = isRoot ? Boolean(expandedThreads[noteId]) : true
    const replyCount = countThreadReplies(node)
    const hasReplies = replyCount > 0
    const noteText = getNoteText(note)
    const previewText = getCollapsedPreview(noteText)
    const renderedNoteText =
      isPublicTab ? renderNoteTextWithMentionHighlight(noteText, currentUsername) : noteText
    const renderedPreviewText =
      isPublicTab ? renderNoteTextWithMentionHighlight(previewText || '-', currentUsername) : previewText || '-'
    const isDirectedMyNote =
      showMyNotesThreadType &&
      isRoot &&
      ((note as any)?.isPrivate === true || String((note as any)?.isPrivate).toLowerCase() === 'true') &&
      toUser !== '-'
    const myNoteThreadLabel = isDirectedMyNote ? 'Directed' : 'Public'
    const myNoteThreadLabelClass = isDirectedMyNote
      ? 'bg-violet-100 text-violet-800'
      : 'bg-emerald-100 text-emerald-800'
    const rootTone = isDirectedTab || isDirectedMyNote ? DIRECTED_ROOT_TONE : PUBLIC_ROOT_TONE
    const cardClass = isRoot ? rootTone.card : tone.card
    const avatarClass = isRoot ? rootTone.avatar : 'bg-[#185087]'
    const roleBadgeClass = isRoot ? rootTone.badge : tone.badge

    return (
      <div key={noteId} className={depth > 0 ? `ml-4 border-l ${tone.rail} pl-3` : ''}>
        <article className={`rounded-lg border p-2.5 shadow-sm transition ${cardClass}`}>
          {isRoot ? (
            <div className="flex items-start gap-3 rounded-md px-0.5 py-0.5">
              {hasReplies ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedThreads((prev) => ({
                      ...prev,
                      [noteId]: !Boolean(prev[noteId]),
                    }))
                  }
                  className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition ${rootTone.toggle}`}
                  aria-expanded={isThreadExpanded}
                  aria-label={`${isThreadExpanded ? 'Collapse' : 'Expand'} thread from ${fromName}`}
                >
                  {isThreadExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="w-7 flex-shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarClass}`}>
                    {getInitials(fromName)}
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{fromName}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${roleBadgeClass}`}>
                    {fromRole}
                  </span>
                  {showMyNotesThreadType && isRoot ? (
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${myNoteThreadLabelClass}`}
                    >
                      {myNoteThreadLabel}
                    </span>
                  ) : null}
                  {activeTab === 'directed' && toUser !== '-' ? (
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-800">
                      To: {toUser}
                    </span>
                  ) : null}
                  {hasReplies ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${rootTone.replyCount}`}>
                      <MessageSquareMore className="h-3 w-3" />
                      {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  ) : null}
                  <span className="text-[11px] text-slate-500">{createdAt}</span>
                  {showPerNoteApplicationId && noteApplicationId !== null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onApplicationIdClick?.(noteApplicationId)}
                        aria-label={`AppId: ${noteApplicationId}`}
                        title={`Application ID ${noteApplicationId}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Hash className="h-3 w-3" />
                        <span className="uppercase tracking-wide text-slate-500">App</span>
                        <span className="font-semibold text-slate-800">{noteApplicationId}</span>
                      </button>
                      {showViewApplicationAction ? (
                        <button
                          type="button"
                          onClick={() => onViewApplicationClick?.(noteApplicationId)}
                          aria-label={`ViewApp:${noteApplicationId}`}
                          title={`View application ${noteApplicationId}`}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          <span>View</span>
                          <span className="font-semibold">{noteApplicationId}</span>
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <p className={`mt-2 text-sm font-medium leading-5 ${rootTone.text}`}>
                  {isThreadExpanded ? renderedNoteText : renderedPreviewText}
                </p>
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
                              applicationId: noteApplicationId,
                              taskId:
                                (note as any)?.TaskInstanceId === undefined ||
                                (note as any)?.TaskInstanceId === null ||
                                String((note as any)?.TaskInstanceId).trim() === '' ||
                                String((note as any)?.TaskInstanceId).trim() === '0'
                                  ? undefined
                                  : String((note as any)?.TaskInstanceId).trim(),
                              toUser: getMetaValue(note, 'fromUser', 'from_user', 'FromUser') !== '-'
                                ? getMetaValue(note, 'fromUser', 'from_user', 'FromUser')
                                : null,
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
                    className={`rounded px-2 py-1 text-xs font-medium ${rootTone.action}`}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!isRoot ? (
            <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#185087] text-[11px] font-semibold text-white">
              {getInitials(fromName)}
            </div>
            <span className="text-sm font-semibold text-slate-900">{fromName}</span>
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tone.badge}`}>
              {fromRole}
            </span>
            {showMyNotesThreadType && isRoot ? (
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${myNoteThreadLabelClass}`}>
                {myNoteThreadLabel}
              </span>
            ) : null}
            {activeTab === 'directed' && toUser !== '-' ? (
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-800">
                To: {toUser}
              </span>
            ) : null}
            {showPerNoteApplicationId && noteApplicationId !== null ? (
              <>
                <button
                  type="button"
                  onClick={() => onApplicationIdClick?.(noteApplicationId)}
                  aria-label={`AppId: ${noteApplicationId}`}
                  title={`Application ID ${noteApplicationId}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Hash className="h-3 w-3" />
                  <span className="uppercase tracking-wide text-slate-500">App</span>
                  <span className="font-semibold text-slate-800">{noteApplicationId}</span>
                </button>
                {showViewApplicationAction ? (
                  <button
                    type="button"
                    onClick={() => onViewApplicationClick?.(noteApplicationId)}
                    aria-label={`ViewApp:${noteApplicationId}`}
                    title={`View application ${noteApplicationId}`}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    <span>View</span>
                    <span className="font-semibold">{noteApplicationId}</span>
                  </button>
                ) : null}
              </>
            ) : null}
            <span className="text-[11px] text-slate-500">{createdAt}</span>
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-900">{renderedNoteText}</p>

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
                        applicationId: noteApplicationId,
                        taskId:
                          (note as any)?.TaskInstanceId === undefined ||
                          (note as any)?.TaskInstanceId === null ||
                          String((note as any)?.TaskInstanceId).trim() === '' ||
                          String((note as any)?.TaskInstanceId).trim() === '0'
                            ? undefined
                            : String((note as any)?.TaskInstanceId).trim(),
                        toUser: getMetaValue(note, 'fromUser', 'from_user', 'FromUser') !== '-'
                          ? getMetaValue(note, 'fromUser', 'from_user', 'FromUser')
                          : null,
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
            </>
          ) : null}
        </article>

        {(isRoot ? isThreadExpanded : true) && children.length > 0 ? (
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
          {singleTabMode ? (
            <button
              type="button"
              onClick={() => onTabChange(activeTab)}
              className="rounded-t-md border-b-2 border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-700"
            >
              {singleTabLabel}
              <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                {notes.length}
              </span>
            </button>
          ) : (
            <>
            <button
              type="button"
              onClick={() => onTabChange('directed')}
              className={`mr-1 rounded-t-md px-3 py-2 text-sm font-medium ${
                activeTab === 'directed'
                  ? 'border-b-2 border-violet-600 text-violet-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Directed Notes
              <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">
                {directedNotes.length}
              </span>
            </button>
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
            </>
          )}
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
                    const noteApplicationId = getNoteApplicationId(note)

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
                          {showPerNoteApplicationId && noteApplicationId !== null ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onApplicationIdClick?.(noteApplicationId)}
                                aria-label={`AppId: ${noteApplicationId}`}
                                title={`Application ID ${noteApplicationId}`}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Hash className="h-3 w-3" />
                                <span className="uppercase tracking-wide text-slate-500">App</span>
                                <span className="font-semibold text-slate-800">{noteApplicationId}</span>
                              </button>
                              {showViewApplicationAction ? (
                                <button
                                  type="button"
                                  onClick={() => onViewApplicationClick?.(noteApplicationId)}
                                  aria-label={`ViewApp:${noteApplicationId}`}
                                  title={`View application ${noteApplicationId}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
                                >
                                  <ArrowUpRight className="h-3 w-3" />
                                  <span>View</span>
                                  <span className="font-semibold">{noteApplicationId}</span>
                                </button>
                              ) : null}
                            </>
                          ) : null}
                          <span className="text-[11px] text-slate-500">{createdAt}</span>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-slate-900">{getNoteText(note)}</p>
                        <div className="mt-2" />
                      </article>
                    )
                  })
                : noteThreads.map((node) => renderPublicNode(node, 0))}
            </div>
          )}
        </div>

        {!hideComposer ? (
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="mb-1 text-sm font-semibold text-gray-900">Create Note</div>
            <div className="relative">
              <textarea
                ref={composeTextareaRef}
                value={composeText}
                onChange={(e) => handleComposeChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && mentionOpen) {
                    setMentionOpen(false)
                    setMentionContext(null)
                  }
                }}
                className="min-h-[84px] w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder={
                  isDirectedTab
                    ? 'Add a directed note... (@ to select ToUsers)'
                    : isPrivateTab
                      ? 'Add a private note...'
                      : `Add a ${composePrivate ? 'private' : 'public'} note... (@ to mention)`
                }
              />
              {mentionOpen && !isPrivateTab ? (
                <div className="absolute bottom-full z-10 mb-1 max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {mentionUsersLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading users...</div>
                  ) : filteredMentionUsers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No users found</div>
                  ) : (
                    filteredMentionUsers.map((user) => {
                      const label = getMentionLabel(user)
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handlePickMentionUser(user)}
                          className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#185087] text-[11px] font-semibold text-white">
                            {getInitials(label)}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{label}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
                            {user.userRole || 'User'}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : null}
            </div>

          {!isPrivateTab ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMentionButtonClick}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <AtSign className="h-3.5 w-3.5" />
                {isDirectedTab ? 'ToUsers' : 'Mention'}
              </button>
              {selectedMentionUser ? (
                <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  To User: {getMentionLabel(selectedMentionUser)}
                  <button
                    type="button"
                    onClick={() => onComposeToUserChange(null)}
                    className="rounded p-0.5 hover:bg-blue-100"
                    aria-label="Clear selected mention user"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between gap-2">
            {!hidePrivacyToggle && !isDirectedTab && !isPrivateTab && !isPublicTab ? (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={composePrivate}
                  onChange={(e) => onComposePrivateChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {composePrivate ? 'Private note' : 'Public note'}
              </label>
            ) : (
              <span />
            )}
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
        ) : null}
      </div>
    </div>
  )
}
