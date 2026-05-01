import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import { useInfiniteApplications } from '@/features/applications/hooks/useInfiniteApplications'
import { usePagedApplications } from '@/features/applications/hooks/usePagedApplications'
import {
  fetchMyMessages,
  markTaskNoteAsRead,
  updateTaskNoteTag,
  type MyMessagesByTab,
} from '@/features/tasks/api'
import { useCreateTaskNoteMutation } from '@/features/tasks/hooks/useTaskMutations'
import { useDebounce } from '@/hooks/useDebounce'
import type { Applicant, TaskNote, TaskNoteReaction } from '@/types/application'

const PAGE_LIMIT = 50
const DEBOUNCE_DELAY = 1000

type DashboardSearch = {
  q: string
  status: string
  priority: string
  page: number
  applicationId?: number
  myOnly: boolean
}

type UseNcrcDashboardStateParams = {
  search: DashboardSearch
  navigate: (params: {
    search: (prev: DashboardSearch) => DashboardSearch
  }) => void
}


const normalizeMyNotesWithApplicationId = (notes: TaskNote[]): TaskNote[] =>
  notes.map((note) => {
    const rawApplicationId =
      (note as any)?.ApplicationID ?? (note as any)?.applicationId ?? (note as any)?.ApplicationId
    const parsedApplicationId = Number(rawApplicationId)

    return Number.isFinite(parsedApplicationId)
      ? { ...note, ApplicationID: parsedApplicationId }
      : note
  })

const normalizeMyMessagesWithApplicationId = (messages: MyMessagesByTab): MyMessagesByTab => ({
  incoming: normalizeMyNotesWithApplicationId(messages.incoming),
  outgoing: normalizeMyNotesWithApplicationId(messages.outgoing),
  mention: normalizeMyNotesWithApplicationId(messages.mention),
  private: normalizeMyNotesWithApplicationId(messages.private),
})

const EMPTY_MY_MESSAGES: MyMessagesByTab = {
  incoming: [],
  outgoing: [],
  mention: [],
  private: [],
}

const getMyNoteMessageId = (note: TaskNote): string | null => {
  const candidate = (note as any)?.MessageID ?? (note as any)?.messageId ?? (note as any)?.id
  if (candidate === undefined || candidate === null) return null

  const value = String(candidate).trim()
  return value ? value : null
}

