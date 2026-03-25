import { fetchWithAuth } from '@/shared/api/httpClient'
import { addFilterParams, buildPaginationParams } from '@/shared/api/queryParams'
import type {
  ApplicationTask,
  TaskNote,
  UserRoleResponse,
  WFApplicationMessageAttributes,
  WFApplicationMessageRecord,
} from '@/types/application'
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
  parentMessageId,
  fromUser,
  token,
}: {
  taskId: string
  applicationId?: number | null
  note: string
  isPrivate: boolean
  priority?: 'CRITICAL' | 'HIGH' | 'LOW' | 'NORMAL'
  parentMessageId?: string | number
  fromUser?: string
  token?: string | null
}): Promise<any> {
  const attributes: Record<string, unknown> = {
    TaskInstanceId: taskId,
    ApplicationID: applicationId,
    MessageText: note,
    isPrivate: isPrivate,
    FromUser: fromUser,
    MessageType: 'Text',
    SentDate: new Date().toISOString(),
  }

  if (priority) {
    attributes.Priority = priority
  }

  if (parentMessageId !== undefined && parentMessageId !== null && String(parentMessageId).trim()) {
    attributes.parentMessageId = parentMessageId
  }

  const body = {
    data: {
      attributes,
      type: 'WFApplicationMessage',
    },
  }

  return await fetchWithAuth({
    path: '/api/WFApplicationMessage',
    method: 'POST',
    body,
    token,
  })
}

export async function fetchTaskNotes({
  taskId,
  applicationId,
  isPrivate,
  token,
}: {
  taskId: string
  applicationId?: number | null
  isPrivate: boolean
  token?: string | null
}): Promise<TaskNote[]> {
  const params = new URLSearchParams()
  if (applicationId !== null && applicationId !== undefined) {
    params.append('filter[ApplicationID]', String(applicationId))
  }
  params.append('filter[TaskInstanceId]', String(taskId))
  params.append('filter[isPrivate]', String(isPrivate))

  const response = await fetchWithAuth<{
    data?: WFApplicationMessageRecord[]
    messages?: WFApplicationMessageRecord[]
    items?: WFApplicationMessageRecord[]
  } | WFApplicationMessageRecord[]>({
    path: `/api/WFApplicationMessage?${params.toString()}`,
    method: 'GET',
    token,
  })

  const records: WFApplicationMessageRecord[] = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.messages)
    ? response.messages
    : Array.isArray(response?.items)
    ? response.items
    : []

  return records.map((record) => {
    const attributes = (record?.attributes ?? {}) as WFApplicationMessageAttributes
    return {
      ...attributes,
      text: attributes.MessageText ?? '',
      note: attributes.MessageText ?? '',
      fromUser: attributes.FromUser ?? '',
      toUser: attributes.ToUser ?? '',
      createdDate: attributes.SentDate ?? '',
      fromTask: String(attributes.TaskInstanceId ?? ''),
      toTask: String(attributes.TaskInstanceId ?? ''),
    }
  })
}
