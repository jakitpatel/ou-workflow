export const buildInspectionStatusDetails = (inputParam: string, savedState?: unknown) => {
  const payload: Record<string, unknown> = {
    inputParam,
  }

  if (savedState !== undefined) {
    payload.savedState = typeof savedState === 'string' ? savedState : JSON.stringify(savedState)
  }

  return JSON.stringify(payload)
}

export const getInspectionStatusInputParam = (value: unknown): string => {
  if (!value) return ''

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const inputParam = record.inputParam ?? record.InputParam
    if (typeof inputParam === 'string') return inputParam.trim()

    const statusDetails = record.StatusDetails ?? record.statusDetails
    if (statusDetails) return getInspectionStatusInputParam(statusDetails)

    const attributes = record.attributes
    if (attributes && typeof attributes === 'object') {
      return getInspectionStatusInputParam(attributes)
    }

    return ''
  }

  const text = String(value ?? '').trim()
  if (!text) return ''

  try {
    const parsed = JSON.parse(text)
    const parsedInputParam = getInspectionStatusInputParam(parsed)
    if (parsedInputParam) return parsedInputParam
  } catch {
    const singleQuotedInputParam = text.match(/['"]inputParam['"]\s*:\s*'([\s\S]*)'\s*}?$/)
    if (singleQuotedInputParam?.[1]) return singleQuotedInputParam[1].trim()
  }

  return text
}

export const getInspectionStatusSavedState = <T = unknown>(value: unknown): T | null => {
  if (!value) return null

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const savedState = record.savedState ?? record.SavedState
    if (typeof savedState === 'string') {
      try {
        return JSON.parse(savedState) as T
      } catch {
        return null
      }
    }

    if (savedState && typeof savedState === 'object') return savedState as T

    const statusDetails = record.StatusDetails ?? record.statusDetails
    if (statusDetails) return getInspectionStatusSavedState<T>(statusDetails)

    const attributes = record.attributes
    if (attributes && typeof attributes === 'object') {
      return getInspectionStatusSavedState<T>(attributes)
    }

    return null
  }

  const text = String(value ?? '').trim()
  if (!text) return null

  try {
    return getInspectionStatusSavedState<T>(JSON.parse(text))
  } catch {
    return null
  }
}
