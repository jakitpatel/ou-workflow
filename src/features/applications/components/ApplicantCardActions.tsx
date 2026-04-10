import { ApplicantDocuments } from '@/features/applications/components/ApplicantDocuments'
import type { Applicant } from '@/types/application'

type Props = {
  applicant: Applicant
  canCancelApplication?: boolean
  canUndoWithdrawApplication?: boolean
  filesByType?: Record<string, any>
  onCancelApplication?: () => void
  onViewDetails: () => void
  onViewTasks: (id?: string | number) => void
}

export function ApplicantCardActions({
  applicant,
  canCancelApplication = false,
  canUndoWithdrawApplication = false,
  filesByType,
  onCancelApplication,
  onViewDetails,
  onViewTasks,
}: Props) {
  const normalizedStatus = applicant?.status?.toLowerCase()
  const isWithdrawn = normalizedStatus === 'withdrawn' || normalizedStatus === 'wth'

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
      <ApplicantDocuments filesByType={filesByType} />
      <div className="flex items-center space-x-2 ml-auto">
        <button
          type="button"
          onClick={onViewDetails}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View Details
        </button>
        {!isWithdrawn && (
          <button
            onClick={() => onViewTasks(applicant.applicationId)}
            className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            title="View Tasks"
          >
            View Tasks {'->'}
          </button>
        )}
        {!isWithdrawn && (
          <button
            onClick={onCancelApplication}
            disabled={!canCancelApplication}
            className={`px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              canCancelApplication
                ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                : 'bg-red-100 text-red-300 cursor-not-allowed focus:ring-red-200'
            }`}
            title={
              canCancelApplication
                ? 'Withdraw Application'
                : 'This application cannot be canceled due to its current status or your permissions.'
            }
            aria-label={
              canCancelApplication
                ? 'Withdraw Application'
                : 'This application cannot be canceled due to its current status or your permissions.'
            }
          >
            Withdraw Application
          </button>
        )}
        {isWithdrawn && (
          <button
            onClick={onCancelApplication}
            disabled={!canUndoWithdrawApplication}
            className={`px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              canUndoWithdrawApplication
                ? 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500'
                : 'bg-amber-100 text-amber-300 cursor-not-allowed focus:ring-amber-200'
            }`}
            title={
              canUndoWithdrawApplication
                ? 'Undo Withdraw Application'
                : 'Undo withdraw is not available for this application at the moment.'
            }
            aria-label={
              canUndoWithdrawApplication
                ? 'Undo Withdraw Application'
                : 'Undo withdraw is not available for this application at the moment.'
            }
          >
            Undo Withdraw Application
          </button>
        )}
      </div>
    </div>
  )
}
