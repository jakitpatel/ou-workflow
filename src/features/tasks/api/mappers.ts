import type { ApplicationTask, ApplicationTasksResponse } from '@/types/application'

type BackendApplicationTask = Partial<ApplicationTask> & {
  TaskCategory?: string
  taskCategory?: string
  taskType?: string
  TaskType?: string
  taskName?: string
  TaskName?: string
  taskInstanceId?: number
  TaskInstanceId?: number
  PreScript?: string
  preScript?: string
}

export type BackendApplicationTasksResponse = Omit<ApplicationTasksResponse, 'data'> & {
  data?: BackendApplicationTask[]
}

const mapApplicationTasksData = (
  response: BackendApplicationTasksResponse,
): ApplicationTask[] =>
  (response.data ?? []).map((task) => {
    const taskCategory = task.taskCategory ?? task.TaskCategory ?? ''
    const taskType = task.taskType ?? task.TaskType ?? ''
    const taskName = task.taskName ?? task.TaskName ?? ''
    const taskInstanceId = task.taskInstanceId ?? task.TaskInstanceId ?? 0

    return {
      TaskCategory: taskCategory,
      taskCategory,
      applicationId: task.applicationId ?? 0,
      id: task.id ?? taskInstanceId,
      assignee: task.assignee ?? '',
      assigneeRole: task.assigneeRole ?? '',
      companyId: task.companyId ?? 0,
      companyName: task.companyName ?? '',
      completedDate: task.completedDate ?? null,
      laneName: task.laneName ?? '',
      plantId: task.plantId ?? 0,
      plantName: task.plantName ?? '',
      processInstanceId: task.processInstanceId ?? 0,
      stageInstanceId: task.stageInstanceId ?? 0,
      startedDate: task.startedDate ?? null,
      status: task.status ?? 'PENDING',
      taskInstanceId,
      taskName,
      taskDescription: task.taskDescription ?? '',
      taskType,
      TaskType: task.TaskType,
      PreScript: task.PreScript ?? task.preScript ?? '',
      Result: task.Result,
      result: task.result,
      ResultData: task.ResultData,
      resultData: task.resultData,
      StatusDetails: task.StatusDetails,
      statusDetails: task.statusDetails,
      GUIDisplayResult: task.GUIDisplayResult,
      daysActive: task.daysActive ?? 0,
      priority: task.priority ?? 'NORMAL',
      stageName: task.stageName ?? '',
      daysPending: task.daysPending ?? 0,
      daysOverdue: task.daysOverdue ?? 0,
      completedCapacity: task.completedCapacity ?? null,
      completedBy: task.completedBy ?? null,
    }
  })

export function mapApplicationTasksResponse(
  response: BackendApplicationTasksResponse,
): ApplicationTasksResponse {
  const data = mapApplicationTasksData(response)

  return {
    data,
    meta: response.meta ?? {
      count: data.length,
      limit: data.length,
      offset: 0,
      total_count: data.length,
    },
    status: response.status ?? 'ok',
  }
}
