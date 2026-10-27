export function hasInspectionDate(value?: string | null): boolean {
  const date = value?.trim()
  return Boolean(date && date.toUpperCase() !== 'NULL')
}
