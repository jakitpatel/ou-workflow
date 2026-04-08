import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import type { ErrorDialogRef } from '@/components/ErrorDialog'
import { useUser } from '@/context/UserContext'
import { fetchPrelimApplicationDetails } from '@/features/prelim/api'
import { usePrelimApplications } from '@/features/prelim/hooks/usePrelimApplications'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { Route } from '@/routes/_authed/ou-workflow/prelim-dashboard'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import type { Task } from '@/types/application'
import { useTaskActions } from '@/components/ou-workflow/hooks/useTaskActions'
import { useDebounce } from '@/components/ou-workflow/hooks/useDebounce'

const PAGE_LIMIT = 20
const DEBOUNCE_DELAY = 300

export function usePrelimDashboardState() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { token, username } = useUser()

  const [expandedTaskPanel, setExpandedTaskPanel] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [showActionModal, setShowActionModal] = useState<Task | null | boolean>(null)
  const [showConditionModal, setShowConditionModal] = useState<Task | null | boolean>(null)
  const errorDialogRef = useRef<ErrorDialogRef>(null)

  const { q, status, page } = search
  const debouncedSearch = useDebounce(q, DEBOUNCE_DELAY)

  const prelimApplicationsQuery = usePrelimApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    page,
    limit: PAGE_LIMIT,
    enabled: true,
  })
  const applications = prelimApplicationsQuery.data?.data ?? []

  const applicationDetailsQuery = useQuery({
    queryKey: prelimQueryKeys.detail(selectedId),
    queryFn: () => fetchPrelimApplicationDetails(selectedId as number, token ?? undefined),
    enabled: !!selectedId,
    select: (data: any[]) => data?.[0] ?? null,
    ...queryOptionDefaults.prelimDetail,
  })

  const applicantStats = useMemo(() => {
    const normalizedApplications = applications.map((application) => ({
      ...application,
      status: application.status?.toLowerCase() || '',
    }))

    const statusCounts = {
      new: normalizedApplications.filter((application) => application.status === 'new').length,
      inProgress: normalizedApplications.filter(
        (application) => application.status === 'inp' || application.status === 'in progress',
      ).length,
      withdrawn: normalizedApplications.filter(
        (application) =>
          application.status === 'wth' || application.status === 'withdrawn',
      ).length,
      completed: normalizedApplications.filter((application) =>
        ['compl', 'completed', 'certified'].includes(application.status),
      ).length,
    }

    const knownTotal = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

    return {
      total: normalizedApplications.length,
      ...statusCounts,
      others: normalizedApplications.length - knownTotal,
    }
  }, [applications])

  const updateSearch = (updates: Partial<typeof search>) => {
    navigate({
      search: (prev) => {
        const next = { ...prev, ...updates }
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      },
    })
  }

  const { executeAction, completeTaskWithResult, getSelectedAction } = useTaskActions({
    applications,
    token: token ?? undefined,
    username: username ?? undefined,
    onError: (message) => errorDialogRef.current?.open(message),
  })

  const selectedAction = getSelectedAction(selectedActionId)

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
    applications,
    applicantStats,
    isLoading: prelimApplicationsQuery.isLoading,
    expandedTaskPanel,
    setExpandedTaskPanel,
    selectedId,
    setSelectedId,
    applicationDetails: applicationDetailsQuery.data,
    isDetailsLoading: applicationDetailsQuery.isLoading,
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
