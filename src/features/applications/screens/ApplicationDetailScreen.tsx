import { ApplicationDetailsContent } from '@/features/applications/components/ApplicationDetailsContent'
import type { ApplicationDetail } from '@/types/application'

type Props = {
  application: ApplicationDetail
  applicationId?: string | number
  rfrView?: boolean
}

export function ApplicationDetailScreen({ application, applicationId, rfrView = false }: Props) {
  return (
    <ApplicationDetailsContent
      application={application}
      mode="page"
      applicationId={applicationId}
      rfrView={rfrView}
    />
  )
}
