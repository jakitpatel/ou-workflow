export const buildInspectionStatusDetails = (inputParam: string) =>
  JSON.stringify({
    inputParam,
  })

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
