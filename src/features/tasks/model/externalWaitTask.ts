type TaskClassification = {
  taskType?: string
  TaskType?: string
  taskCategory?: string
  TaskCategory?: string
}

export function isExternalWaitTask(task: TaskClassification): boolean {
  const normalize = (value: string | undefined) => value?.trim().toUpperCase()
  return (
    normalize(task.taskType ?? task.TaskType) === 'WAIT' &&
    normalize(task.taskCategory ?? task.TaskCategory) === 'EXTERNAL'
  )
}
