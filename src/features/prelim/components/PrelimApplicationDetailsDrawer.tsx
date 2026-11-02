import { asRecord } from '@/shared/api/record'
import { ModalSurface } from '@/components/ui/ModalSurface'
import { useMemo } from 'react'
import { X } from 'lucide-react'
import { ApplicationDetailsContent } from '@/features/applications/components/ApplicationDetailsContent'
import { mapPrelimApplicationDetailToApplicationDetail } from '@/features/prelim/lib/prelimApplicationDetailAdapter'
import type { Applicant } from '@/types/application'

type Props = {
  open: boolean
  externalReferenceId?: string | number | null
  data: unknown
  applicant?: Applicant
  isLoading: boolean
  error: unknown
  onClose: () => void
}

export function PrelimApplicationDetailsDrawer({
  open,
  data,
  applicant,
  isLoading,
  error,
  onClose,
}: Props) {
  const applicationId = applicant?.applicationId ?? asRecord(data).applicationId
  const application = useMemo(
    () =>
      data && typeof data === 'object'
        ? mapPrelimApplicationDetailToApplicationDetail({ ...asRecord(data), applicationId: typeof applicationId === 'number' || typeof applicationId === 'string' ? applicationId : undefined }) : null,
    [data, applicationId],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 pointer-events-auto z-50 bg-black/40">
      <ModalSurface onClose={onClose} label="Application Intake Detail"
        className="fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl lg:max-w-[50vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-gray-800 px-4 py-3 text-white">
          <div>
            <h3 className="text-lg font-semibold">Application Intake Detail</h3>
            {applicationId ? (
              <p className="text-xs text-gray-200">AppId: {String(applicationId)}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
            aria-label="Close application intake detail drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {isLoading ? <div className="p-8">Loading application intake...</div> : null}
          {error ? (
            <div className="p-8 text-red-600">
              Failed to load application intake: {(error as Error).message}
            </div>
          ) : null}
          {!isLoading && !error && !application ? (
            <div className="p-8">Application intake not found</div>
          ) : null}
          {application ? (
            <ApplicationDetailsContent
              application={application}
              mode="drawer"
              applicationId={application.applicationId}
              showInterfaceLabel={false}
              dataSource="prelim"
              sourceApplicant={applicant}
            />
          ) : null}
        </div>
      </ModalSurface>
    </div>
  )
}