const isMyNoteRead = (note: TaskNote): boolean => {
  const value = (note as any)?.isRead
  if (value === true) return true
  if (value === false || value === undefined || value === null) return false

  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

export function useNcrcDashboardState({
  search,
  navigate,
}: UseNcrcDashboardStateParams) {
  const { q, status, priority, page, applicationId, myOnly } = search
  const { token, username } = useUser()
  const { paginationMode } = useAppPreferences()

  const [myNotesOpen, setMyNotesOpen] = useState(false)
  const [myNotes, setMyNotes] = useState<MyMessagesByTab>(EMPTY_MY_MESSAGES)
  const [myNotesLoading, setMyNotesLoading] = useState(false)
  const [myNotesError, setMyNotesError] = useState('')
  const [myNotesMarkingReadMessageId, setMyNotesMarkingReadMessageId] = useState<string | null>(null)
  const [myNotesReactingMessageId, setMyNotesReactingMessageId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const debouncedSearch = useDebounce(q, DEBOUNCE_DELAY)
  const createTaskNoteMutation = useCreateTaskNoteMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => setMyNotesError(message),
  })
  const isMyNotesPollingPaused =
    createTaskNoteMutation.isPending ||
    Boolean(myNotesMarkingReadMessageId) ||
    Boolean(myNotesReactingMessageId)

  const pagedQuery = usePagedApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    priorityFilter: priority,
    applicationId,
    myOnly,
    page,
    limit: PAGE_LIMIT,
    enabled: paginationMode === 'paged',
  })

  const infiniteQuery = useInfiniteApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    priorityFilter: priority,
    applicationId,
    myOnly,
    enabled: paginationMode === 'infinite',
  })

  const isLoading = paginationMode === 'paged' ? pagedQuery.isLoading : infiniteQuery.isLoading
  const isError = paginationMode === 'paged' ? pagedQuery.isError : infiniteQuery.isError
  const error = paginationMode === 'paged' ? pagedQuery.error : infiniteQuery.error

  const applicants: Applicant[] = useMemo(
    () =>
      paginationMode === 'paged'
        ? pagedQuery.data?.data ?? []
        : infiniteQuery.data?.pages.flatMap((currentPage) => currentPage.data) ?? [],
    [infiniteQuery.data?.pages, pagedQuery.data?.data, paginationMode],
  )

  const totalCount =
    paginationMode === 'paged'
      ? pagedQuery.data?.meta?.total_count ?? 0
      : infiniteQuery.data?.pages?.[0]?.meta?.total_count ?? 0

  const totalPages = Math.ceil(totalCount / PAGE_LIMIT)

  const updateSearch = useCallback(
    (updates: Partial<DashboardSearch>) => {
      navigate({
        search: (prev) => {
          const next = { ...prev, ...updates }
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
        },
      })
    },
    [navigate],
  )

  const handleFirst = useCallback(() => updateSearch({ page: 0 }), [updateSearch])
  const handlePrev = useCallback(
    () => updateSearch({ page: Math.max(page - PAGE_LIMIT, 0) }),
    [page, updateSearch],
  )
  const handleNext = useCallback(
    () => updateSearch({ page: page + PAGE_LIMIT < totalCount ? page + PAGE_LIMIT : page }),
    [page, totalCount, updateSearch],
  )
  const handleLast = useCallback(
    () => updateSearch({ page: (totalPages - 1) * PAGE_LIMIT }),
    [totalPages, updateSearch],
  )

  useEffect(() => {
    if (paginationMode !== 'paged') return

    const savedScroll = sessionStorage.getItem('ncrc-paged-scroll')
    if (!savedScroll) return

    requestAnimationFrame(() => {
      window.scrollTo(0, Number(savedScroll))
      sessionStorage.removeItem('ncrc-paged-scroll')
    })
  }, [paginationMode])

  useEffect(() => {
    if (paginationMode !== 'infinite') return
    if (!infiniteQuery.data) return

    const raw = sessionStorage.getItem('ncrc-infinite-scroll')
    if (!raw) return

    const { scrollY, anchorId } = JSON.parse(raw) as {
      scrollY?: number
      anchorId?: string | number | null
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (anchorId) {
          const anchorElement = document.querySelector(
            `[data-app-id="${anchorId}"]`,
          ) as HTMLElement | null

          if (anchorElement) {
            anchorElement.scrollIntoView({ block: 'center', behavior: 'auto' })
          } else {
            window.scrollTo(0, scrollY ?? 0)
          }
        } else {
          window.scrollTo(0, scrollY ?? 0)
        }

        sessionStorage.removeItem('ncrc-infinite-scroll')
      })
    })
  }, [infiniteQuery.data, paginationMode])

  useEffect(() => {
    if (paginationMode !== 'infinite') return
    if (!sentinelRef.current) return
    if (!infiniteQuery.hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          infiniteQuery.hasNextPage &&
          !infiniteQuery.isFetchingNextPage
        ) {
          infiniteQuery.fetchNextPage()
        }
      },
      { rootMargin: '300px' },
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [
    infiniteQuery.fetchNextPage,
    infiniteQuery.hasNextPage,
    infiniteQuery.isFetchingNextPage,
    paginationMode,
  ])

  useEffect(() => {
    if (paginationMode === 'paged' && page !== 0) {
      updateSearch({ page: 0 })
    }
  }, [page, paginationMode, updateSearch])

  const applicantStats = useMemo(() => {
    const normalizedApplicants = applicants.map((applicant) => ({
      ...applicant,
      status: applicant.status?.toLowerCase() || '',
    }))

    const statusCounts = {
      new: normalizedApplicants.filter((item) => item.status === 'new').length,
      inProgress: normalizedApplicants.filter(
        (item) => item.status === 'inp' || item.status === 'in progress',
      ).length,
      withdrawn: normalizedApplicants.filter(
        (item) => item.status === 'wth' || item.status === 'withdrawn',
      ).length,
      completed: normalizedApplicants.filter((item) =>
        ['compl', 'completed', 'certified'].includes(item.status),
      ).length,
    }

    const knownTotal = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

    return {
      total: normalizedApplicants.length,
      ...statusCounts,
      others: normalizedApplicants.length - knownTotal,
    }
  }, [applicants])

  const myNotesQuery = useQuery({
    queryKey: ['dashboard-my-messages', username?.trim() ?? null, token ?? null],
    queryFn: () =>
      fetchMyMessages({
        token: token ?? undefined,
      }),
    enabled: Boolean(token) && myNotesOpen && Boolean(username?.trim()),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: myNotesOpen && !isMyNotesPollingPaused ? 5000 : false,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (!myNotesOpen) {
      setMyNotesLoading(false)
      return
    }

    setMyNotesLoading(myNotesQuery.isFetching)
  }, [myNotesOpen, myNotesQuery.isFetching])

  useEffect(() => {
    if (!myNotesQuery.data) return
    setMyNotes(normalizeMyMessagesWithApplicationId(myNotesQuery.data))
  }, [myNotesQuery.data])

  useEffect(() => {
    if (!myNotesOpen || !myNotesQuery.error) return

    const fetchError = myNotesQuery.error as any
    const message =
      fetchError?.details?.status ||
      fetchError?.details?.message ||
      fetchError?.message ||
      'Failed to fetch notes'
    setMyNotesError(message)
  }, [myNotesOpen, myNotesQuery.error])

  const refreshMyNotes = useCallback(async () => {
    await myNotesQuery.refetch()
  }, [myNotesQuery])

  const openMyNotesDrawer = useCallback(() => {
    setMyNotesOpen(true)
    setMyNotesError('')

    if (!username?.trim()) {
      setMyNotes(EMPTY_MY_MESSAGES)
      setMyNotesError('Logged in username is not available.')
    } else {
      setMyNotesLoading(true)
    }
  }, [username])

  const submitMyNotesReply = useCallback(
    async ({
      parentMessageId,
      text,
      applicationId: replyApplicationId,
      taskId,
      toUser,
      isPrivate,
    }: {
      parentMessageId: string
      text: string
      applicationId?: number | null
      taskId?: string
      toUser?: string | null
      isPrivate?: boolean
    }) => {
      const trimmedText = text.trim()
      if (!trimmedText) {
        setMyNotesError('Reply text is required')
        return
      }

      if (!username?.trim()) {
        setMyNotesError('Logged in username is not available.')
        return
      }

      await createTaskNoteMutation.mutateAsync({
        taskId,
        applicationId: replyApplicationId ?? null,
        note: trimmedText,
        isPrivate: Boolean(isPrivate),
        fromUser: username.trim(),
        parentMessageId,
        toUser: toUser ?? undefined,
        token: token ?? undefined,
      })

      setMyNotesError('')
      await refreshMyNotes()
    },
    [createTaskNoteMutation, refreshMyNotes, token, username],
  )

  const markMyNoteRead = useCallback(
    async (note: TaskNote) => {
      const messageId = getMyNoteMessageId(note)
      if (!messageId || isMyNoteRead(note) || myNotesMarkingReadMessageId === messageId) return

      setMyNotesMarkingReadMessageId(messageId)
      try {
        await markTaskNoteAsRead({
          messageId,
          token: token ?? undefined,
        })
        await refreshMyNotes()
      } catch (markReadError: any) {
        const message =
          markReadError?.details?.status ||
          markReadError?.details?.message ||
          markReadError?.message ||
          'Failed to update note status'
        setMyNotesError(message)
      } finally {
        setMyNotesMarkingReadMessageId((current) => (current === messageId ? null : current))
      }
    },
    [myNotesMarkingReadMessageId, refreshMyNotes, token],
  )

  const updateMyNoteReactionTag = useCallback(
    async (messageId: string, tag: TaskNoteReaction[]) => {
      const resolvedMessageId = String(messageId).trim()
      if (!resolvedMessageId || myNotesReactingMessageId === resolvedMessageId) return

      setMyNotesReactingMessageId(resolvedMessageId)
      try {
        await updateTaskNoteTag({
          messageId: resolvedMessageId,
          tag,
          token: token ?? undefined,
        })
        await refreshMyNotes()
      } catch (reactionError: any) {
        const message =
          reactionError?.details?.status ||
          reactionError?.details?.message ||
          reactionError?.message ||
          'Failed to update reaction'
        setMyNotesError(message)
        throw reactionError
      } finally {
        setMyNotesReactingMessageId((current) => (current === resolvedMessageId ? null : current))
      }
    },
    [myNotesReactingMessageId, refreshMyNotes, token],
  )

  const closeMyNotesDrawer = useCallback(() => {
    setMyNotesOpen(false)
    setMyNotesError('')
  }, [])

  return {
    q,
    status,
    priority,
    page,
    myOnly,
    paginationMode,
    isLoading,
    isError,
    error,
    applicants,
    totalCount,
    totalPages,
    applicantStats,
    pagedQuery,
    infiniteQuery,
    sentinelRef,
    myNotesOpen,
    myNotes,
    myNotesLoading,
    myNotesError,
    myNotesMarkingReadMessageId,
    myNotesReactingMessageId,
    myNotesReplySubmitting: createTaskNoteMutation.isPending,
    updateSearch,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
    openMyNotesDrawer,
    closeMyNotesDrawer,
    submitMyNotesReply,
    markMyNoteRead,
    updateMyNoteReactionTag,
  }
}
