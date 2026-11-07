/** Tasks in the Intake stage belong to the Application Intake dashboard; all others to the Application Dashboard. */
export const isIntakeStage = (stageName: unknown) =>
  typeof stageName === 'string' && stageName.trim().toLowerCase() === 'intake'

/** A positive integer application id, or undefined when the row has none. */
export const toLinkableApplicationId = (applicationId: unknown) => {
  const id = Number(applicationId)
  return Number.isInteger(id) && id > 0 ? id : undefined
}
