type Props = {
  /** Set while saving is disabled because the saved state could not be read. */
  blockedReason?: string
  /** True after an auto-save failed; auto-save stays off until the user retries. */
  saveFailed?: boolean
  /** True when marks restored from this browser are not on the server yet; they save on request. */
  unsavedDraft?: boolean
  saveError?: string
  isSaving?: boolean
  onRetry?: () => void
}

const withPeriod = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`)

/**
 * Persistent save status for the Schedule A/B review marks. A toast disappears after a few
 * seconds, but these states last until the user acts, so they stay visible in the drawer.
 */
export function ScheduleSaveStatusBanner({
  blockedReason,
  saveFailed = false,
  unsavedDraft = false,
  saveError,
  isSaving = false,
  onRetry,
}: Props) {
  if (blockedReason) {
    return (
      <div
        role="alert"
        className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        <p className="font-semibold">Saving is turned off. Review marks are read-only.</p>
        <p className="mt-1">{blockedReason}</p>
      </div>
    )
  }

  if (!saveFailed && unsavedDraft) {
    return (
      <div
        role="status"
        className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <div>
          <p className="font-semibold">Review marks from your last visit are only in this browser.</p>
          <p className="mt-1">They are not saved to the server yet. Save them now, or keep editing to save them.</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={isSaving}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save now'}
          </button>
        ) : null}
      </div>
    )
  }

  if (!saveFailed) return null

  return (
    <div
      role="alert"
      className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <div>
        <p className="font-semibold">Your latest review marks are not saved.</p>
        <p className="mt-1">
          {withPeriod(saveError || 'The last save failed')} Changes are kept in this browser until you
          retry.
        </p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isSaving}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Retry save'}
        </button>
      ) : null}
    </div>
  )
}
