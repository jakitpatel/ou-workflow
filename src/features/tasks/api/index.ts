import { fetchWithAuth } from '@/shared/api/httpClient'
import { addFilterParams, buildPaginationParams } from '@/shared/api/queryParams'
import type { ApplicationTask, UserRoleResponse } from '@/types/application'
import { mapApplicationTasksResponse, type BackendApplicationTasksResponse } from './mappers'

export async function assignTask({
  appId,
  taskId,
  role,
  assignee,
  token,
  capacity,
}: {
  appId?: number | null
  taskId: string
  role: string
  assignee: string
  token?: string | null
  capacity?: string
}): Promise<any> {
  return await fetchWithAuth({
    path: '/assignRole',
    method: 'POST',
    body: { appId, taskId, role, assignee, capacity },
    token,
  })
}

export async function confirmTask({
  taskId,
  result,
  completionNotes,
  token,
  username,
  status,
  capacity,
}: {
  taskId: string
  result?: string
  completionNotes?: string
  token?: string | null
  username?: string
  status?: string
  capacity?: string
}): Promise<any> {
  const completionNotesMap: Record<string, string> = {
    completed: 'Task completed successfully',
    in_progress: 'Task IN PROGRESS successfully',
    pending: 'Task PENDING successfully',
  }

  const completion_notes =
    completionNotes ??
    ((result && completionNotesMap[result]) || 'Task completed successfully')

  const body: Record<string, any> = {
    task_instance_id: taskId,
    completed_by: username,
    completion_notes,
    capacity,
  }

  if (result) {
    const normalizedResult = result.toLowerCase()
    const standardizedResultValues = new Set([
      'yes',
      'no',
      'completed',
      'in_progress',
      'pending',
    ])
    body.result = standardizedResultValues.has(normalizedResult)
      ? normalizedResult.toUpperCase()
      : result
  }

  if (status) {
    body.status = status
  }

  return await fetchWithAuth({
    path: '/complete_task',
    method: 'POST',
    body,
    token,
  })
}

export async function fetchApplicationTasks({
  token,
  applicationId,
  searchTerm,
  days,
}: FetchApplicationTasksRequest = {}): Promise<ApplicationTask[]> {
  const params = new URLSearchParams()

  addFilterParams(params, {
    'filter[applicationId]': applicationId,
    'filter[plantName]': searchTerm,
  })

  if (days) {
    params.append('days', String(days))
  }

  const queryString = params.toString()
  const path = `/get_application_tasks${queryString ? `?${queryString}` : ''}`

  const response = await fetchWithAuth<BackendApplicationTasksResponse>({
    path,
    token,
  })

  return mapApplicationTasksResponse(response)
}

export type FetchApplicationTasksRequest = {
  token?: string | null
  applicationId?: string
  searchTerm?: string
  days?: string | number | undefined
}

export async function fetchTaskRoles({
  token,
}: {
  token?: string | null
} = {}): Promise<Array<string>> {
  const params = buildPaginationParams(0, 10000)

  const response = await fetchWithAuth<UserRoleResponse>({
    path: `/api/TaskRole?${params.toString()}`,
    token,
  })

  return response.data
    .filter((item: any) => item.attributes?.groupAssignment)
    .map((item: any) => String(item.attributes.RoleCode).toLowerCase())
}

export async function createTaskNote({
  taskId,
  applicationId,
  note,
  isPrivate,
  priority,
  fromUser,
  token,
}: {
  taskId: string
  applicationId?: number | null
  note: string
  isPrivate: boolean
  priority: 'CRITICAL' | 'HIGH' | 'LOW' | 'NORMAL'
  fromUser?: string
  token?: string | null
}): Promise<any> {
  return await fetchWithAuth({
    path: '/api/WFApplicationMessages',
    method: 'POST',
    body: {
      TaskInstanceId: taskId,
      ApplicationID: applicationId,
      MessageText: note,
      isPrivate: isPrivate,
      FromUser: fromUser,
      MessageType:'Text',
      Priority: priority,
      SentDate: new Date().toISOString()
    },
    token,
  })
}
