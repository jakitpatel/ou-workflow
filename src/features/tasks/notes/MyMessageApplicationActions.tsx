import { lazy, Suspense, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Hash } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import { fetchPrelimApplicationDetails } from '@/features/prelim/api'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'

const ApplicationDetailsDrawer = lazy(() =>
  import('@/features/applications/components/ApplicationDetailsDrawer').then((module) => ({
    default: module.ApplicationDetailsDrawer,
  })),
)
const PrelimApplicationDetailsDrawer = lazy(() =>
  import('@/features/prelim/components/PrelimApplicationDetailsDrawer').then((module) => ({
    default: module.PrelimApplicationDetailsDrawer,
  })),
)

function SubmissionDetails({
  applicationId,
  onClose,
}: {
  applicationId: number
  onClose: () => void
}) {
  const { token } = useUser()
  const query = useQuery({
    queryKey: prelimQueryKeys.detail(applicationId),
    queryFn: () => fetchPrelimApplicationDetails(applicationId, token ?? undefined),
    select: (data) => data?.[0] ?? null,
    staleTime: 0,
  })
  return (
    <PrelimApplicationDetailsDrawer
      open
      externalReferenceId={applicationId}
      data={query.data}
      isLoading={query.isLoading}
      error={query.error}
      onClose={onClose}
    />
  )
}

export function MyMessageApplicationActions({
  applicationId,
  applicationType,
  onNavigate,
}: {
  applicationId: number
  applicationType: unknown
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const isSubmission = applicationType === 'SUBMISSION'
  const openDashboard = () => {
    onNavigate()
    void navigate(
      isSubmission
        ? {
            to: '/ou-workflow/prelim-dashboard',
            search: { q: '', status: 'all', page: 0, applicationId },
          }
        : {
            to: '/ou-workflow/ncrc-dashboard',
            search: { q: '', status: 'all', priority: 'all', page: 0, myOnly: true, applicationId },
          },
    )
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`AppId: ${applicationId}`}
        title={`Application ID ${applicationId}`}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
      >
        <Hash className="h-3 w-3" />
        <span className="uppercase tracking-wide text-slate-500">View</span>
        <span className="font-semibold text-slate-800">{applicationId}</span>
      </button>
      <button
        type="button"
        onClick={openDashboard}
        aria-label={`ViewApp:${applicationId}`}
        title={`View application ${applicationId}`}
        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800"
      >
        <ArrowUpRight className="h-3 w-3" />
        <span>App</span>
        <span className="font-semibold">{applicationId}</span>
      </button>
      {open &&
        createPortal(
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[60] bg-white p-8">
                Loading application details...
              </div>
            }
          >
            <div className="relative z-[60]">
              {isSubmission ? (
                <SubmissionDetails applicationId={applicationId} onClose={() => setOpen(false)} />
              ) : (
                <ApplicationDetailsDrawer
                  open
                  applicationId={applicationId}
                  onClose={() => setOpen(false)}
                />
              )}
            </div>
          </Suspense>,
          document.body,
        )}
    </>
  )
}
