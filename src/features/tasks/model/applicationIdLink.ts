/** Tasks in the Intake stage belong to the Application Intake dashboard; all others to the Application Dashboard. */
export const isIntakeStage = (stageName: unknown) =>
  typeof stageName === 'string' && stageName.trim().toLowerCase() === 'intake'

/**
 * The task's intake (submission) reference from get_application_tasks, as a positive integer, or
 * undefined. The backend's casing varies, so every spelling is accepted here.
 */
export const getTaskExternalReferenceId = (task: unknown) => {
  if (!task || typeof task !== 'object') return undefined
  const record = task as Record<string, unknown>
  return toLinkableApplicationId(
    record.externalReferenceId ??
      record.ExternalReferenceId ??
      record.externalReferenceID ??
      record.ExternalReferenceID,
  )
}

/** What the Task & Plant click opens: Intake details for Intake-stage tasks, else Application Details. */
export type TaskDetailsTarget =
  | { kind: 'intake'; externalReferenceId: number }
  | { kind: 'application'; applicationId: number }

export const getTaskDetailsTarget = (task: {
  stageName?: unknown
  applicationId?: unknown
}): TaskDetailsTarget | undefined => {
  const externalReferenceId = getTaskExternalReferenceId(task)
  if (isIntakeStage(task.stageName) && externalReferenceId !== undefined) {
    return { kind: 'intake', externalReferenceId }
  }
  const applicationId = toLinkableApplicationId(task.applicationId)
  return applicationId === undefined ? undefined : { kind: 'application', applicationId }
}

/** A positive integer application id, or undefined when the row has none. */
export const toLinkableApplicationId = (applicationId: unknown) => {
  const id = Number(applicationId)
  return Number.isInteger(id) && id > 0 ? id : undefined
}
