import { lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'

const ReportIssueDialog = lazy(() =>
  import('./ReportIssueDialog').then((module) => ({ default: module.ReportIssueDialog })),
)

/**
 * Loads the report form only when it is opened. Mount while open.
 * Rendered into <body> so it is not trapped in the navigation's stacking context and shows
 * above any open drawer.
 */
export function LazyReportIssueDialog({ onClose }: { onClose: () => void }) {
  return createPortal(
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center bg-black/40" role="status">
          <span className="rounded-lg bg-white px-4 py-2 text-sm text-gray-700 shadow">Loading…</span>
        </div>
      }
    >
      <ReportIssueDialog onClose={onClose} />
    </Suspense>,
    document.body,
  )
}
