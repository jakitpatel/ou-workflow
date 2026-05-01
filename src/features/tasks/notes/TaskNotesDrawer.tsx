import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  AtSign,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  FileText,
  Hash,
  MessageSquareMore,
  MoreHorizontal,
  Reply,
  SmilePlus,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMentionUsers } from '@/features/tasks/hooks/useTaskQueries'
import type { NoteTab } from '@/features/tasks/notes/types'
import type { MentionUser } from '@/features/tasks/api'
import type { TaskNote, TaskNoteReaction } from '@/types/application'

export type { NoteTab } from '@/features/tasks/notes/types'

export type TaskNotesDrawerTabConfig = {
  id: NoteTab
  label: string
  notes: TaskNote[]
  loading: boolean
  mode: 'directed' | 'private' | 'public'
  threaded?: boolean
  tabClassName?: string
  badgeClassName?: string
}

type Props = {
  open: boolean
  variant?: 'drawer' | 'embedded'
  applicantCompany?: string
  applicationId?: number | null
  contextType?: 'task' | 'application'
  taskName: string
  activeTab: NoteTab
  incomingNotes?: TaskNote[]
  outgoingNotes?: TaskNote[]
  mentionNotes?: TaskNote[]
  privateNotes: TaskNote[]
  directedNotes?: TaskNote[]
  publicNotes?: TaskNote[]
  loadingIncoming?: boolean
  loadingOutgoing?: boolean
  loadingMention?: boolean
  loadingPrivate: boolean
  loadingDirected?: boolean
  loadingPublic?: boolean
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
  customTabs?: TaskNotesDrawerTabConfig[]
  showMyNotesThreadType?: boolean
  hideComposer?: boolean
  hidePrivacyToggle?: boolean
  showPerNoteApplicationId?: boolean
  onApplicationIdClick?: (applicationId: number) => void
  showViewApplicationAction?: boolean
  onViewApplicationClick?: (applicationId: number) => void
  onIncomingNoteClick?: (note: TaskNote) => Promise<void> | void
  markingReadMessageId?: string | null
  reactingMessageId?: string | null
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
    isPrivate?: boolean
  }) => Promise<void>
  onReactionTagChange?: (messageId: string, tag: TaskNoteReaction[]) => Promise<void>
}

type PublicNoteNode = {
  note: TaskNote
  noteId: string
  parentMessageId: string | null
  idx: number
  children: PublicNoteNode[]
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

type ThreadReplyTarget = {
  messageId: string
  parentMessageId: string
  author: string
  preview: string
  kind: 'root' | 'message'
  taskId?: string
  applicationId?: number | null
  toUser?: string | null
  isPrivate?: boolean
}

const REACTION_CODE_TO_EMOJI: Record<string, string> = {
  l: '👍',
  h: '❤️',
  j: '😂',
  s: '😮',
  t: '🎉',
  a: '👏',
  f: '🔥',
  c: '✅',
  e: '👀',
  i: '💡',
}

const EMOJI_TO_REACTION_CODE = Object.fromEntries(
  Object.entries(REACTION_CODE_TO_EMOJI).map(([code, emoji]) => [emoji, code]),
) as Record<string, string>

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮'] as const
const PICKER_REACTION_EMOJIS = ['🎉', '👏', '🔥', '✅', '👀', '💡'] as const

type ParsedReactionSummary = {
  code: string
  emoji: string
  count: number
  reactedByCurrentUser: boolean
}

const parseReactionCodes = (value: unknown): string[] =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item, index, array) => item in REACTION_CODE_TO_EMOJI && array.indexOf(item) === index)

const isReactionRecord = (value: unknown): value is TaskNoteReaction => {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<TaskNoteReaction>
  return typeof candidate.reaction === 'string'
}

const normalizeReactionActive = (value: unknown): boolean => {
  if (value === false || value === 0 || value === '0') return false
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'false' || normalized === 'no') return false
  }
  return true
}

const normalizeReactionRecord = (
  reaction: TaskNoteReaction,
  index: number,
): TaskNoteReaction | null => {
  const normalizedReaction = reaction.reaction.trim().toLowerCase()
  if (!(normalizedReaction in REACTION_CODE_TO_EMOJI)) return null

  const normalizedId = String(reaction.id ?? '').trim() || `legacy-reaction-${index}-${normalizedReaction}`

  return {
    id: normalizedId,
    username: String(reaction.username ?? '').trim(),
    reaction: normalizedReaction,
    datetime: String(reaction.datetime ?? '').trim(),
    active: normalizeReactionActive(reaction.active),
  }
}

const parseSerializedReactionRecords = (value: string): unknown[] | null => {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    const parsedValue = JSON.parse(trimmedValue)
    return Array.isArray(parsedValue) ? parsedValue : null
  } catch {
    // Continue to tolerate Python-style serialized payloads from the backend.
  }

  try {
    const normalizedValue = trimmedValue
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
      .replace(/'/g, '"')
    const parsedValue = JSON.parse(normalizedValue)
    return Array.isArray(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

const parseReactionRecords = (value: unknown): TaskNoteReaction[] => {
  if (Array.isArray(value)) {
    return value
      .filter(isReactionRecord)
      .map((reaction, index) => normalizeReactionRecord(reaction, index))
      .filter((reaction): reaction is TaskNoteReaction => Boolean(reaction))
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) return []

    const parsedRecords = parseSerializedReactionRecords(trimmedValue)
    if (parsedRecords) {
      return parseReactionRecords(parsedRecords)
    }

    return parseReactionCodes(trimmedValue).map((code, index) => ({
      id: `legacy-reaction-${index}-${code}`,
      username: '',
      reaction: code,
      datetime: '',
      active: true,
    }))
  }

  return []
}

const getReactionRecordsFromNote = (note: TaskNote): TaskNoteReaction[] =>
  parseReactionRecords((note as any)?.tag ?? (note as any)?.Tag)

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

const getMentionValue = (user: MentionUser): string => {
  const kashLogin = user.kashLogIn.trim()
  if (kashLogin) return kashLogin
  if (user.userName.trim()) return user.userName.trim()
  return user.id.trim()
}

const parseComposeToUsers = (value?: string | null): string[] => {
  if (!value) return []

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const serializeComposeToUsers = (values: string[]): string | null => {
  const uniqueValues = Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)))
  return uniqueValues.length > 0 ? uniqueValues.join(',') : null
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

const getNoteTaskId = (note: TaskNote): string | null => {
  const candidates = [
    (note as any)?.TaskInstanceId,
    (note as any)?.taskInstanceId,
    (note as any)?.TaskId,
    (note as any)?.taskId,
  ]

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue
    const value = String(candidate).trim()
    if (!value || value === '0') continue
    return value
  }

  return null
}

