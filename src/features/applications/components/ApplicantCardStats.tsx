import { FileText, MessageSquare } from 'lucide-react'
import type { Applicant } from '@/types/application'

type Props = {
  applicant: Applicant
  applicationNotesCount?: number
  applicationNotesLoading?: boolean
  onOpenApplicationNotes?: () => void | Promise<void>
}

export function ApplicantCardStats({
  applicant,
  applicationNotesCount = 0,
  applicationNotesLoading = false,
  onOpenApplicationNotes,
}: Props) {
  const withdrawnReason = (applicant as any)?.withdrawn_reason
  const isWithdrawn =
    applicant?.status?.toLowerCase() === 'withdrawn' ||
    applicant?.status?.toLowerCase() === 'wth'

  return (
    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center space-x-4">
        <span className="flex items-center">
          <FileText className="w-4 h-4 mr-1" aria-hidden="true" />
          <span className="sr-only">Documents:</span>
          {applicant.documents} docs
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenApplicationNotes?.()}
            className="group relative rounded p-1 text-indigo-600 hover:bg-indigo-50"
            aria-label="Notes"
            title={
              applicationNotesLoading
                ? 'Loading notes...'
                : `Notes (${applicationNotesCount})`
            }
          >
            <MessageSquare className="h-4 w-4" />
            {applicationNotesLoading && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-600" />
            )}
            {applicationNotesCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-indigo-600 px-1 text-[10px] text-white">
                {applicationNotesCount}
              </span>
            )}
          </button>
        </div>
        {isWithdrawn && withdrawnReason && (
          <span className="flex items-center">
            <span className="font-medium">Withdrawn Reason:</span>&nbsp;{withdrawnReason}
          </span>
        )}
      </div>
      {applicant.lastUpdate && (
        <span className="text-xs">
          Updated: <time dateTime={applicant.lastUpdate}>{applicant.lastUpdate.split('.')[0]}</time>
        </span>
      )}
    </div>
  )
}
