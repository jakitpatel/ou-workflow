import { FileText, Inbox, MessageSquarePlus, SendHorizontal } from 'lucide-react'
import type { NoteTab } from '@/features/tasks/notes/types'
import type { Applicant } from '@/types/application'

type Props = {
  applicant: Applicant
  applicationPrivateCount?: number
  applicationPrivateLoading?: boolean
  applicationPublicCount?: number
  applicationPublicLoading?: boolean
  onOpenApplicationNotes?: (tab: NoteTab) => void | Promise<void>
}

export function ApplicantCardStats({
  applicant,
  applicationPrivateCount = 0,
  applicationPrivateLoading = false,
  applicationPublicCount = 0,
  applicationPublicLoading = false,
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
            onClick={() => onOpenApplicationNotes?.('private')}
            className="group relative rounded p-1 text-blue-600 hover:bg-blue-50"
            aria-label="Private notes"
            title={
              applicationPrivateLoading
                ? 'Loading private notes...'
                : `Private notes (${applicationPrivateCount})`
            }
          >
            <Inbox className="h-4 w-4" />
            {applicationPrivateLoading && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-600" />
            )}
            {applicationPrivateCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1 text-[10px] text-white">
                {applicationPrivateCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenApplicationNotes?.('public')}
            className="group relative rounded p-1 text-emerald-600 hover:bg-emerald-50"
            aria-label="Public notes"
            title={
              applicationPublicLoading
                ? 'Loading public notes...'
                : `Public notes (${applicationPublicCount})`
            }
          >
            <SendHorizontal className="h-4 w-4" />
            {applicationPublicLoading && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-600" />
            )}
            {applicationPublicCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-emerald-600 px-1 text-[10px] text-white">
                {applicationPublicCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenApplicationNotes?.('public')}
            className="rounded p-1 text-indigo-600 hover:bg-indigo-50"
            aria-label="Create note"
            title="Create note"
          >
            <MessageSquarePlus className="h-4 w-4" />
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
