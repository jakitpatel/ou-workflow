const getRawTaskInstanceId = (value: unknown): string => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return String(record.TaskInstanceId ?? record.taskInstanceId ?? record.id ?? '').trim()
}

export const withPatchedTaskGuiDisplayResult = (
  value: unknown,
  taskId: string,
  guiDisplayResult?: string,
  statusDetails?: unknown,
): unknown => {
  if (!value || typeof value !== 'object') return value

  if (Array.isArray(value)) {
    const nextValue = value.map((item) =>
      withPatchedTaskGuiDisplayResult(item, taskId, guiDisplayResult, statusDetails),
    )
    return nextValue.some((item, index) => item !== value[index]) ? nextValue : value
  }

  const record = value as Record<string, any>
  const recordTaskId = getRawTaskInstanceId(record)
  let changed = false
  let nextRecord = record

  if (recordTaskId && recordTaskId === taskId) {
    changed = true
    nextRecord = {
      ...nextRecord,
      ...(statusDetails ? { StatusDetails: statusDetails, statusDetails } : {}),
      ...(guiDisplayResult
        ? {
            GUIDisplayResult: guiDisplayResult,
            ResultData: {
              GUIDisplayResult: guiDisplayResult,
            },
          }
        : {}),
    }
  }

  if (Array.isArray(record.data)) {
    const nextData = record.data.map((item) =>
      withPatchedTaskGuiDisplayResult(item, taskId, guiDisplayResult, statusDetails),
    )
    if (nextData.some((item, index) => item !== record.data[index])) {
      changed = true
      nextRecord = { ...nextRecord, data: nextData }
    }
  }

  if (Array.isArray(record.pages)) {
    const nextPages = record.pages.map((page) =>
      withPatchedTaskGuiDisplayResult(page, taskId, guiDisplayResult, statusDetails),
    )
    if (nextPages.some((page, index) => page !== record.pages[index])) {
      changed = true
      nextRecord = { ...nextRecord, pages: nextPages }
    }
  }

  if (record.stages && typeof record.stages === 'object') {
    let stagesChanged = false
    const nextStages = Object.fromEntries(
      Object.entries(record.stages).map(([stageKey, stageValue]) => {
        if (!stageValue || typeof stageValue !== 'object') return [stageKey, stageValue]
        const stageRecord = stageValue as Record<string, any>
        if (!Array.isArray(stageRecord.tasks)) return [stageKey, stageValue]

        const nextTasks = stageRecord.tasks.map((stageTask) =>
          withPatchedTaskGuiDisplayResult(stageTask, taskId, guiDisplayResult, statusDetails),
        )
        if (!nextTasks.some((stageTask, index) => stageTask !== stageRecord.tasks[index])) {
          return [stageKey, stageValue]
        }

        stagesChanged = true
        return [stageKey, { ...stageRecord, tasks: nextTasks }]
      }),
    )

    if (stagesChanged) {
      changed = true
      nextRecord = { ...nextRecord, stages: nextStages }
    }
  }

  return changed ? nextRecord : value
}

