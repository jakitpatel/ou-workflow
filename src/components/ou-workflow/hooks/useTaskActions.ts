import { useMemo } from 'react'
import {
  useAssignTaskMutation,
  useConfirmTaskMutation,
} from '@/features/tasks/hooks/useTaskMutations'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { detectRole, getAllTasks, getProgressStatus } from '@/lib/utils/taskHelpers'
import type { Applicant, Task } from '@/types/application'

type Params = {
  applications: Applicant[]
  token?: string
  username?: string
  onError?: (msg: string) => void
}

type InspectionFeeChoice = {
  inspectionNeeded: 'YES' | 'NO'
  feeNeeded: 'YES' | 'NO'
}

export function useTaskActions({ applications, token, username, onError }: Params) {
  const confirmTaskMutation = useConfirmTaskMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => onError?.(message),
  })

  const assignTaskMutation = useAssignTaskMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => onError?.(message),
  })

  const executeAction = (
    assignee: string,
    action: any,
    result?: string | InspectionFeeChoice,
    selectedAction?: { application: Applicant; action: Task } | null,
  ) => {
    const taskType = action.taskType?.toLowerCase()
    const taskCategory = action.taskCategory?.toLowerCase()
    const taskId = String(action?.TaskInstanceId ?? action?.taskInstanceId ?? action?.id ?? '')

    const baseParams = {
      taskId,
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: action.capacity ?? undefined,
    }

    if (taskType === TASK_TYPES.CONFIRM) {
      confirmTaskMutation.mutate(baseParams)
      return
    }

    if ([TASK_TYPES.CONDITIONAL, TASK_TYPES.CONDITION].includes(taskType as any)) {
      const isApproval1 = taskCategory === TASK_CATEGORIES.APPROVAL1
      if (isApproval1 && result && typeof result === 'object') {
        confirmTaskMutation.mutate({
          ...baseParams,
          result: 'YES',
          inspectionNeeded: result.inspectionNeeded,
          feeNeeded: result.feeNeeded,
        })
        return
      }

      confirmTaskMutation.mutate({
        ...baseParams,
        result: typeof result === 'string' ? result : undefined,
      })
      return
    }
    if (taskType === TASK_TYPES.ACTION) {
      if (taskCategory === TASK_CATEGORIES.ASSIGNMENT) {
        const rawAppId =
          selectedAction?.application?.applicationId ??
          action.application?.applicationId ??
          action.applicationId
        const appId =
          rawAppId == null || Number.isNaN(Number(rawAppId)) ? null : Number(rawAppId)

        const preScript = action.PreScript ?? selectedAction?.action?.PreScript
        const role = detectRole(preScript)
        assignTaskMutation.mutate({
          appId,
          taskId,
          role,
          assignee,
          token,
          capacity: action.capacity ?? undefined,
        })
        return
      }

      confirmTaskMutation.mutate({
        ...baseParams,
        result: typeof result === 'string' ? result : undefined,
      })
      return
    }

    if (taskType === TASK_TYPES.PROGRESS) {
      confirmTaskMutation.mutate({
        ...baseParams,
        result: typeof result === 'string' ? result : undefined,
        status: getProgressStatus(typeof result === 'string' ? result : ''),
      })
    }
  }

  const completeTaskWithResult = (
    action: Task,
    result: string,
    status?: string,
    completionNotes?: string,
  ) => {
    const isCancelApplicationTask = action?.name?.toLowerCase().trim() === 'cancel application'

    const finalResult = isCancelApplicationTask ? 'YES' : result
    const finalCompletionNotes = isCancelApplicationTask ? completionNotes ?? result : completionNotes

    confirmTaskMutation.mutate({
      taskId: String(action.TaskInstanceId),
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: action.capacity ?? undefined,
      result: finalResult,
      status,
      completionNotes: finalCompletionNotes,
    })
  }

  const getSelectedAction = (selectedActionId: string | null) =>
    useMemo(() => {
      if (!selectedActionId) return null
      const [appId, actId] = selectedActionId.split(':')

      const app = applications.find((a) => String(a.applicationId) === appId)
      if (!app) return null

      const action = getAllTasks(app).find((t) => String(t.TaskInstanceId) === actId)
      if (!action) return null

      return { application: app, action }
    }, [selectedActionId, applications])

  return { executeAction, completeTaskWithResult, getSelectedAction }
}
