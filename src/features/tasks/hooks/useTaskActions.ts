import { useCallback } from 'react'
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

export type SelectedTaskAction = {
  application: Applicant
  action: Task
}

const buildInspectionFeeResult = (value: InspectionFeeChoice): string =>
  `{inspectionNeeded:${value.inspectionNeeded}, feeNeeded:${value.feeNeeded}}`

export function findSelectedTaskAction(
  applications: Applicant[],
  selectedActionId: string | null,
): SelectedTaskAction | null {
  if (!selectedActionId) return null

  const [appId, actId] = selectedActionId.split(':')
  const application = applications.find((item) => String(item.applicationId) === appId)
  if (!application) return null

  const action = getAllTasks(application).find((task) => String(task.TaskInstanceId) === actId)
  if (!action) return null

  return { application, action }
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

  const resolveSelectedAction = useCallback(
    (selectedActionId: string | null) => findSelectedTaskAction(applications, selectedActionId),
    [applications],
  )

  const executeAction = useCallback(
    (
      assignee: string,
      action: any,
      result?: string | InspectionFeeChoice,
      selectedAction?: SelectedTaskAction | null,
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
            result: buildInspectionFeeResult(result),
            resultData: buildInspectionFeeResult(result),
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
    },
    [assignTaskMutation, confirmTaskMutation, token, username],
  )

  const completeTaskWithResult = useCallback(
    (action: Task, result: string, status?: string, completionNotes?: string) => {
      const isCancelApplicationTask = action?.name?.toLowerCase().trim() === 'cancel application'

      confirmTaskMutation.mutate({
        taskId: String(action.TaskInstanceId),
        token: token ?? undefined,
        username: username ?? undefined,
        capacity: action.capacity ?? undefined,
        result: isCancelApplicationTask ? 'YES' : result,
        status,
        completionNotes: isCancelApplicationTask ? completionNotes ?? result : completionNotes,
      })
    },
    [confirmTaskMutation, token, username],
  )

  return {
    completeTaskWithResult,
    executeAction,
    resolveSelectedAction,
  }
}
