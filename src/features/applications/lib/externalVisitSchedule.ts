import { getInspectionStatusInputParam } from '@/features/applications/utils/inspectionStatusDetails'
import { isExternalWaitTask } from '@/features/tasks/model/externalWaitTask'
import type { Task } from '@/types/application'

export function getExternalVisitScheduleType(
  stage: string | null,
  task: Task,
): 'SCHEDULE' | 'ACTUAL' | null {
  if (stage?.trim().toLowerCase() !== 'inspection' || !isExternalWaitTask(task)) return null
  const name = task.name.trim().replace(/\s+/g, ' ').toUpperCase()
  if (name === 'SCHEDULE VISIT') return 'SCHEDULE'
  if (name === 'ACTUAL DATE') return 'ACTUAL'
  return null
}

export function getInspectionVisitId(task: Task): string {
  const record = task as unknown as Record<string, unknown>
  for (const value of [
    record.StatusDetails,
    record.statusDetails,
    record.Result,
    record.result,
    record.ResultData,
  ]) {
    const text = getInspectionStatusInputParam(value)
    const match = text.match(/visitId\s*:\s*["']?(\d+)/i) ?? text.match(/Visit\s*#\s*(\d+)/i)
    if (match && Number(match[1]) > 0) return match[1]
  }
  return ''
}
