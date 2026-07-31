import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorDialogRef } from '@/components/ErrorDialog'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import { fetchPrelimApplicationDetails } from '@/features/prelim/api'
import {
  useInfinitePrelimApplications,
  usePrelimApplications,
} from '@/features/prelim/hooks/usePrelimApplications'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { useTaskActions, type SelectedTaskAction } from '@/features/tasks/hooks/useTaskActions'
import { useDebounce } from '@/hooks/useDebounce'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { Route } from '@/routes/_authed/ou-workflow/prelim-dashboard'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import type { Task } from '@/types/application'

const PAGE_LIMIT = 20
const DEBOUNCE_DELAY = 300

export function usePrelimDashboardState() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { token, username } = useUser()
  const { paginationMode } = useAppPreferences()

  const [expandedTaskPanel, setExpandedTaskPanel] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [showActionModal, setShowActionModal] = useState<Task | null | boolean>(null)
  const [showConditionModal, setShowConditionModal] = useState<Task | null | boolean>(null)
  const errorDialogRef = useRef<ErrorDialogRef>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const { q, status, page, applicationId } = search
  const debouncedSearch = useDebounce(q, DEBOUNCE_DELAY)

  const prelimApplicationsQuery = usePrelimApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    applicationId,
    page,
    limit: PAGE_LIMIT,
    enabled: paginationMode === 'paged',
  })
  const infiniteApplicationsQuery = useInfinitePrelimApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    applicationId,
    limit: PAGE_LIMIT,
    enabled: paginationMode === 'infinite',
  })
  const applications = useMemo(
    () =>
      paginationMode === 'paged'
        ? (prelimApplicationsQuery.data?.data ?? [])
        : (infiniteApplicationsQuery.data?.pages.flatMap((currentPage) => currentPage.data) ?? []),
    [infiniteApplicationsQuery.data?.pages, paginationMode, prelimApplicationsQuery.data?.data],
  )
  const totalCount =
    paginationMode === 'paged'
      ? (prelimApplicationsQuery.data?.meta.total_count ?? 0)
      : (infiniteApplicationsQuery.data?.pages[0]?.meta.total_count ?? 0)
  const totalPages = Math.ceil(totalCount / PAGE_LIMIT)

  const applicationDetailsQuery = useQuery({
    queryKey: prelimQueryKeys.detail(selectedId),
    queryFn: () => fetchPrelimApplicationDetails(selectedId as number, token ?? undefined),
    enabled: !!selectedId,
    select: (data: any[]) => data?.[0] ?? null,
    ...queryOptionDefaults.prelimDetail,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  })

  const updateSearch = useCallback(
    (updates: Partial<typeof search>) => {
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
    () => updateSearch({ page: Math.max((totalPages - 1) * PAGE_LIMIT, 0) }),
    [totalPages, updateSearch],
  )

  useEffect(() => {
    if (paginationMode !== 'infinite' || !sentinelRef.current) return
    if (!infiniteApplicationsQuery.hasNextPage) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          infiniteApplicationsQuery.hasNextPage &&
          !infiniteApplicationsQuery.isFetchingNextPage
        ) {
          void infiniteApplicationsQuery.fetchNextPage()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [
    infiniteApplicationsQuery.fetchNextPage,
    infiniteApplicationsQuery.hasNextPage,
    infiniteApplicationsQuery.isFetchingNextPage,
    paginationMode,
  ])

  useEffect(() => {
    if (paginationMode === 'infinite' && page !== 0) updateSearch({ page: 0 })
  }, [page, paginationMode, updateSearch])

  const { executeAction, completeTaskWithResult, resolveSelectedAction } = useTaskActions({
    applications,
    token: token ?? undefined,
    username: username ?? undefined,
    onError: (message) => errorDialogRef.current?.open(message),
  })

  const selectedAction = useMemo<SelectedTaskAction | null>(
    () => resolveSelectedAction(selectedActionId),
    [resolveSelectedAction, selectedActionId],
  )

  const selectAction = (applicationId: string | number, actionId: string | number) => {
    setSelectedActionId(`${applicationId}:${actionId}`)
  }

  const handleTaskAction = (event: React.MouseEvent, application: any, action: Task) => {
    event.stopPropagation()
    event.preventDefault()
    selectAction(application.applicationId, action.TaskInstanceId)

    const actionType = action.taskType?.toLowerCase()
    const actionCategory = action.taskCategory?.toLowerCase()

    if (actionType === TASK_TYPES.CONFIRM && actionCategory === TASK_CATEGORIES.CONFIRMATION) {
      executeAction('Confirmed', action, 'yes', selectedAction)
      return
    }

    if (
      (actionType === TASK_TYPES.CONDITIONAL || actionType === TASK_TYPES.CONDITION) &&
      [TASK_CATEGORIES.APPROVAL, TASK_CATEGORIES.APPROVAL1].includes(actionCategory as any)
    ) {
      setShowConditionModal(action)
      return
    }

    if (actionType === TASK_TYPES.ACTION) {
      if (actionCategory === TASK_CATEGORIES.ASSIGNMENT) {
        setShowActionModal(action)
        return
      }
      setShowConditionModal(action)
      return
    }

    if (actionType === TASK_TYPES.PROGRESS && actionCategory === TASK_CATEGORIES.PROGRESS_TASK) {
      setShowConditionModal(action)
    }
  }

  const handleCancelTask = async (application: any, action: Task, reason: string) => {
    selectAction(application.applicationId, action.TaskInstanceId)
    completeTaskWithResult(action, reason)
  }

  return {
    q,
    status,
    applicationId,
    applications,
    paginationMode,
    page,
    totalCount,
    totalPages,
    isLoading:
      paginationMode === 'paged'
        ? prelimApplicationsQuery.isLoading
        : infiniteApplicationsQuery.isLoading,
    isError:
      paginationMode === 'paged'
        ? prelimApplicationsQuery.isError
        : infiniteApplicationsQuery.isError,
    error:
      paginationMode === 'paged' ? prelimApplicationsQuery.error : infiniteApplicationsQuery.error,
    hasNextPage: infiniteApplicationsQuery.hasNextPage,
    isFetchingNextPage: infiniteApplicationsQuery.isFetchingNextPage,
    sentinelRef,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
    expandedTaskPanel,
    setExpandedTaskPanel,
    selectedId,
    setSelectedId,
    applicationDetails: applicationDetailsQuery.isFetching ? null : applicationDetailsQuery.data,
    isDetailsLoading: applicationDetailsQuery.isLoading || applicationDetailsQuery.isFetching,
    applicationDetailsError: applicationDetailsQuery.error,
    updateSearch,
    handleTaskAction,
    handleCancelTask,
    showActionModal,
    setShowActionModal,
    showConditionModal,
    setShowConditionModal,
    selectedAction,
    executeAction,
  }
}
