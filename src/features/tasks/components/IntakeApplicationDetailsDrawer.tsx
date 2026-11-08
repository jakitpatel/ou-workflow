import { lazy } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { fetchPrelimApplicationDetails } from '@/features/prelim/api'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'

const PrelimApplicationDetailsDrawer = lazy(() =>
  import('@/features/prelim/components/PrelimApplicationDetailsDrawer').then((module) => ({
    default: module.PrelimApplicationDetailsDrawer,
  })),
)

/**
 * The Application Intake detail drawer for a submission, loaded with
 * get_prelim_application_details?externalReferenceId=<id>. Render it inside a Suspense boundary
 * (the drawer is lazy-loaded).
 */
export function IntakeApplicationDetailsDrawer({
  externalReferenceId,
  onClose,
}: {
  externalReferenceId: number
  onClose: () => void
}) {
  const { token } = useUser()
  const query = useQuery({
    queryKey: prelimQueryKeys.detail(externalReferenceId),
    queryFn: () => fetchPrelimApplicationDetails(externalReferenceId, token ?? undefined),
    select: (data) => data?.[0] ?? null,
    staleTime: 0,
  })
  return (
    <PrelimApplicationDetailsDrawer
      open
      externalReferenceId={externalReferenceId}
      data={query.data}
      isLoading={query.isLoading}
      error={query.error}
      onClose={onClose}
    />
  )
}
