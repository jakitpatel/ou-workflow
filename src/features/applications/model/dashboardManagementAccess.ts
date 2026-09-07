export function canManageDashboard(
  role: string | null | undefined,
  roles: ReadonlyArray<{ name?: string | null }> | null | undefined,
): boolean {
  const activeRole = role?.trim().toUpperCase()
  return (
    activeRole === 'MIS' ||
    (activeRole === 'ALL' &&
      (roles ?? []).some((item) => item.name?.trim().toUpperCase() === 'MIS'))
  )
}
