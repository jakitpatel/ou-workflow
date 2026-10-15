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
