import { ApplicationDetailsContent } from '@/features/applications/components/ApplicationDetailsContent'
import type { ApplicationDetail } from '@/types/application'

type Props = {
  application: ApplicationDetail
  applicationId?: string | number
}

export function ApplicationDetailScreen({ application, applicationId }: Props) {
  return (
    <ApplicationDetailsContent
      application={application}
      mode="page"
      applicationId={applicationId}
    />
  )
}
