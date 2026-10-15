import { createApplicationMessage } from '@/features/applications/api'

export const isRfrRecommendationTask = (task: {
  taskCategory?: unknown
  TaskCategory?: unknown
  taskType?: unknown
  TaskType?: unknown
}): boolean =>
  String(task.taskCategory ?? task.TaskCategory ?? '').trim().toUpperCase() === 'ASSIGNRFR' &&
  String(task.taskType ?? task.TaskType ?? '').trim().toUpperCase() === 'ACTION'

export const buildRfrRecommendationCompletion = (rfr: string, fullName?: string) => ({
  capacity: 'DESIGNATED',
  completionNotes: 'Task completed successfully',
  result: `{selectRFR:YES, RFR:${rfr}}`,
  resultData: `{Recommended RFR:${fullName?.trim() || rfr}}`,
})

export async function postRfrRecommendationMessage({
  applicationId, fullName, username, token, onError,
}: {
  applicationId: string | number
  fullName: string
  username?: string
  token?: string | null
  onError?: (message: string) => void
}) {
  try {
    await createApplicationMessage({
      token: token ?? undefined,
      payload: {
        ApplicationID: applicationId,
        MessageText: `Recommanded RFR is ${fullName}`,
        isPrivate: false,
        isRead: false,
        FromUser: username || null,
        MessageType: 'Text',
        SentDate: new Date().toISOString(),
        Priority: 'NORMAL',
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unable to create application message.'
    onError?.(`RFR recommendation completed, but the application message failed: ${detail}`)
  }
}
