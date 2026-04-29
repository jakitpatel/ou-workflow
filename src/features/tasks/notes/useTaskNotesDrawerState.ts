import { useCallback, useMemo, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { fetchMyMessages, markTaskNoteAsRead } from '@/features/tasks/api'
import { useCreateTaskNoteMutation } from '@/features/tasks/hooks/useTaskMutations'
import type { TaskNote } from '@/types/application'
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

const isTaskNoteRead = (note: TaskNote): boolean => {
  const value = (note as any)?.isRead
  if (value === true) return true
  if (value === false || value === undefined || value === null) return false

  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

export function useTaskNotesDrawerState({
  applicationId,
  includeApplicationLists = true,
  includePrelimLists = true,
  onError,
}: UseTaskNotesDrawerStateParams) {
  const { username, token } = useUser()
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [notesByContext, setNotesByContext] = useState<Record<string, NotesByTab<TaskNote>>>({})
  const [countsByContext, setCountsByContext] = useState<Record<string, ContextCounts>>({})
  const [loadingByKey, setLoadingByKey] = useState<Record<string, boolean>>({})
  const [composeText, setComposeTextState] = useState('')
  const [composeToUserId, setComposeToUserIdState] = useState<string | null>(null)
  const [composePrivate, setComposePrivateState] = useState(false)
  const [markingReadMessageId, setMarkingReadMessageId] = useState<string | null>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null)
  const [selectedApplicationFilterId, setSelectedApplicationFilterId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const createTaskNoteMutation = useCreateTaskNoteMutation({
    includeApplicationLists,
    includePrelimLists,
    onError: (message) => {
      setError(message)
      onError?.(message)
    },
  })

  const fetchNotes = useCallback(
    async ({ contextKey, taskId }: { contextKey: string; taskId?: string }) => {
      const loadingKeys: NoteTab[] = ['incoming', 'outgoing', 'mention', 'private']
      setLoadingByKey((prev) => {
        const next = { ...prev }
        for (const tab of loadingKeys) {
          next[`${contextKey}:${tab}`] = true
        }
        return next
      })

      try {
        const notes = await fetchMyMessages({
          taskId,
          applicationId: applicationId ?? null,
          token: token ?? undefined,
        })

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

        setError('')
      } catch (fetchError) {
        const message = buildFetchErrorMessage(fetchError)
        setError(message)
        onError?.(message)
      } finally {
        setLoadingByKey((prev) => {
          const next = { ...prev }
          for (const tab of loadingKeys) {
            next[`${contextKey}:${tab}`] = false
          }
          return next
        })
      }
    },
    [applicationId, onError, token],
  )

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

      await fetchNotes({ contextKey, taskId })
    },
    [fetchNotes, resetComposeDraft],
  )

  const closeDrawer = useCallback(() => {
    if (createTaskNoteMutation.isPending) {
      return
    }

    setDrawer(null)
    setError('')
    setComposeTextState('')
    setComposeToUserIdState(null)
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
    setComposeToUserIdState(value)
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
    if (!trimmedText) {
      setError('Note text is required')
      return
    }
    if ((drawer.activeTab === 'incoming' || drawer.activeTab === 'outgoing') && !composeToUserId) {
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
      priority: 'NORMAL',
      fromUser: username ?? undefined,
      toUser: isIncomingTab || isOutgoingTab ? composeToUserId ?? undefined : undefined,
      token: token ?? undefined,
    })

    setError('')
    setComposeTextState('')
    setComposeToUserIdState(null)

    await fetchNotes({
      contextKey: drawer.contextKey,
      taskId: drawer.taskId,
    })
  }, [
    applicationId,
    composePrivate,
    composeText,
    composeToUserId,
    createTaskNoteMutation,
    drawer,
    fetchNotes,
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
        fromUser: username ?? undefined,
        parentMessageId,
        toUser: toUser ?? undefined,
        token: token ?? undefined,
      })

      setError('')
      await fetchNotes({
        contextKey: drawer.contextKey,
        taskId: drawer.taskId,
      })
    },
    [
      applicationId,
      createTaskNoteMutation,
      drawer,
      fetchNotes,
      token,
      username,
    ],
  )

  const markIncomingNoteRead = useCallback(
    async (note: TaskNote) => {
      if (!drawer) return
      if (drawer.activeTab !== 'incoming') return
      if (isTaskNoteRead(note)) return

      const messageId = getMessageId(note)
      if (!messageId || markingReadMessageId === messageId) return

      setMarkingReadMessageId(messageId)
      try {
        await markTaskNoteAsRead({
          messageId,
          token: token ?? undefined,
        })

        await fetchNotes({
          contextKey: drawer.contextKey,
          taskId: drawer.taskId,
        })
      } catch (markReadError) {
        const message = buildFetchErrorMessage(markReadError)
        setError(message)
        onError?.(message)
      } finally {
        setMarkingReadMessageId((current) => (current === messageId ? null : current))
      }
    },
    [drawer, fetchNotes, markingReadMessageId, onError, token],
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
    getCounts,
    isLoading,
  }
}
