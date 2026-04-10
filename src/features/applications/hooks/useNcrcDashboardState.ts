import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import { useInfiniteApplications } from '@/features/applications/hooks/useInfiniteApplications'
import { usePagedApplications } from '@/features/applications/hooks/usePagedApplications'
import { fetchTaskNotes } from '@/features/tasks/api'
import { useCreateTaskNoteMutation } from '@/features/tasks/hooks/useTaskMutations'
import { useDebounce } from '@/hooks/useDebounce'
import type { Applicant, TaskNote } from '@/types/application'

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

export function useNcrcDashboardState({
  search,
  navigate,
}: UseNcrcDashboardStateParams) {
  const { q, status, priority, page, applicationId, myOnly } = search
  const { token, username } = useUser()
  const { paginationMode } = useAppPreferences()

  const [myNotesOpen, setMyNotesOpen] = useState(false)
  const [myNotes, setMyNotes] = useState<TaskNote[]>([])
  const [myNotesLoading, setMyNotesLoading] = useState(false)
  const [myNotesError, setMyNotesError] = useState('')
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const debouncedSearch = useDebounce(q, DEBOUNCE_DELAY)
  const createTaskNoteMutation = useCreateTaskNoteMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => setMyNotesError(message),
  })

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

  const openMyNotesDrawer = useCallback(async () => {
    setMyNotesOpen(true)
    setMyNotesError('')

    if (!username?.trim()) {
      setMyNotes([])
      setMyNotesError('Logged in username is not available.')
      return
    }

    setMyNotesLoading(true)
    try {
      const notes = await fetchTaskNotes({
        token: token ?? undefined,
      })
      setMyNotes(normalizeMyNotesWithApplicationId(notes))
    } catch (fetchError: any) {
      const message =
        fetchError?.details?.status ||
        fetchError?.details?.message ||
        fetchError?.message ||
        'Failed to fetch notes'
      setMyNotesError(message)
    } finally {
      setMyNotesLoading(false)
    }
  }, [token, username])

  const submitMyNotesReply = useCallback(
    async ({
      parentMessageId,
      text,
      applicationId: replyApplicationId,
      taskId,
      toUser,
    }: {
      parentMessageId: string
      text: string
      applicationId?: number | null
      taskId?: string
      toUser?: string | null
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
        isPrivate: false,
        fromUser: username.trim(),
        parentMessageId,
        toUser: toUser ?? undefined,
        token: token ?? undefined,
      })

      setMyNotesError('')
      const notes = await fetchTaskNotes({
        token: token ?? undefined,
      })
      setMyNotes(normalizeMyNotesWithApplicationId(notes))
    },
    [createTaskNoteMutation, token, username],
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
    myNotesReplySubmitting: createTaskNoteMutation.isPending,
    updateSearch,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
    openMyNotesDrawer,
    closeMyNotesDrawer,
    submitMyNotesReply,
  }
}
