const parseInspectionInputParam = (inputParam: string): Record<string, string> | string => {
  const text = inputParam.trim()
  if (!text.startsWith('{') || !text.endsWith('}')) return inputParam

  const body = text.slice(1, -1)
  const entries: Record<string, string> = {}
  const pattern = /([^:,{}]+)\s*:\s*("[^"]*"|[^,}]*)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(body)) !== null) {
    const key = match[1].trim()
    const rawValue = match[2].trim()
    const value = rawValue.startsWith('"') && rawValue.endsWith('"')
      ? rawValue.slice(1, -1)
      : rawValue

    if (key) {
      entries[key] = value
    }
  }

  return Object.keys(entries).length > 0 ? entries : inputParam
}

const formatInspectionInputParam = (inputParam: Record<string, unknown>): string => {
  const entries = Object.entries(inputParam)

  return `{${entries
    .map(([key, value]) => {
      const textValue = String(value ?? '')
      const needsQuotes = /[\s,{}]/.test(textValue)

      return `${key}:${needsQuotes ? `"${textValue}"` : textValue}`
    })
    .join(', ')}}`
}

export const buildInspectionStatusDetails = (inputParam: string, savedState?: unknown) => {
  const payload: Record<string, unknown> = {
    inputParam: parseInspectionInputParam(inputParam),
  }

  if (savedState !== undefined) {
    payload.savedState = savedState
  }

  return payload
}

export const getInspectionStatusInputParam = (value: unknown): string => {
  if (!value) return ''

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const inputParam = record.inputParam ?? record.InputParam
    if (typeof inputParam === 'string') return inputParam.trim()
    if (inputParam && typeof inputParam === 'object') {
      return formatInspectionInputParam(inputParam as Record<string, unknown>)
    }

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
