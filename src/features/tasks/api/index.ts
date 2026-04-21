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

export type MentionUser = {
  id: string
  fullName: string
  firstName: string
  lastName: string
  kashLogIn: string
  email: string
  userRole: string
  userName: string
  isActive: boolean
}

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
  resultData,
  completionNotes,
  token,
  username,
  status,
  capacity,
}: {
  taskId: string
  result?: string
  resultData?: string
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

  if (resultData) {
    body.GUIDisplayResult = resultData
  }

  return await fetchWithAuth({
    path: '/complete_task',
    method: 'POST',
    body,
    token,
  })
}

export async function undoTask({
  taskId,
  token,
}: {
  taskId: string
  token?: string | null
}): Promise<any> {
  return await fetchWithAuth({
    path: '/undoTask',
    method: 'POST',
    body: {
      task_instance_id: taskId,
    },
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
    .filter((item: any) => {
      const attributes = item.attributes ?? {}
      return Boolean(attributes.groupAssignment ?? attributes.groupAssigment)
    })
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
  toUser,
  token,
}: {
  taskId?: string | null
  applicationId?: number | null
  note: string
  isPrivate: boolean
  priority?: 'CRITICAL' | 'HIGH' | 'LOW' | 'NORMAL'
  parentMessageId?: string | number
  fromUser?: string
  toUser?: string | null
  token?: string | null
}): Promise<any> {
  const attributes: Record<string, unknown> = {
    ApplicationID: applicationId,
    MessageText: note,
    isPrivate: isPrivate,
    FromUser: fromUser,
    MessageType: 'Text',
    SentDate: new Date().toISOString(),
  }

  if (taskId !== undefined && taskId !== null && String(taskId).trim()) {
    attributes.TaskInstanceId = String(taskId)
  }

  if (priority) {
    attributes.Priority = priority
  }

  if (parentMessageId !== undefined && parentMessageId !== null && String(parentMessageId).trim()) {
    attributes.parentMessageId = parentMessageId
  }

  if (toUser !== undefined && toUser !== null && String(toUser).trim()) {
    attributes.ToUser = String(toUser)
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

export async function fetchMentionUsers({
  token,
}: {
  token?: string | null
} = {}): Promise<MentionUser[]> {
  const params = buildPaginationParams(0, 10000)
  params.append('sort', 'LAST,FIRST')

  const response = await fetchWithAuth<{
    data?: Array<{
      id?: string | number
      type?: string
      attributes?: {
        Id?: string | number
        FullName?: string
        firstName?: string
        lastName?: string
        FIRST?: string
        LAST?: string
        KashLogIn?: string
        Email?: string
        UserRole?: string
        UserName?: string
        IsActive?: boolean
      }
    }>
  }>({
    path: `/api/vUsers?${params.toString()}`,
    method: 'GET',
    token,
  })

  return (response.data ?? [])
    .map((item) => {
      const attrs = item.attributes ?? {}
      const kashLogIn = String(attrs.KashLogIn ?? '').trim()
      const rawId = attrs.Id ?? (kashLogIn || item.id)
      const id = rawId === undefined || rawId === null ? '' : String(rawId).trim()
      const fullName = String(attrs.FullName ?? '').trim()
      const firstName = String(attrs.FIRST ?? attrs.firstName ?? '').trim()
      const lastName = String(attrs.LAST ?? attrs.lastName ?? '').trim()
      const isActive = attrs.IsActive === undefined ? true : Boolean(attrs.IsActive)

      return {
        id,
        fullName,
        firstName,
        lastName,
        kashLogIn,
        email: String(attrs.Email ?? '').trim(),
        userRole: String(attrs.UserRole ?? '').trim(),
        userName: String(attrs.UserName ?? attrs.KashLogIn ?? '').trim(),
        isActive,
      }
    })
    .filter((user) => user.id && user.isActive)
}

export async function fetchTaskNotes({
  taskId,
  applicationId,
  fromUser,
  isPrivate,
  mode = 'standard',
  token,
}: {
  taskId?: string | null
  applicationId?: number | null
  fromUser?: string | null
  isPrivate?: boolean
  mode?: 'standard' | 'directed'
  token?: string | null
}): Promise<TaskNote[]> {
  const params = new URLSearchParams()
  const isDirectedMode = mode === 'directed'
  const usesVisibilityFilter = typeof isPrivate === 'boolean'
  if (applicationId !== undefined && applicationId !== null) {
    params.append('filter[ApplicationID]', String(applicationId))
  }
  if (taskId !== undefined && taskId !== null && String(taskId).trim()) {
    params.append('filter[TaskInstanceId]', String(taskId).trim())
  }
  if (fromUser !== undefined && fromUser !== null && String(fromUser).trim()) {
    params.append('filter[FromUser]', String(fromUser).trim())
  }
  if (!isDirectedMode && usesVisibilityFilter) {
    params.append('filter[isPrivate]', String(isPrivate))
  }
  params.append('sort', '-MessageID')

  const response = await fetchWithAuth<{
    data?: WFApplicationMessageRecord[]
    messages?: WFApplicationMessageRecord[]
    items?: WFApplicationMessageRecord[]
  } | WFApplicationMessageRecord[]>({
    path: `${
      isDirectedMode
        ? '/get_directed_notes'
        : usesVisibilityFilter
          ? '/api/WFApplicationMessage'
          : '/get_my_messages'
    }?${params.toString()}`,
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
    const attributes = (
      record && typeof record === 'object' && 'attributes' in record
        ? record.attributes
        : record
    ) as WFApplicationMessageAttributes
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
