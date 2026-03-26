import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignTask, confirmTask, createTaskNote } from '@/features/tasks/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'

type ConfirmTaskInput = {
  taskId: string
  result?: string
  resultData?: string
  completionNotes?: string
  token?: string | null
  username?: string
  status?: string
  capacity?: string
}

type AssignTaskInput = {
  appId?: number | null
  taskId: string
  role: string
  assignee: string
  token?: string | null
  capacity?: string
}

type TaskLike = {
  taskInstanceId?: string | number
  TaskInstanceId?: string | number
  status?: string
  assignee?: string
  assigneeRole?: string
  [key: string]: unknown
}

const normalizeTaskId = (task: TaskLike): string =>
  String(task.taskInstanceId ?? task.TaskInstanceId ?? '')

const mapTaskStatusFromConfirm = (variables: ConfirmTaskInput): string | undefined => {
  if (variables.status?.trim()) {
    return variables.status
  }

  const normalizedResult = variables.result?.toLowerCase()
  if (!normalizedResult) {
    return undefined
  }
  if (normalizedResult === 'yes' || normalizedResult === 'completed') {
    return 'COMPLETED'
  }
  if (normalizedResult === 'no') {
    return 'PENDING'
  }
  return undefined
}

const patchTaskCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  updater: (task: TaskLike) => TaskLike,
) => {
  queryClient.setQueriesData({ queryKey: tasksQueryKeys.lists() }, (current) => {
    if (!Array.isArray(current)) {
      return current
    }

    return current.map((task) => {
      if (!task || typeof task !== 'object') {
        return task
      }

      const taskLike = task as TaskLike
      if (normalizeTaskId(taskLike) !== String(taskId)) {
        return task
      }

      return updater(taskLike)
    })
  })
}

type TaskMutationOptions = {
  onError?: (message: string) => void
  includeApplicationLists?: boolean
  includePrelimLists?: boolean
}

const resolveMutationErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string
      response?: { data?: { message?: string } }
    }
    return maybeError.message ?? maybeError.response?.data?.message ?? fallback
  }

  return fallback
}

const invalidateRelatedLists = async (
  queryClient: ReturnType<typeof useQueryClient>,
  options: TaskMutationOptions,
) => {
  await queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() })
  if (options.includeApplicationLists) {
    await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })
  }
  if (options.includePrelimLists) {
    await queryClient.invalidateQueries({ queryKey: prelimQueryKeys.lists() })
  }
}

export const useConfirmTaskMutation = (options: TaskMutationOptions = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: confirmTask,
    onSuccess: async (_response, variables) => {
      const nextStatus = mapTaskStatusFromConfirm(variables as ConfirmTaskInput)
      patchTaskCaches(queryClient, String((variables as ConfirmTaskInput).taskId), (task) => ({
        ...task,
        ...(nextStatus ? { status: nextStatus } : {}),
      }))
      await invalidateRelatedLists(queryClient, options)
    },
    onError: (error: unknown) => {
      options.onError?.(resolveMutationErrorMessage(error, 'Task confirmation failed'))
    },
  })
}

export const useAssignTaskMutation = (options: TaskMutationOptions = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignTask,
    onSuccess: async (_response, variables) => {
      const payload = variables as AssignTaskInput
      patchTaskCaches(queryClient, String(payload.taskId), (task) => ({
        ...task,
        assignee: payload.assignee,
        assigneeRole: payload.role,
      }))
      await invalidateRelatedLists(queryClient, options)
    },
    onError: (error: unknown) => {
      options.onError?.(resolveMutationErrorMessage(error, 'Task assignment failed'))
    },
  })
}

export const useCreateTaskNoteMutation = (options: TaskMutationOptions = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTaskNote,
    onSuccess: async (_response, _variables) => {
      await invalidateRelatedLists(queryClient, options)
    },
    onError: (error: unknown) => {
      options.onError?.(resolveMutationErrorMessage(error, 'Task note creation failed'))
    },
  })
}
