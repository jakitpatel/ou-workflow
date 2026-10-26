import { patchTaskGuiDisplayResult } from '@/features/tasks/api'
import { saveApplicationGlobalData } from '@/features/applications/api/globalData'

export async function saveUploadedNda({
  applicationId, taskInstanceId, fileName, uploaded, token,
}: {
  applicationId: string | number | null
  taskInstanceId: string | number | null | undefined
  fileName: string
  uploaded: unknown
  token?: string | null
}) {
  if (applicationId == null || taskInstanceId == null ||
      !Number.isFinite(Number(applicationId)) || !Number.isFinite(Number(taskInstanceId))) {
    throw new Error('Application and task context are required to save the NDA.')
  }
  const response = uploaded as { file_path?: unknown; link?: unknown } | null
  if (typeof response?.file_path !== 'string' || !response.file_path.trim() ||
      typeof response.link !== 'string' || !response.link.trim()) {
    throw new Error('The NDA was uploaded, but its file path or link was not returned.')
  }
  await patchTaskGuiDisplayResult({
    taskId: String(taskInstanceId),
    result: `{UploadNDAFileName:${JSON.stringify(fileName)}}`,
    token,
  })
  await saveApplicationGlobalData({
    applicationId: Number(applicationId),
    taskInstanceId: Number(taskInstanceId),
    jsonData: { customerNDAURL: response.file_path, customerNDALink: response.link, customerNDAFileName: fileName },
    token,
  })
}