const getNoteTaskName = (note: TaskNote): string => {
  const candidates = [
    (note as any)?.TaskName,
    (note as any)?.taskName,
    (note as any)?.task_name,
  ]

  for (const candidate of candidates) {
    const value = normalizeNoteValue(candidate)
    if (value) return value
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

const isNoteRead = (note: TaskNote): boolean => {
  const value = (note as any)?.isRead
  if (value === true) return true
  if (value === false || value === undefined || value === null) return false

  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

const getUnreadNoteCount = (notes: TaskNote[]): number =>
  notes.reduce((count, note) => count + (isNoteRead(note) ? 0 : 1), 0)

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

const flattenPublicThread = (node: PublicNoteNode): PublicNoteNode[] => [
  node,
  ...node.children.flatMap(flattenPublicThread),
]

const normalizeComparableUserName = (value: string): string =>
  value.trim().replace(/^@/, '').replace(/[^a-z0-9]/gi, '').toLowerCase()

const getReactionSummaryFromNote = (
  note: TaskNote,
  currentUsername?: string | null,
): ParsedReactionSummary[] => {
  const currentUserKey = normalizeComparableUserName(currentUsername ?? '')
  const groupedReactions = new Map<string, ParsedReactionSummary>()

  for (const reaction of getReactionRecordsFromNote(note)) {
    if (!reaction.active) continue

    const code = reaction.reaction
    const emoji = REACTION_CODE_TO_EMOJI[code]
    if (!emoji) continue

    const existing = groupedReactions.get(code)
    const reactedByCurrentUser =
      normalizeComparableUserName(reaction.username) === currentUserKey && Boolean(currentUserKey)

    if (existing) {
      existing.count += 1
      existing.reactedByCurrentUser = existing.reactedByCurrentUser || reactedByCurrentUser
      continue
    }

    groupedReactions.set(code, {
      code,
      emoji,
      count: 1,
      reactedByCurrentUser,
    })
  }

  return Array.from(groupedReactions.values())
}

const createReactionId = (): string =>
  `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const buildNextReactionTag = (
  note: TaskNote,
  reactionCode: string,
  currentUsername?: string | null,
): TaskNoteReaction[] | null => {
  const resolvedUsername = String(currentUsername ?? '').trim()
  const normalizedCurrentUser = normalizeComparableUserName(resolvedUsername)
  if (!normalizedCurrentUser) return null

  const nextReactions = getReactionRecordsFromNote(note).map((reaction) => ({ ...reaction }))
  const matchingIndexes: number[] = []

  for (let index = 0; index < nextReactions.length; index += 1) {
    const reaction = nextReactions[index]
    if (
      reaction.reaction === reactionCode &&
      normalizeComparableUserName(reaction.username) === normalizedCurrentUser
    ) {
      matchingIndexes.push(index)
    }
  }

  const now = new Date().toISOString()
  const activeIndexes = matchingIndexes.filter((index) => nextReactions[index]?.active)

  if (activeIndexes.length > 0) {
    for (const index of activeIndexes) {
      nextReactions[index] = {
        ...nextReactions[index],
        username: nextReactions[index]?.username || resolvedUsername,
        datetime: now,
        active: false,
      }
    }

    return nextReactions
  }

  const latestMatchingIndex =
    matchingIndexes.length > 0 ? matchingIndexes[matchingIndexes.length - 1] : -1

  if (latestMatchingIndex >= 0) {
    nextReactions[latestMatchingIndex] = {
      ...nextReactions[latestMatchingIndex],
      username: nextReactions[latestMatchingIndex]?.username || resolvedUsername,
      datetime: now,
      active: true,
    }

    return nextReactions
  }

  return [
    ...nextReactions,
    {
      id: createReactionId(),
      username: resolvedUsername,
      reaction: reactionCode,
      datetime: now,
      active: true,
    },
  ]
}

const toUserIncludesCurrentUser = (toUser: string, currentUsername?: string | null): boolean => {
  const normalizedCurrentUsername = normalizeComparableUserName(currentUsername ?? '')
  if (!normalizedCurrentUsername) return false
  if (!toUser || toUser === '-') return false

  return toUser
    .split(',')
    .map((value) => normalizeComparableUserName(value))
    .filter(Boolean)
    .includes(normalizedCurrentUsername)
}

const isCurrentUserMessage = (fromName: string, currentUsername?: string | null): boolean => {
  const normalizedFromName = normalizeComparableUserName(fromName)
  const normalizedCurrentUsername = normalizeComparableUserName(currentUsername ?? '')

  if (!normalizedFromName || !normalizedCurrentUsername) return false
  return (
    normalizedFromName === normalizedCurrentUsername ||
    normalizedFromName.includes(normalizedCurrentUsername) ||
    normalizedCurrentUsername.includes(normalizedFromName)
  )
}

const getLatestThreadTimestamp = (node: PublicNoteNode): number => {
  const childLatest = node.children.map(getLatestThreadTimestamp)
  return Math.max(getSortableTimestamp(node.note), ...childLatest)
}

const normalizeDrawerTab = (tab: NoteTab): NoteTab => {
  if (tab === 'directed') return 'incoming'
  if (tab === 'outgoing') return 'incoming'
  if (tab === 'public') return 'mention'
  return tab
}

export function TaskNotesDrawer({
  open,
  variant = 'drawer',
  applicantCompany,
  applicationId,
  contextType = 'task',
  taskName,
  activeTab,
  incomingNotes,
  mentionNotes,
  privateNotes,
  directedNotes,
  publicNotes,
  loadingIncoming,
  loadingMention,
  loadingPrivate,
  loadingDirected,
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
  customTabs,
  showMyNotesThreadType = false,
  hideComposer = false,
  hidePrivacyToggle = false,
  showPerNoteApplicationId = false,
  onApplicationIdClick,
  showViewApplicationAction = false,
  onViewApplicationClick,
  onIncomingNoteClick,
  markingReadMessageId,
  reactingMessageId,
  onClose,
  onTabChange,
  onComposeTextChange,
  onComposeToUserChange,
  onComposePrivateChange,
  onSubmit,
  onReplySubmit,
  onReactionTagChange,
}: Props) {
  const isEmbedded = variant === 'embedded'
  const composeTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const threadReplyTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const pendingReplyFocusThreadIdRef = useRef<string | null>(null)
  const [replyOpenById, setReplyOpenById] = useState<Record<string, boolean>>({})
  const [replyTextById, setReplyTextById] = useState<Record<string, string>>({})
  const [replySubmittingById, setReplySubmittingById] = useState<Record<string, boolean>>({})
  const [replyTargetByThreadId, setReplyTargetByThreadId] = useState<Record<string, ThreadReplyTarget | null>>({})
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({})
  const [reactionPickerOpenById, setReactionPickerOpenById] = useState<Record<string, boolean>>({})
  const [actionMenuOpenById, setActionMenuOpenById] = useState<Record<string, boolean>>({})
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionContext, setMentionContext] = useState<MentionContext | null>(null)
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false)
  const [recipientQuery, setRecipientQuery] = useState('')

  const { data: mentionUsers = [], isLoading: mentionUsersLoading } = useMentionUsers({
    enabled: open && !hideComposer,
  })

  const notesTitle =
    notesTitleOverride ?? (contextType === 'application' ? 'Application Notes' : 'Task Notes')
  const currentLabel =
    currentLabelOverride ?? (contextType === 'application' ? 'Current Application' : 'Current Task')
  const resolvedIncomingNotes = incomingNotes ?? directedNotes ?? []
  const resolvedMentionNotes = mentionNotes ?? publicNotes ?? []
  const resolvedLoadingIncoming = loadingIncoming ?? loadingDirected ?? false
  const resolvedLoadingMention = loadingMention ?? loadingPublic ?? false
  const defaultTabs: TaskNotesDrawerTabConfig[] = [
    {
      id: 'incoming',
      label: 'Direct',
      notes: resolvedIncomingNotes,
      loading: resolvedLoadingIncoming,
      mode: 'directed',
      tabClassName: 'border-violet-600 text-violet-700',
      badgeClassName: 'bg-violet-100 text-violet-700',
    },
    {
      id: 'private',
      label: 'Private',
      notes: privateNotes,
      loading: loadingPrivate,
      mode: 'private',
      tabClassName: 'border-blue-600 text-blue-700',
      badgeClassName: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'mention',
      label: 'Mention',
      notes: resolvedMentionNotes,
      loading: resolvedLoadingMention,
      mode: 'public',
      tabClassName: 'border-amber-600 text-amber-700',
      badgeClassName: 'bg-amber-100 text-amber-700',
    },
  ]
  const tabs = customTabs?.length ? customTabs : defaultTabs
  const normalizedActiveTab = normalizeDrawerTab(activeTab)
  const activeTabConfig = tabs.find((tab) => tab.id === normalizedActiveTab) ?? tabs[0]
  const notes = activeTabConfig?.notes ?? []
  const isLoading = activeTabConfig?.loading ?? false
  const canSubmit = composeText.trim().length > 0 && !isSubmitting
  const tabMode = activeTabConfig?.mode ?? 'public'
  const isThreadedTab =
    activeTabConfig?.threaded ?? (tabMode === 'directed' || tabMode === 'public')
  const noteThreads = isThreadedTab ? buildPublicNoteThreads(notes) : []
  const mentionQuery = mentionContext?.query ?? ''
  const isDirectedTab = tabMode === 'directed'
  const isPrivateTab = tabMode === 'private'
  const isPublicTab = tabMode === 'public'
  const isIncomingTab = activeTabConfig?.id === 'incoming'
  const isOutgoingTab = activeTabConfig?.id === 'outgoing'

  const filteredMentionUsers = useMemo(() => {
    const query = mentionQuery.trim().toLowerCase()
    if (!query) return mentionUsers

    return mentionUsers.filter((user) => {
      const searchable = [
        getMentionLabel(user),
        getMentionValue(user),
        user.userRole,
        user.userName,
        user.email,
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [mentionQuery, mentionUsers])

  const selectedToUserValues = useMemo(
    () => parseComposeToUsers(composeToUserId),
    [composeToUserId],
  )

  const selectedMentionUsers = useMemo(() => {
    if ((!isDirectedTab && !isOutgoingTab) || selectedToUserValues.length === 0) return []

    return selectedToUserValues.map((selectedValue) => {
      const matchedUser =
        mentionUsers.find((user) => {
          const mentionValue = getMentionValue(user)
          return user.id === selectedValue || mentionValue === selectedValue
        }) ?? null

      return {
        value: selectedValue,
        user: matchedUser,
      }
    })
  }, [isDirectedTab, isOutgoingTab, mentionUsers, selectedToUserValues])

  const filteredRecipientUsers = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase()
    if (!query) return mentionUsers

    return mentionUsers.filter((user) => {
      const searchable = [
        getMentionLabel(user),
        getMentionValue(user),
        user.userRole,
        user.userName,
        user.email,
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [mentionUsers, recipientQuery])

  useEffect(() => {
    if (!open) return
    setExpandedThreads({})
    setReplyOpenById({})
    setReplyTextById({})
    setReplySubmittingById({})
    setReplyTargetByThreadId({})
    setReactionPickerOpenById({})
    setActionMenuOpenById({})
    setRecipientPickerOpen(false)
    setRecipientQuery('')
  }, [open, activeTab, taskName])

  useEffect(() => {
    const pendingThreadId = pendingReplyFocusThreadIdRef.current
    if (!pendingThreadId || !replyOpenById[pendingThreadId]) return

    const textarea = threadReplyTextareaRefs.current[pendingThreadId]
    if (!textarea) return

    textarea.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    textarea.focus()
    const textLength = textarea.value.length
    textarea.setSelectionRange(textLength, textLength)
    pendingReplyFocusThreadIdRef.current = null
  }, [replyOpenById, replyTargetByThreadId])

  if (!open) return null

  const focusThreadReplyComposer = (threadId: string) => {
    pendingReplyFocusThreadIdRef.current = threadId
  }

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
    if (isPrivateTab && !isOutgoingTab && !isDirectedTab) {
      setMentionContext(null)
      setMentionOpen(false)
      return
    }
    openMentionPopupFromText(nextText, cursor)
  }

  const handleMentionButtonClick = () => {
    if (isPrivateTab && !isOutgoingTab) return

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
      if (isDirectedTab || isOutgoingTab) {
        const updatedText = `${composeText.slice(0, context.start)}${composeText.slice(context.end)}`
        onComposeTextChange(updatedText)
      } else {
        const mentionLabel = `@${getMentionValue(user)}`
        const separator = context.start > 0 && !/\s$/.test(composeText.slice(0, context.start)) ? ' ' : ''
        const trailingSpace =
          context.end < composeText.length && /^\s/.test(composeText.slice(context.end))
            ? ''
            : ' '
        const updatedText = `${composeText.slice(0, context.start)}${separator}${mentionLabel}${trailingSpace}${composeText.slice(context.end)}`
        onComposeTextChange(updatedText)
      }
    }

    if (isDirectedTab || isOutgoingTab) {
      const nextToUsers = serializeComposeToUsers([
        ...selectedToUserValues,
        getMentionValue(user),
      ])
      onComposeToUserChange(nextToUsers)
    }
    setMentionOpen(false)
    setMentionContext(null)
  }

  const handleRecipientPick = (user: MentionUser) => {
    const nextToUsers = serializeComposeToUsers([
      ...selectedToUserValues,
      getMentionValue(user),
    ])
    onComposeToUserChange(nextToUsers)
    setRecipientQuery('')
  }

  const handleRemoveRecipient = (userValue: string) => {
    const nextToUsers = serializeComposeToUsers(
      selectedToUserValues.filter((value) => value !== userValue),
    )
    onComposeToUserChange(nextToUsers)
  }

  const renderApplicationActions = (noteApplicationId: number, isRoot = false) => {
    const showForMyMessages = showMyNotesThreadType
    if (showForMyMessages && !isRoot) return null

    const appIdButton = (
      <button
        type="button"
        onClick={() => onApplicationIdClick?.(noteApplicationId)}
        aria-label={`AppId: ${noteApplicationId}`}
        title={`Application ID ${noteApplicationId}`}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
      >
        <Hash className="h-3 w-3" />
        <span className="uppercase tracking-wide text-slate-500">
          {showForMyMessages ? 'View' : 'App'}
        </span>
        <span className="font-semibold text-slate-800">{noteApplicationId}</span>
      </button>
    )

    const viewButton = showViewApplicationAction ? (
      <button
        type="button"
        onClick={() => onViewApplicationClick?.(noteApplicationId)}
        aria-label={`ViewApp:${noteApplicationId}`}
        title={`View application ${noteApplicationId}`}
        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
      >
        <ArrowUpRight className="h-3 w-3" />
        <span>{showForMyMessages ? 'App' : 'View'}</span>
        <span className="font-semibold">{noteApplicationId}</span>
      </button>
    ) : null

    return (
      <>
        {appIdButton}
        {viewButton}
      </>
    )
  }

  const handleCopyNoteText = async (text: string) => {
    if (!text || text === '-') return

    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }

      await navigator.clipboard.writeText(text)
      toast.success('Message copied')
    } catch {
      toast.error('Unable to copy message')
    }
  }

  const toggleReactionForNote = async (
    event: React.MouseEvent<HTMLButtonElement>,
    note: TaskNote,
    noteId: string,
    emoji: string,
  ) => {
    event.stopPropagation()

    const reactionCode = EMOJI_TO_REACTION_CODE[emoji]
    if (!reactionCode || !onReactionTagChange) return

    const nextTag = buildNextReactionTag(note, reactionCode, currentUsername)
    if (!nextTag) {
      toast.error('Unable to add a reaction without a username')
      return
    }

    try {
      await onReactionTagChange(noteId, nextTag)
      setReactionPickerOpenById((prev) => ({ ...prev, [noteId]: false }))
    } catch {
      // Hook layer already captures and surfaces the error.
    }
  }

  const renderPublicNode = (node: PublicNoteNode) => {
    const { note, noteId } = node
    const rootMessageId = noteId
    const fromName = getMetaValue(note, 'fromUser', 'from_user', 'FromUser')
    const toUser = getMetaValue(note, 'toUser', 'to_user', 'ToUser')
    const createdAt = formatNoteDate(
      getMetaValue(note, 'createdDate', 'created_date', 'SentDate', 'sentDate')
    )
    const noteApplicationId = getNoteApplicationId(note)
    const noteTaskName = getNoteTaskName(note)
    const showNoteTaskName =
      contextType !== 'task' && Boolean(getNoteTaskId(note)) && Boolean(noteTaskName)
    const isThreadExpanded = Boolean(expandedThreads[rootMessageId])
    const replyCount = countThreadReplies(node)
    const noteText = getNoteText(note)
    const previewText = getCollapsedPreview(noteText)
    const renderedPreviewText =
      isPublicTab ? renderNoteTextWithMentionHighlight(previewText || '-', currentUsername) : previewText || '-'
    const isDirectedMyNote =
      showMyNotesThreadType &&
      ((note as any)?.isPrivate === true || String((note as any)?.isPrivate).toLowerCase() === 'true') &&
      toUser !== '-'
    const isPrivateMyNote =
      showMyNotesThreadType &&
      !isDirectedMyNote &&
      ((note as any)?.isPrivate === true || String((note as any)?.isPrivate).toLowerCase() === 'true')
    const myNoteThreadLabel = isDirectedMyNote ? 'Directed' : isPrivateMyNote ? 'Private' : 'Public'
    const myNoteThreadLabelClass = isDirectedMyNote
      ? 'bg-violet-100 text-violet-800'
      : isPrivateMyNote
        ? 'bg-blue-100 text-blue-800'
        : 'bg-emerald-100 text-emerald-800'
    const showMyNoteThreadBadge = showMyNotesThreadType && !isIncomingTab
    const noteIsRead = isNoteRead(note)
    const isMarkingRead = markingReadMessageId === rootMessageId
    const canMarkThreadRead = toUserIncludesCurrentUser(toUser, currentUsername)
    const incomingReadIndicatorClass = noteIsRead
      ? 'bg-slate-100 text-slate-600'
      : 'bg-violet-100 text-violet-800'
    const rootTone = isDirectedTab || isDirectedMyNote ? DIRECTED_ROOT_TONE : PUBLIC_ROOT_TONE
    const threadReplyTarget = replyTargetByThreadId[rootMessageId] ?? null
    const replyText = replyTextById[rootMessageId] ?? ''
    const isReplyOpen = Boolean(replyOpenById[rootMessageId])
    const isReplySubmitting = Boolean(replySubmittingById[rootMessageId])
    const canReply =
      Boolean(threadReplyTarget?.parentMessageId) && replyText.trim().length > 0 && !isReplySubmitting
    const threadNodes = flattenPublicThread(node)

    const closeReplyComposer = () => {
      setReplyTargetByThreadId((prev) => ({ ...prev, [rootMessageId]: null }))
      setReplyOpenById((prev) => ({ ...prev, [rootMessageId]: false }))
    }

    const openReplyComposerForMessage = (
      messageNode: PublicNoteNode,
      replyKind: 'root' | 'message' = 'message',
    ) => {
      const targetNode = replyKind === 'root' ? node : messageNode
      const messageNote = targetNode.note
      const messageAuthor = getMetaValue(messageNote, 'fromUser', 'from_user', 'FromUser')
      const messageText = getNoteText(messageNote)
      const parentMessageId = getParentMessageId(messageNote)
      const resolvedTaskId = getNoteTaskId(messageNote) ?? undefined
      const resolvedApplicationId = getNoteApplicationId(messageNote)
      const resolvedToUser =
        isIncomingTab || isDirectedTab || isOutgoingTab
          ? messageAuthor !== '-'
            ? messageAuthor
            : null
          : null
      const resolvedIsPrivate =
        (messageNote as any)?.isPrivate === true ||
        String((messageNote as any)?.isPrivate).toLowerCase() === 'true'

      setReplyTargetByThreadId((prev) => ({
        ...prev,
        [rootMessageId]: {
          messageId: targetNode.noteId,
          parentMessageId,
          author: messageAuthor,
          preview: getCollapsedPreview(messageText, 72),
          kind: replyKind,
          taskId: resolvedTaskId,
          applicationId: resolvedApplicationId,
          toUser: resolvedToUser,
          isPrivate: resolvedIsPrivate,
        },
      }))
      setReplyOpenById((prev) => ({ ...prev, [rootMessageId]: true }))
      setActionMenuOpenById((prev) => ({ ...prev, [messageNode.noteId]: false }))
      setReactionPickerOpenById((prev) => ({ ...prev, [messageNode.noteId]: false }))
      focusThreadReplyComposer(rootMessageId)
    }

    const submitThreadReply = async () => {
      if (!threadReplyTarget || !canReply) return
      setReplySubmittingById((prev) => ({ ...prev, [rootMessageId]: true }))
      try {
        await onReplySubmit({
          parentMessageId: threadReplyTarget.parentMessageId,
          text: replyText.trim(),
          applicationId: threadReplyTarget.applicationId ?? noteApplicationId,
          taskId: threadReplyTarget.taskId,
          toUser: threadReplyTarget.toUser,
          isPrivate: threadReplyTarget.isPrivate,
        })
        setReplyTextById((prev) => ({ ...prev, [rootMessageId]: '' }))
        setReplyOpenById((prev) => ({ ...prev, [rootMessageId]: false }))
        setReplyTargetByThreadId((prev) => ({ ...prev, [rootMessageId]: null }))
      } finally {
        setReplySubmittingById((prev) => ({ ...prev, [rootMessageId]: false }))
      }
    }

    const handleThreadClick = () => {
      if (!isIncomingTab || noteIsRead || !canMarkThreadRead) return
      void onIncomingNoteClick?.(note)
    }

    return (
      <article
        key={rootMessageId}
        className={`rounded-2xl border shadow-sm transition ${
          isIncomingTab && !noteIsRead
            ? 'border-violet-300 bg-violet-50/70 ring-1 ring-violet-100'
            : 'border-slate-200 bg-white'
        } ${isIncomingTab && !noteIsRead && !isThreadExpanded && canMarkThreadRead ? 'cursor-pointer' : ''}`}
        onClick={handleThreadClick}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpandedThreads((prev) => ({
                ...prev,
                [rootMessageId]: !Boolean(prev[rootMessageId]),
              }))
            }}
            className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition ${rootTone.toggle}`}
            aria-expanded={isThreadExpanded}
            aria-label={`${isThreadExpanded ? 'Collapse' : 'Expand'} thread from ${fromName}`}
          >
            {isThreadExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ${rootTone.avatar}`}>
                {getInitials(fromName)}
              </div>
              <span className="text-sm font-semibold text-slate-900">{fromName}</span>
              {showMyNoteThreadBadge ? (
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${myNoteThreadLabelClass}`}>
                  {myNoteThreadLabel}
                </span>
              ) : null}
              {isIncomingTab ? (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${incomingReadIndicatorClass}`}>
                  <Circle className={`h-2.5 w-2.5 ${noteIsRead ? 'fill-slate-400 text-slate-400' : 'fill-violet-600 text-violet-600'}`} />
                  {isMarkingRead ? 'Marking read...' : noteIsRead ? 'Read' : 'Unread'}
                </span>
              ) : null}
              {toUser !== '-' ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                  To: {toUser}
                </span>
              ) : null}
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${rootTone.replyCount}`}>
                <MessageSquareMore className="h-3 w-3" />
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
              <span className="text-[11px] text-slate-500">{createdAt}</span>
              {showPerNoteApplicationId && noteApplicationId !== null ? renderApplicationActions(noteApplicationId, true) : null}
            </div>

            {showNoteTaskName ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Notes For: <span className="text-slate-900">{noteTaskName}</span>
              </p>
            ) : null}

            {!isThreadExpanded ? (
              <p className={`mt-2 text-sm font-medium leading-5 ${rootTone.text}`}>{renderedPreviewText}</p>
            ) : null}
          </div>
        </div>

        {isThreadExpanded ? (
          <div className="px-4 py-4">
            <div className="max-h-[34rem] space-y-3 overflow-y-auto rounded-2xl bg-slate-50/80 p-3">
              {threadNodes.map((messageNode, messageIndex) => {
                const messageNote = messageNode.note
                const messageId = messageNode.noteId
                const messageFromName = getMetaValue(messageNote, 'fromUser', 'from_user', 'FromUser')
                const messageToUser = getMetaValue(messageNote, 'toUser', 'to_user', 'ToUser')
                const messageText = getNoteText(messageNote)
                const messageCreatedAt = formatNoteDate(
                  getMetaValue(messageNote, 'createdDate', 'created_date', 'SentDate', 'sentDate')
                )
                const messageIsOwn = isCurrentUserMessage(messageFromName, currentUsername)
                const messageNoteIsRead = isNoteRead(messageNote)
                const messageIsMarkingRead = markingReadMessageId === messageId
                const messageRenderedText =
                  isPublicTab ? renderNoteTextWithMentionHighlight(messageText, currentUsername) : messageText
                const messageReactions = getReactionSummaryFromNote(messageNote, currentUsername)
                const isReactionPickerOpen = Boolean(reactionPickerOpenById[messageId])
                const isActionMenuOpen = Boolean(actionMenuOpenById[messageId])
                const canMarkMessageRead = toUserIncludesCurrentUser(messageToUser, currentUsername)
                const isReactingMessage = reactingMessageId === messageId
                const showMessageToUser =
                  messageToUser !== '-' && (isDirectedTab || (showMyNotesThreadType && isIncomingTab))
                const isRootMessage = messageIndex === 0
                const isSelectedReplyTarget = threadReplyTarget?.messageId === messageId

                return (
                  <div key={messageId} className={`flex ${messageIsOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[88%] gap-2 ${messageIsOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${messageIsOwn ? 'bg-slate-600' : isRootMessage ? rootTone.avatar : 'bg-[#185087]'}`}>
                        {getInitials(messageFromName)}
                      </div>

                      <div className={`group relative min-w-0 ${messageIsOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isRootMessage ? (
                          <div className={`mb-1 flex flex-wrap items-center gap-2 text-[11px] ${messageIsOwn ? 'justify-end text-right' : 'justify-start text-left'} text-slate-500`}>
                            <span className="font-semibold text-slate-700">{messageFromName}</span>
                            {isSelectedReplyTarget ? (
                              <span className="rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white">
                                Reply target
                              </span>
                            ) : null}
                            {isIncomingTab ? (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${messageNoteIsRead ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-800'}`}>
                                <Circle className={`h-2 w-2 ${messageNoteIsRead ? 'fill-slate-400 text-slate-400' : 'fill-violet-600 text-violet-600'}`} />
                                {messageIsMarkingRead ? 'Marking read...' : messageNoteIsRead ? 'Read' : 'Unread'}
                              </span>
                            ) : null}
                            {showMessageToUser ? (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">
                                To: {messageToUser}
                              </span>
                            ) : null}
                            <span>{messageCreatedAt}</span>
                          </div>
                        ) : null}

                        <div
                          className={`absolute z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-lg transition ${
                            messageIsOwn ? 'right-3' : 'left-3'
                          } -top-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto`}
                        >
                          {QUICK_REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={`${messageId}-${emoji}-quick`}
                              type="button"
                              onClick={(event) =>
                                void toggleReactionForNote(event, messageNote, messageId, emoji)
                              }
                              disabled={isReactingMessage}
                              className="rounded-full px-1.5 py-1 text-xs transition hover:bg-slate-100"
                              aria-label={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setReactionPickerOpenById((prev) => ({
                                ...prev,
                                [messageId]: !Boolean(prev[messageId]),
                              }))
                            }
                            className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100"
                            aria-label={`Open reactions for ${messageFromName}`}
                          >
                            <SmilePlus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openReplyComposerForMessage(messageNode)}
                            className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100"
                            aria-label={`Reply to ${messageFromName}`}
                            title="Reply to this message"
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </button>
                          {!isRootMessage ? (
                            <button
                              type="button"
                              onClick={() => openReplyComposerForMessage(messageNode, 'root')}
                              className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100"
                              aria-label={`Reply to the thread root from ${fromName}`}
                              title="Reply to thread root"
                            >
                              <MessageSquareMore className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void handleCopyNoteText(messageText)}
                            className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100"
                            aria-label={`Copy message from ${messageFromName}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuOpenById((prev) => ({
                                ...prev,
                                [messageId]: !Boolean(prev[messageId]),
                              }))
                            }
                            className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100"
                            aria-label={`More actions for ${messageFromName}`}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div
                          className={`relative overflow-hidden rounded-[1.35rem] border px-4 py-3 text-sm leading-6 shadow-sm ${
                            messageIsOwn
                              ? 'border-blue-200 bg-blue-600 text-white'
                              : isRootMessage
                                ? `${rootTone.card} ${rootTone.text}`
                                : 'border-slate-200 bg-white text-slate-900'
                          } ${isSelectedReplyTarget ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-50 shadow-md' : ''} ${isIncomingTab && !messageNoteIsRead && canMarkMessageRead ? 'cursor-pointer' : ''}`}
                          onClick={() => {
                            if (!isIncomingTab || messageNoteIsRead || !canMarkMessageRead) return
                            void onIncomingNoteClick?.(messageNote)
                          }}
                        >
                          {messageRenderedText}
                        </div>

                        {messageReactions.length > 0 ? (
                          <div className={`mt-1 flex flex-wrap gap-1 ${messageIsOwn ? 'justify-end' : 'justify-start'}`}>
                            {messageReactions.map((reaction) => (
                              <button
                                key={`${messageId}-${reaction.code}`}
                                type="button"
                                onClick={(event) =>
                                  void toggleReactionForNote(
                                    event,
                                    messageNote,
                                    messageId,
                                    reaction.emoji,
                                  )
                                }
                                disabled={isReactingMessage}
                                className={`rounded-full border px-2 py-0.5 text-xs shadow-sm hover:bg-slate-50 ${
                                  reaction.reactedByCurrentUser
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white'
                                }`}
                              >
                                <span>{reaction.emoji}</span>
                                {reaction.count > 1 ? <span className="ml-1 font-medium">{reaction.count}</span> : null}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div className={`relative mt-2 flex flex-wrap items-center gap-1 ${messageIsOwn ? 'justify-end' : 'justify-start'}`}>
                          {isReactionPickerOpen ? (
                            <div className={`absolute top-full z-10 mt-2 flex gap-1 rounded-full border border-slate-200 bg-white p-2 shadow-xl ${messageIsOwn ? 'right-0' : 'left-0'}`}>
                              {PICKER_REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={`${messageId}-${emoji}-picker`}
                                  type="button"
                                  onClick={(event) =>
                                    void toggleReactionForNote(event, messageNote, messageId, emoji)
                                  }
                                  disabled={isReactingMessage}
                                  className="rounded-full px-2 py-1 text-base hover:bg-slate-100"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ) : null}

                          {isActionMenuOpen ? (
                            <div className={`absolute top-full z-10 mt-2 min-w-[12rem] rounded-2xl border border-slate-200 bg-white p-1 shadow-xl ${messageIsOwn ? 'right-0' : 'left-0'}`}>
                              <button
                                type="button"
                                onClick={() => openReplyComposerForMessage(messageNode)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Reply className="h-4 w-4" />
                                Reply to this message
                              </button>
                              {!isRootMessage ? (
                                <button
                                  type="button"
                                  onClick={() => openReplyComposerForMessage(messageNode, 'root')}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <MessageSquareMore className="h-4 w-4" />
                                  Reply to thread root
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void handleCopyNoteText(messageText)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Copy className="h-4 w-4" />
                                Copy text
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionMenuOpenById((prev) => ({ ...prev, [messageId]: false }))
                                  setReactionPickerOpenById((prev) => ({ ...prev, [messageId]: true }))
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <SmilePlus className="h-4 w-4" />
                                Add reaction
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Reply</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openReplyComposerForMessage(node, 'root')}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${rootTone.action}`}
                  >
                    Reply to thread root
                  </button>
                </div>
              </div>

              {threadReplyTarget ? (
                <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {threadReplyTarget.kind === 'root' ? 'Replying to thread root' : `Replying to ${threadReplyTarget.author}`}
                      </div>
                      <p className="truncate text-sm">{threadReplyTarget.preview}</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeReplyComposer}
                      className="rounded-full p-1 text-blue-700 hover:bg-blue-100"
                      aria-label="Cancel reply target"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}

              {isReplyOpen ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={(element) => {
                      threadReplyTextareaRefs.current[rootMessageId] = element
                    }}
                    className="min-h-[72px] w-full resize-y rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Reply..."
                    value={replyText}
                    onChange={(e) => setReplyTextById((prev) => ({ ...prev, [rootMessageId]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void submitThreadReply()
                      }
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Press Enter to send, Shift+Enter for a new line.</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={closeReplyComposer}
                        className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitThreadReply()}
                        disabled={!canReply}
                        className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isReplySubmitting ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openReplyComposerForMessage(node, 'root')}
                  className="flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                >
                  Start a reply to the thread root
                </button>
              )}
            </div>

            {isIncomingTab && !noteIsRead ? (
              <button
                type="button"
                onClick={handleThreadClick}
                className="mt-3 text-xs font-medium text-violet-700 hover:text-violet-800"
              >
                Mark thread as read
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    )
  }

  const notesContent = (
    <>
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
          {!isEmbedded ? (
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
              aria-label={`Close ${notesTitle.toLowerCase()} drawer`}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{currentLabel}</p>
          <p className="text-sm font-medium text-gray-900">{taskName}</p>
        </div>

        <div className="border-b border-gray-200 px-2">
          {singleTabMode ? (
            <button
              type="button"
              onClick={() => onTabChange(normalizedActiveTab)}
              className="rounded-t-md border-b-2 border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-700"
            >
              {singleTabLabel}
              <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                {notes.length}
              </span>
            </button>
          ) : (
            <>
            {tabs.map((tab) => {
              const isActive = normalizedActiveTab === tab.id
              const activeClassName = tab.tabClassName ?? 'border-indigo-600 text-indigo-700'
              const badgeClassName = tab.badgeClassName ?? 'bg-indigo-100 text-indigo-700'
              const badgeValue =
                tab.id === 'incoming'
                  ? `${getUnreadNoteCount(tab.notes)}/${tab.notes.length}`
                  : tab.notes.length

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`mr-1 rounded-t-md px-3 py-2 text-sm font-medium ${
                    isActive ? `border-b-2 ${activeClassName}` : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${badgeClassName}`}>
                    {badgeValue}
                  </span>
                </button>
              )
            })}
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
              {!isThreadedTab
                ? notes.map((note, idx) => {
                    const noteId = getNoteId(note, idx)
                    const fromName = getMetaValue(note, 'fromUser', 'from_user', 'FromUser')
                    const noteIsRead = isNoteRead(note)
                    const isMarkingRead = markingReadMessageId === noteId
                    const noteToUser = getMetaValue(note, 'toUser', 'to_user', 'ToUser')
                    const canMarkNoteRead = toUserIncludesCurrentUser(noteToUser, currentUsername)
                    const createdAt = formatNoteDate(
                      getMetaValue(note, 'createdDate', 'created_date', 'SentDate', 'sentDate')
                    )
                    const noteApplicationId = getNoteApplicationId(note)
                    const noteTaskName = getNoteTaskName(note)
                    const showNoteTaskName =
                      contextType !== 'task' &&
                      Boolean(getNoteTaskId(note)) &&
                      Boolean(noteTaskName)

                    return (
                      <article
                        key={noteId}
                        className={`rounded-lg border p-2.5 shadow-sm ${
                          isIncomingTab && !noteIsRead
                            ? `${canMarkNoteRead ? 'cursor-pointer ' : ''}border-violet-300 bg-violet-50/70 ring-1 ring-violet-100`
                            : 'border-slate-200 bg-white'
                        }`}
                        onClick={() => {
                          if (!isIncomingTab || !canMarkNoteRead || noteIsRead) return
                          void onIncomingNoteClick?.(note)
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#185087] text-[11px] font-semibold text-white">
                            {getInitials(fromName)}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{fromName}</span>
                          {isIncomingTab ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                                noteIsRead ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-800'
                              }`}
                            >
                              <Circle className={`h-2.5 w-2.5 ${noteIsRead ? 'fill-slate-400 text-slate-400' : 'fill-violet-600 text-violet-600'}`} />
                              {isMarkingRead ? 'Marking read...' : noteIsRead ? 'Read' : 'Unread'}
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
                        {showNoteTaskName ? (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Notes For: <span className="text-slate-900">{noteTaskName}</span>
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm leading-5 text-slate-900">{getNoteText(note)}</p>
                        <div className="mt-2" />
                      </article>
                    )
                  })
                : noteThreads.map((node) => renderPublicNode(node))}
            </div>
          )}
        </div>

        {!hideComposer ? (
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="mb-1 text-sm font-semibold text-gray-900">Create Note</div>
            {isDirectedTab ? (
              <div className="relative mb-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">To</div>
                  <div className="min-w-0 flex-1">
                    {selectedMentionUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMentionUsers.map(({ value, user }) => {
                          const label = user ? getMentionLabel(user) : value
                          return (
                            <div
                              key={`selected-directed-user-${value}`}
                              className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700"
                            >
                              <span className="truncate">To User: {label}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRecipient(value)}
                                className="rounded p-0.5 hover:bg-blue-100"
                                aria-label={`Remove ${label}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                        No recipient selected
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecipientPickerOpen((prev) => !prev)}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    aria-label={selectedMentionUsers.length > 0 ? 'Change recipient' : 'Select recipient'}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{selectedMentionUsers.length > 0 ? 'Add More' : 'Select'}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${recipientPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {recipientPickerOpen ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-2">
                      <input
                        type="text"
                        value={recipientQuery}
                        onChange={(e) => setRecipientQuery(e.target.value)}
                        placeholder="Search recipient..."
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {mentionUsersLoading ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Loading users...</div>
                      ) : filteredRecipientUsers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">No users found</div>
                      ) : (
                        filteredRecipientUsers.map((user) => {
                          const label = getMentionLabel(user)
                          const mentionValue = getMentionValue(user)
                          const isSelected =
                            selectedToUserValues.includes(user.id) ||
                            selectedToUserValues.includes(mentionValue)

                          return (
                            <button
                              key={`recipient-${user.id}`}
                              type="button"
                              onClick={() => handleRecipientPick(user)}
                              className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50 ${
                                isSelected ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#185087] text-[11px] font-semibold text-white">
                                {getInitials(label)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-slate-900">{label}</div>
                                <div className="text-[11px] text-slate-500">
                                  {getMentionValue(user)}
                                  {user.userRole ? ` • ${user.userRole}` : ''}
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
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
                    ? 'Add a direct note... (@ is optional for quick recipient search)'
                    : isOutgoingTab
                      ? 'Add an outgoing note... (@ to select ToUsers)'
                      : isPrivateTab
                      ? 'Add a private note...'
                      : `Add a ${composePrivate ? 'private' : 'public'} note... (@ to mention)`
                }
              />
              {mentionOpen && (!isPrivateTab || isOutgoingTab || isDirectedTab) ? (
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

          {(!isPrivateTab || isOutgoingTab) && !isDirectedTab ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMentionButtonClick}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <AtSign className="h-3.5 w-3.5" />
                {isDirectedTab || isOutgoingTab ? 'ToUsers' : 'Mention'}
              </button>
              {selectedMentionUsers.length > 0 ? (
                selectedMentionUsers.map(({ value, user }) => {
                  const label = user ? getMentionLabel(user) : value
                  return (
                    <span
                      key={`selected-to-user-${value}`}
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                    >
                      To User: {label}
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(value)}
                        className="rounded p-0.5 hover:bg-blue-100"
                        aria-label={`Remove ${label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })
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
    </>
  )

  if (isEmbedded) {
    return (
      <div className="flex h-full min-h-[36rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {notesContent}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {notesContent}
      </div>
    </div>
  )
}
