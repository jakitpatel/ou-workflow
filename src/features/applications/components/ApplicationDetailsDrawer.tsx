import { X } from 'lucide-react'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import { ApplicationDetailsContent } from '@/features/applications/components/ApplicationDetailsContent'

type Props = {
  open: boolean
  applicationId?: string | number
  onClose: () => void
}

export function ApplicationDetailsDrawer({ open, applicationId, onClose }: Props) {
  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const activeApplicationId = open ? resolvedApplicationId : undefined
  const { data, isLoading, error } = useApplicationDetail(activeApplicationId)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-[92vw] flex-col overflow-hidden bg-white shadow-2xl lg:max-w-[88vw]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-gray-800 px-4 py-3 text-white">
          <div>
            <h3 className="text-lg font-semibold">Application Details</h3>
            {resolvedApplicationId ? (
              <p className="text-xs text-gray-200">AppId: {resolvedApplicationId}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
            aria-label="Close application details drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {isLoading ? <div className="p-8">Loading application...</div> : null}
          {error ? (
            <div className="p-8 text-red-600">Failed to load application: {(error as Error).message}</div>
          ) : null}
          {!isLoading && !error && !data ? <div className="p-8">Application not found</div> : null}
          {data ? <ApplicationDetailsContent application={data} mode="drawer" /> : null}
        </div>
      </div>
    </div>
  )
}
