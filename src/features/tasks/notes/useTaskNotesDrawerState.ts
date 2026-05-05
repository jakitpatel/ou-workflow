import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import type { MyMessagesByTab } from '@/features/tasks/api'
import { fetchMyMessages, markTaskNoteAsRead, updateTaskNoteTag } from '@/features/tasks/api'
import { useCreateTaskNoteMutation } from '@/features/tasks/hooks/useTaskMutations'
import { useSSE, type SSEMessage } from '@/hooks/useSSE'
import type { TaskNote, TaskNoteReaction } from '@/types/application'
import type { NoteTab, NotesByTab } from './types'

type DrawerState = {
  contextKey: string
  taskId?: string
  taskName: string
  activeTab: NoteTab
}

type ContextCounts = {
  incoming: number
  outgoing: number
  mention: number
  private: number
}

type DrawerDataTab = keyof NotesByTab<TaskNote>

type OpenDrawerParams = {
  contextKey: string
  taskId?: string
  taskName: string
  tab: NoteTab
}

type CreateReplyParams = {
  parentMessageId: string
  text: string
  applicationId?: number | null
  taskId?: string
  toUser?: string | null
}

type UseTaskNotesDrawerStateParams = {
  applicationId?: number | null
  includeApplicationLists?: boolean
  includePrelimLists?: boolean
  onError?: (message: string) => void
}

const EMPTY_NOTES: NotesByTab<TaskNote> = {
  incoming: [],
  outgoing: [],
  mention: [],
  private: [],
}

const buildFetchErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      details?: { status?: string; message?: string }
      message?: string
    }

    return (
      maybeError.details?.status ??
      maybeError.details?.message ??
      maybeError.message ??
      'Failed to fetch notes'
    )
  }

  return 'Failed to fetch notes'
}

const normalizeComposeToUsers = (value: string | null): string | null => {
  if (!value) return null

  const normalized = Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )

  return normalized.length > 0 ? normalized.join(',') : null
}

const normalizeNoteTab = (tab: NoteTab): NoteTab => {
  if (tab === 'directed') return 'incoming'
  if (tab === 'outgoing') return 'incoming'
  if (tab === 'public') return 'mention'
  return tab
}

const getMessageId = (note: TaskNote): string | null => {
  const candidate = (note as any)?.MessageID ?? (note as any)?.messageId ?? (note as any)?.id
  if (candidate === undefined || candidate === null) return null

  const value = String(candidate).trim()
  return value ? value : null
}

const getParentMessageId = (note: TaskNote): string | null => {
  const candidate =
    (note as any)?.parentMessageId ??
    (note as any)?.ParentMessageId ??
    (note as any)?.parent_message_id

  if (candidate === undefined || candidate === null) return null

  const value = String(candidate).trim()
  if (!value || value === '0') return null
  return value
}

