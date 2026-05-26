import { lazy, Suspense } from 'react'

const JsonEditorView = lazy(() =>
  import('@/features/prelim/components/JsonEditorView').then((module) => ({
    default: module.JsonEditorView,
  })),
)

export function PrelimJsonModal({
  open,
  onClose,
  data,
  isLoading,
  error,
}: any) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-[85vw] rounded-lg bg-white p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Application JSON</h2>
          <button onClick={onClose}>x</button>
        </div>

        {isLoading && (
          <div className="flex h-[60vh] items-center justify-center">
            Loading...
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid h-[65vh] grid-cols-1 gap-3">
            <Suspense fallback={<div className="p-4 text-sm">Loading JSON editor...</div>}>
              <JsonEditorView value={data} title="Preliminary Data" />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
