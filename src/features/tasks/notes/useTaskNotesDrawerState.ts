import { useCallback, useMemo, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { fetchTaskNotes } from '@/features/tasks/api'
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
  private: number
  public: number
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
  private: [],
  public: [],
  toMe: [],
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

  const fetchNotesByVisibility = useCallback(
    async ({ contextKey, taskId, tab }: { contextKey: string; taskId?: string; tab: NoteTab }) => {
      const loadingKey = `${contextKey}:${tab}`
      setLoadingByKey((prev) => ({ ...prev, [loadingKey]: true }))

      try {
        const fetchParams: {
          taskId?: string
          applicationId?: number | null
          isPrivate?: boolean
          token?: string
        } = {
          taskId,
          applicationId: applicationId ?? null,
          token: token ?? undefined,
        }

        if (tab === 'private') {
          fetchParams.isPrivate = true
        } else if (tab === 'public') {
          fetchParams.isPrivate = false
        }

        const notes = await fetchTaskNotes(fetchParams)

        setNotesByContext((prev) => ({
          ...prev,
          [contextKey]: {
            private: tab === 'private' ? (notes as TaskNote[]) : prev[contextKey]?.private ?? [],
            public: tab === 'public' ? (notes as TaskNote[]) : prev[contextKey]?.public ?? [],
            toMe: tab === 'toMe' ? (notes as TaskNote[]) : prev[contextKey]?.toMe ?? [],
          },
        }))

        setCountsByContext((prev) => ({
          ...prev,
          [contextKey]: {
            private: tab === 'private' ? notes.length : prev[contextKey]?.private ?? 0,
            public: tab === 'public' ? notes.length : prev[contextKey]?.public ?? 0,
          },
        }))

        setError('')
      } catch (fetchError) {
        const message = buildFetchErrorMessage(fetchError)
        setError(message)
        onError?.(message)
      } finally {
        setLoadingByKey((prev) => ({ ...prev, [loadingKey]: false }))
      }
    },
    [applicationId, onError, token, username],
  )

  const openDrawer = useCallback(
    async ({ contextKey, taskId, taskName, tab }: OpenDrawerParams) => {
      setDrawer({
        contextKey,
        taskId,
        taskName,
        activeTab: tab,
      })
      setError('')
      setComposePrivateState(tab === 'private')

      await Promise.allSettled([
        fetchNotesByVisibility({ contextKey, taskId, tab: 'private' }),
        fetchNotesByVisibility({ contextKey, taskId, tab: 'public' }),
        fetchNotesByVisibility({ contextKey, taskId, tab: 'toMe' }),
      ])
    },
    [fetchNotesByVisibility],
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
    setDrawer((prev) => (prev ? { ...prev, activeTab: tab } : prev))
    setComposePrivateState(tab === 'private')
  }, [])

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

    await createTaskNoteMutation.mutateAsync({
      taskId: drawer.taskId,
      applicationId: applicationId ?? null,
      note: trimmedText,
      isPrivate: composePrivate,
      priority: 'NORMAL',
      fromUser: username ?? undefined,
      toUser: composeToUserId ?? undefined,
      token: token ?? undefined,
    })

    setError('')
    setComposeTextState('')
    setComposeToUserIdState(null)

    const postedTab: NoteTab = composePrivate ? 'private' : 'public'
    await fetchNotesByVisibility({
      contextKey: drawer.contextKey,
      taskId: drawer.taskId,
      tab: postedTab,
    })
    setDrawer((prev) => (prev ? { ...prev, activeTab: postedTab } : prev))
  }, [
    applicationId,
    composePrivate,
    composeText,
    composeToUserId,
    createTaskNoteMutation,
    drawer,
    fetchNotesByVisibility,
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
        isPrivate: false,
        fromUser: username ?? undefined,
        parentMessageId,
        toUser: toUser ?? undefined,
        token: token ?? undefined,
      })

      setError('')
      const replyTab: NoteTab = drawer.activeTab === 'toMe' ? 'toMe' : 'public'
      await fetchNotesByVisibility({
        contextKey: drawer.contextKey,
        taskId: drawer.taskId,
        tab: replyTab,
      })
    },
    [
      applicationId,
      createTaskNoteMutation,
      drawer,
      fetchNotesByVisibility,
      token,
      username,
    ],
  )

  const activeNotes = useMemo(() => {
    if (!drawer) {
      return EMPTY_NOTES
    }

    return notesByContext[drawer.contextKey] ?? EMPTY_NOTES
  }, [drawer, notesByContext])

  const activeLoading = useMemo(
    () => ({
      private: drawer ? Boolean(loadingByKey[`${drawer.contextKey}:private`]) : false,
      public: drawer ? Boolean(loadingByKey[`${drawer.contextKey}:public`]) : false,
      toMe: drawer ? Boolean(loadingByKey[`${drawer.contextKey}:toMe`]) : false,
    }),
    [drawer, loadingByKey],
  )

  const getCounts = useCallback(
    (contextKey: string): ContextCounts => countsByContext[contextKey] ?? { private: 0, public: 0 },
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
    composeText,
    composeToUserId,
    composePrivate,
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
    getCounts,
    isLoading,
  }
}
