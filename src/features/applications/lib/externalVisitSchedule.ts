import { isExternalWaitTask } from '@/features/tasks/model/externalWaitTask'
import type { Applicant, Task } from '@/types/application'

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

export function getApplicationVisitId(applicant: Applicant): string {
  // The application-list mapper normalizes visit_id, including GlobalData.appvars.
  const value = String(applicant.visit_id ?? '').trim()
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
    ? value
    : ''
}
