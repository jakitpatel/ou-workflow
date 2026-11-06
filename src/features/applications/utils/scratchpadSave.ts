// Shared by the Schedule A/B review-mark (scratchpad) hooks.

/**
 * Serialises review marks for "did anything change?" checks. The editor's username is
 * stamped on every edit, so it is left out: it alone is not a change worth saving.
 */
export const comparableScratchpad = (value: object) =>
  JSON.stringify({ ...value, username: undefined })

/** A clear message for a failed save; the server refuses users who may not edit this application. */
export const describeScratchpadSaveError = (error: unknown, scheduleName: string) => {
  const status = (error as { status?: unknown } | null)?.status
  if (status === 403) {
    return `You don't have permission to change ${scheduleName} review marks on this application, so your changes were not saved. Ask the assigned NCRC or reviewer if you need access`
  }
  return error instanceof Error && error.message ? error.message : `Unable to save ${scheduleName} changes`
}

type RowKeyedMarks = {
  flags: Record<string, unknown>
  halacha: Record<string, unknown>
  resolved: Record<string, unknown>
  attachments: Record<string, unknown>
  rounds: Array<{ items: Array<{ ingId: string }> }>
}

// Before row ids were stable, application rows were keyed `application-<app>-<id>-<name/code>`.
const LEGACY_APPLICATION_ROW_KEY = /^(application-[^-]*-\d+)-.+$/

/**
 * Moves marks stored under the old `application-<app>-<id>-<name>` keys to the stable
 * `application-<app>-<id>` key. When several old keys map to one row (it was renamed before),
 * the one matching the row's current data (`currentLegacyKeys[stableId]`) wins; without that hint
 * an ambiguous group is left as it was. Marks already under the stable key are never overwritten.
 */
export function migrateLegacyRowKeys<T extends RowKeyedMarks>(
  scratchpad: T,
  currentLegacyKeys: Record<string, string> = {},
): T {
  let changed = false
  const migrateMap = <V>(map: Record<string, V>): Record<string, V> => {
    const groups = new Map<string, string[]>()
    Object.keys(map).forEach((key) => {
      const stableId = key.match(LEGACY_APPLICATION_ROW_KEY)?.[1]
      if (stableId) groups.set(stableId, [...(groups.get(stableId) ?? []), key])
    })
    if (!groups.size) return map
    const next = { ...map }
    let mapChanged = false
    groups.forEach((keys, stableId) => {
      if (stableId in next) return
      const current = currentLegacyKeys[stableId]
      const chosen = current && keys.includes(current) ? current : keys.length === 1 ? keys[0] : undefined
      if (!chosen) return
      next[stableId] = next[chosen]
      delete next[chosen]
      mapChanged = true
    })
    if (!mapChanged) return map
    changed = true
    return next
  }
  const flags = migrateMap(scratchpad.flags)
  const halacha = migrateMap(scratchpad.halacha)
  const resolved = migrateMap(scratchpad.resolved)
  const attachments = migrateMap(scratchpad.attachments)
  const rounds = scratchpad.rounds.map((round) => {
    if (!Array.isArray(round.items) || !round.items.some((item) => LEGACY_APPLICATION_ROW_KEY.test(String(item?.ingId ?? '')))) return round
    changed = true
    return {
      ...round,
      items: round.items.map((item) => {
        const stableId = String(item?.ingId ?? '').match(LEGACY_APPLICATION_ROW_KEY)?.[1]
        return stableId ? { ...item, ingId: stableId } : item
      }),
    }
  })
  return changed ? { ...scratchpad, flags, halacha, resolved, attachments, rounds } : scratchpad
}