const normalizeMessageId = (value: unknown): string | null => {
  if (value === undefined || value === null) return null

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

const getVisibleRootMessageIds = (notes: TaskNote[]): Set<string> => {
  const noteById = new Map<string, TaskNote>()
  for (const note of notes) {
    const messageId = getMessageId(note)
    if (messageId) noteById.set(messageId, note)
  }

  const rootMessageIds = new Set<string>()

  for (const note of notes) {
    let currentNote = note
    let currentMessageId = getMessageId(currentNote)
    let parentMessageId = getParentMessageId(currentNote)
    const visitedMessageIds = new Set<string>()

    while (currentMessageId && parentMessageId && noteById.has(parentMessageId)) {
      if (visitedMessageIds.has(currentMessageId)) break
      visitedMessageIds.add(currentMessageId)

      currentNote = noteById.get(parentMessageId) as TaskNote
      currentMessageId = getMessageId(currentNote)
      parentMessageId = getParentMessageId(currentNote)
    }

    const rootMessageId = parentMessageId && !noteById.has(parentMessageId) ? parentMessageId : currentMessageId
    if (rootMessageId) rootMessageIds.add(rootMessageId)
  }

  return rootMessageIds
}

const isRefreshMessagesEvent = (message: SSEMessage): boolean => {
  if (!message || typeof message !== 'object') return false

  const eventType =
    (message as { type?: unknown }).type ??
    ((message as { data?: { type?: unknown } }).data?.type)
  const normalizedEventType = String(eventType ?? '').trim().toLowerCase()

  return normalizedEventType === 'refresh_message' || normalizedEventType === 'refresh_messages'
}

const getSSEConversationId = (message: SSEMessage): string | null => {
  if (!message || typeof message !== 'object') return null

  const data = (message as { data?: Record<string, unknown> }).data
  return normalizeMessageId(
    data?.root_conversation_id ??
      (message as { root_conversation_id?: unknown }).root_conversation_id,
  )
}

const getSSEMessageId = (message: SSEMessage): string | null => {
  if (!message || typeof message !== 'object') return null

  const data = (message as { data?: Record<string, unknown> }).data
  return normalizeMessageId(
    data?.MessageId ??
      data?.MessageID ??
      data?.messageId ??
      (message as { MessageId?: unknown; MessageID?: unknown; messageId?: unknown }).MessageId ??
      (message as { MessageID?: unknown }).MessageID ??
      (message as { messageId?: unknown }).messageId,
  )
}

const getSSEToUser = (message: SSEMessage): string | null => {
  if (!message || typeof message !== 'object') return null

  const data = (message as { data?: Record<string, unknown> }).data
  const toUser =
    data?.ToUser ??
    data?.toUser ??
    data?.to_user ??
    (message as { ToUser?: unknown; toUser?: unknown; to_user?: unknown }).ToUser ??
    (message as { toUser?: unknown }).toUser ??
    (message as { to_user?: unknown }).to_user

  if (toUser === undefined || toUser === null) return null

  const value = String(toUser).trim()
  return value ? value : null
}

const isTaskNoteRead = (note: TaskNote): boolean => {
  const value = (note as any)?.isRead
  if (value === true) return true
  if (value === false || value === undefined || value === null) return false

  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

const normalizeComparableUserName = (value: string): string =>
  value.trim().replace(/^@/, '').replace(/[^a-z0-9]/gi, '').toLowerCase()

const noteTargetsCurrentUser = (note: TaskNote, currentUsername?: string | null): boolean => {
  const normalizedCurrentUsername = normalizeComparableUserName(currentUsername ?? '')
  if (!normalizedCurrentUsername) return false

  const rawToUser =
    (note as any)?.ToUser ??
    (note as any)?.toUser ??
    (note as any)?.to_user

  if (rawToUser === undefined || rawToUser === null) return false

  return String(rawToUser)
    .split(',')
    .map((value) => normalizeComparableUserName(value))
    .filter(Boolean)
    .includes(normalizedCurrentUsername)
}

const sseToUserTargetsCurrentUser = (message: SSEMessage, currentUsername?: string | null): boolean => {
  const normalizedCurrentUsername = normalizeComparableUserName(currentUsername ?? '')
  if (!normalizedCurrentUsername) return false

  const toUser = getSSEToUser(message)
  if (!toUser) return false

  return toUser
    .split(',')
    .map((value) => normalizeComparableUserName(value))
    .filter(Boolean)
    .includes(normalizedCurrentUsername)
}

const isNewRootConversationForCurrentUser = (
  message: SSEMessage,
  currentUsername?: string | null,
): boolean => {
  const conversationId = getSSEConversationId(message)
  const messageId = getSSEMessageId(message)

  return Boolean(
    conversationId &&
      messageId &&
      conversationId === messageId &&
      sseToUserTargetsCurrentUser(message, currentUsername),
  )
}

export function useTaskNotesDrawerState({
  applicationId,
  includeApplicationLists = true,
  includePrelimLists = true,
  onError,
}: UseTaskNotesDrawerStateParams) {
  const { username, token } = useUser()
  const { apiBaseUrl } = useAppPreferences()
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [notesByContext, setNotesByContext] = useState<Record<string, NotesByTab<TaskNote>>>({})
  const [countsByContext, setCountsByContext] = useState<Record<string, ContextCounts>>({})
  const [loadingByKey, setLoadingByKey] = useState<Record<string, boolean>>({})
  const [loadedContexts, setLoadedContexts] = useState<Record<string, boolean>>({})
  const [composeText, setComposeTextState] = useState('')
  const [composeToUserId, setComposeToUserIdState] = useState<string | null>(null)
  const [composePrivate, setComposePrivateState] = useState(false)
  const [markingReadMessageId, setMarkingReadMessageId] = useState<string | null>(null)
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null)
  const [selectedApplicationFilterId, setSelectedApplicationFilterId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const applyFetchedNotes = useCallback((contextKey: string, notes: MyMessagesByTab) => {
    setNotesByContext((prev) => ({
      ...prev,
      [contextKey]: {
        incoming: notes.incoming as TaskNote[],
        outgoing: notes.outgoing as TaskNote[],
        mention: notes.mention as TaskNote[],
        private: notes.private as TaskNote[],
      },
    }))

    setCountsByContext((prev) => ({
      ...prev,
      [contextKey]: {
        incoming: notes.incoming.length,
        outgoing: notes.outgoing.length,
        mention: notes.mention.length,
        private: notes.private.length,
      },
    }))
    setLoadedContexts((prev) => ({ ...prev, [contextKey]: true }))
  }, [])

  const setContextLoading = useCallback((contextKey: string, isLoading: boolean) => {
    const loadingKeys: NoteTab[] = ['incoming', 'outgoing', 'mention', 'private']
    setLoadingByKey((prev) => {
      const next = { ...prev }
      for (const tab of loadingKeys) {
        next[`${contextKey}:${tab}`] = isLoading
      }
      return next
    })
  }, [])

  const createTaskNoteMutation = useCreateTaskNoteMutation({
    includeApplicationLists,
    includePrelimLists,
    onError: (message) => {
      setError(message)
      onError?.(message)
    },
  })

  const isMessageDrawerOpen = Boolean(drawer)
  const activeContextKey = drawer?.contextKey ?? null
  const activeTaskId = drawer?.taskId
  const isPollingPaused =
    createTaskNoteMutation.isPending ||
    Boolean(markingReadMessageId) ||
    Boolean(reactingMessageId)

  const messagesQuery = useQuery({
    queryKey: ['task-notes-drawer-messages', applicationId ?? null, activeContextKey, activeTaskId ?? null],
    queryFn: () =>
      fetchMyMessages({
        taskId: activeTaskId,
        applicationId: applicationId ?? null,
        token: token ?? undefined,
      }),
    enabled: Boolean(token) && isMessageDrawerOpen && Boolean(activeContextKey),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: isMessageDrawerOpen && !isPollingPaused ? 30000 : false,
    refetchIntervalInBackground: false,
  })

  const sseEndpoint = useMemo(() => {
    const normalizedBaseUrl = apiBaseUrl?.trim().replace(/\/+$/, '')
    return normalizedBaseUrl ? `${normalizedBaseUrl}/events` : '/events'
  }, [apiBaseUrl])

  const visibleRootMessageIds = useMemo(() => {
    if (!drawer) return new Set<string>()

    const activeNotesTab = normalizeNoteTab(drawer.activeTab) as DrawerDataTab
    return getVisibleRootMessageIds(
      (notesByContext[drawer.contextKey] ?? EMPTY_NOTES)[activeNotesTab] ?? [],
    )
  }, [drawer, notesByContext])

  const handleSSEMessage = useCallback(
    (message: SSEMessage) => {
      if (!drawer) return
      if (!isRefreshMessagesEvent(message)) return

      const conversationId = getSSEConversationId(message)
      const shouldRefreshVisibleConversation =
        Boolean(conversationId) && visibleRootMessageIds.has(conversationId as string)
      const shouldRefreshNewConversation = isNewRootConversationForCurrentUser(message, username)

      if (!shouldRefreshVisibleConversation && !shouldRefreshNewConversation) return

      void messagesQuery.refetch()
    },
    [drawer, messagesQuery, username, visibleRootMessageIds],
  )

  useSSE(handleSSEMessage, {
    endpoint: sseEndpoint,
    enabled: Boolean(token) && isMessageDrawerOpen,
  })

  useEffect(() => {
    if (!activeContextKey) return
    const hasLoadedContext = Boolean(loadedContexts[activeContextKey])
    setContextLoading(activeContextKey, messagesQuery.isFetching && !hasLoadedContext)
  }, [activeContextKey, loadedContexts, messagesQuery.isFetching, setContextLoading])

  useEffect(() => {
    if (!activeContextKey || !messagesQuery.data) return
    applyFetchedNotes(activeContextKey, messagesQuery.data)
  }, [activeContextKey, applyFetchedNotes, messagesQuery.data])

  useEffect(() => {
    if (!activeContextKey || !messagesQuery.error) return
    const message = buildFetchErrorMessage(messagesQuery.error)
    setError(message)
    onError?.(message)
  }, [activeContextKey, messagesQuery.error, onError])

  const refetchNotes = useCallback(async () => {
    if (!drawer) return
    await messagesQuery.refetch()
  }, [drawer, messagesQuery])

  const resetComposeDraft = useCallback((tab: NoteTab) => {
    const normalizedTab = normalizeNoteTab(tab)
    setComposeTextState('')
    setComposeToUserIdState(null)
    setComposePrivateState(
      normalizedTab === 'private' || normalizedTab === 'incoming' || normalizedTab === 'outgoing',
    )
    setError('')
  }, [])

  const openDrawer = useCallback(
    async ({ contextKey, taskId, taskName, tab }: OpenDrawerParams) => {
      const normalizedTab = normalizeNoteTab(tab)
      setDrawer({
        contextKey,
        taskId,
        taskName,
        activeTab: normalizedTab,
      })
      resetComposeDraft(normalizedTab)
    },
    [resetComposeDraft],
  )

  const closeDrawer = useCallback(() => {
    if (createTaskNoteMutation.isPending) {
      return
    }

    setDrawer(null)
    setError('')
    setComposeTextState('')
    setComposeToUserIdState(null)
    setComposePrivateState(false)
  }, [createTaskNoteMutation.isPending])

  const setActiveTab = useCallback((tab: NoteTab) => {
    const normalizedTab = normalizeNoteTab(tab)
    setDrawer((prev) => (prev ? { ...prev, activeTab: normalizedTab } : prev))
    resetComposeDraft(normalizedTab)
  }, [resetComposeDraft])

  const setComposeText = useCallback((text: string) => {
    setComposeTextState(text)
    setError('')
  }, [])

  const setComposeToUserId = useCallback((value: string | null) => {
    setComposeToUserIdState(normalizeComposeToUsers(value))
  }, [])

  const setComposePrivate = useCallback((value: boolean) => {
    setComposePrivateState(value)
  }, [])

  const openApplicationDetails = useCallback((nextApplicationId: number) => {
    setSelectedApplicationId(nextApplicationId)
  }, [])

  const closeApplicationDetails = useCallback(() => {
    setSelectedApplicationId(null)
  }, [])

  const openApplicationFilter = useCallback((nextApplicationId: number) => {
    setSelectedApplicationFilterId(nextApplicationId)
  }, [])

  const closeApplicationFilter = useCallback(() => {
    setSelectedApplicationFilterId(null)
  }, [])

  const submitNote = useCallback(async () => {
    if (!drawer) return

    const trimmedText = composeText.trim()
    const normalizedToUser = normalizeComposeToUsers(composeToUserId)
    if (!trimmedText) {
      setError('Note text is required')
      return
    }
    if ((drawer.activeTab === 'incoming' || drawer.activeTab === 'outgoing') && !normalizedToUser) {
      setError(`${drawer.activeTab === 'incoming' ? 'Direct' : 'Outgoing'} notes require a To User`)
      return
    }

    const isIncomingTab = drawer.activeTab === 'incoming'
    const isOutgoingTab = drawer.activeTab === 'outgoing'
    const isMentionTab = drawer.activeTab === 'mention'
    const isPrivateTab = drawer.activeTab === 'private' || isOutgoingTab

    await createTaskNoteMutation.mutateAsync({
      taskId: drawer.taskId,
      applicationId: applicationId ?? null,
      note: trimmedText,
      isPrivate: isIncomingTab ? true : isMentionTab ? false : isPrivateTab ? true : composePrivate,
      isRead: false,
      priority: 'NORMAL',
      fromUser: username ?? undefined,
      toUser: isIncomingTab || isOutgoingTab ? normalizedToUser ?? undefined : undefined,
      token: token ?? undefined,
    })

    setError('')
    setComposeTextState('')
    setComposeToUserIdState(null)

    await refetchNotes()
  }, [
    applicationId,
    composePrivate,
    composeText,
    composeToUserId,
    createTaskNoteMutation,
    drawer,
    refetchNotes,
    token,
    username,
  ])

  const submitReply = useCallback(
    async ({ parentMessageId, text, applicationId: replyApplicationId, taskId: replyTaskId, toUser }: CreateReplyParams) => {
      if (!drawer) return

      const trimmedText = text.trim()
      if (!trimmedText) {
        setError('Reply text is required')
        return
      }

      await createTaskNoteMutation.mutateAsync({
        taskId: replyTaskId ?? drawer.taskId,
        applicationId: replyApplicationId ?? applicationId ?? null,
        note: trimmedText,
        isPrivate: drawer.activeTab === 'incoming' || drawer.activeTab === 'private' || drawer.activeTab === 'outgoing',
        isRead: false,
        fromUser: username ?? undefined,
        parentMessageId,
        toUser: toUser ?? undefined,
        token: token ?? undefined,
      })

      setError('')
      await refetchNotes()
    },
    [
      applicationId,
      createTaskNoteMutation,
      drawer,
      refetchNotes,
      token,
      username,
    ],
  )

  const markIncomingNoteRead = useCallback(
    async (note: TaskNote) => {
      if (!drawer) return
      if (drawer.activeTab !== 'incoming') return
      if (isTaskNoteRead(note)) return
      if (!noteTargetsCurrentUser(note, username)) return

      const messageId = getMessageId(note)
      if (!messageId || markingReadMessageId === messageId) return

      setMarkingReadMessageId(messageId)
      try {
        await markTaskNoteAsRead({
          messageId,
          token: token ?? undefined,
        })

        await refetchNotes()
      } catch (markReadError) {
        const message = buildFetchErrorMessage(markReadError)
        setError(message)
        onError?.(message)
      } finally {
        setMarkingReadMessageId((current) => (current === messageId ? null : current))
      }
    },
    [drawer, markingReadMessageId, onError, refetchNotes, token, username],
  )

  const updateMessageReactionTag = useCallback(
    async (messageId: string | number, tag: TaskNoteReaction[]) => {
      if (!drawer) return

      const resolvedMessageId = String(messageId).trim()
      if (!resolvedMessageId || reactingMessageId === resolvedMessageId) return

      setReactingMessageId(resolvedMessageId)
      try {
        await updateTaskNoteTag({
          messageId: resolvedMessageId,
          tag,
          token: token ?? undefined,
        })

        await refetchNotes()
      } catch (reactionError) {
        const message = buildFetchErrorMessage(reactionError)
        setError(message)
        onError?.(message)
        throw reactionError
      } finally {
        setReactingMessageId((current) => (current === resolvedMessageId ? null : current))
      }
    },
    [drawer, onError, reactingMessageId, refetchNotes, token],
  )

  const activeNotes = useMemo(() => {
    if (!drawer) {
      return EMPTY_NOTES
    }

    return notesByContext[drawer.contextKey] ?? EMPTY_NOTES
  }, [drawer, notesByContext])

  const activeLoading = useMemo(
    () => ({
      incoming: drawer ? Boolean(loadingByKey[`${drawer.contextKey}:incoming`]) : false,
      outgoing: drawer ? Boolean(loadingByKey[`${drawer.contextKey}:outgoing`]) : false,
      mention: drawer ? Boolean(loadingByKey[`${drawer.contextKey}:mention`]) : false,
      private: drawer ? Boolean(loadingByKey[`${drawer.contextKey}:private`]) : false,
    }),
    [drawer, loadingByKey],
  )

  const getCounts = useCallback(
    (contextKey: string): ContextCounts =>
      countsByContext[contextKey] ?? { incoming: 0, outgoing: 0, mention: 0, private: 0 },
    [countsByContext],
  )

  const isLoading = useCallback(
    (contextKey: string, tab: NoteTab) => Boolean(loadingByKey[`${contextKey}:${tab}`]),
    [loadingByKey],
  )

  return {
    drawer,
    activeNotes,
    activeLoading,
    currentUsername: username,
    composeText,
    composeToUserId,
    composePrivate,
    markingReadMessageId,
    reactingMessageId,
    error,
    isSubmitting: createTaskNoteMutation.isPending,
    openDrawer,
    closeDrawer,
    setActiveTab,
    setComposeText,
    setComposeToUserId,
    setComposePrivate,
    selectedApplicationId,
    selectedApplicationFilterId,
    openApplicationDetails,
    closeApplicationDetails,
    openApplicationFilter,
    closeApplicationFilter,
    submitNote,
    submitReply,
    markIncomingNoteRead,
    updateMessageReactionTag,
    getCounts,
    isLoading,
  }
}
