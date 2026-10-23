import { patchTaskGuiDisplayResult } from '@/features/tasks/api'
import { saveApplicationGlobalData } from '@/features/applications/api/globalData'

export function isLegalReviewTask(task: unknown): boolean {
  if (!task || typeof task !== 'object') return false
  const value = task as Record<string, unknown>
  return String(value.taskCategory ?? value.TaskCategory).trim().toUpperCase() === 'NDAREVIEW' &&
    String(value.taskType ?? value.TaskType).trim().toUpperCase() === 'ACTION'
}

export function getNdaGlobalData(detail: unknown): Record<string, unknown> {
  if (!detail || typeof detail !== 'object') return {}
  const record = detail as Record<string, unknown>
  let data = record.globalData ?? record.GlobalData
  try { if (typeof data === 'string') data = JSON.parse(data) } catch { return {} }
  return data && typeof data === 'object' ? data as Record<string, unknown> : {}
}

export async function saveApprovedNda({ applicationId, taskInstanceId, fileName, uploaded, token }: {
  applicationId: number; taskInstanceId: number; fileName: string; uploaded: unknown; token?: string | null
}) {
  const response = uploaded as Record<string, unknown> | null
  if (typeof response?.file_path !== 'string' || !response.file_path.trim() ||
      typeof response.link !== 'string' || !response.link.trim()) {
    throw new Error('The NDA was uploaded, but its file path or link was not returned.')
  }
  await patchTaskGuiDisplayResult({ taskId: String(taskInstanceId),
    result: `{approvedNDAfile:${JSON.stringify(fileName)}}`, token })
  await saveApplicationGlobalData({ applicationId, taskInstanceId, token,
    jsonData: { approvedNDAURL: response.file_path, approvedNDALink: response.link } })
}
