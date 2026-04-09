import { ApplicationDetailsContent } from '@/features/applications/components/ApplicationDetailsContent'
import type { ApplicationDetail } from '@/types/application'

type Props = {
  application: ApplicationDetail
}

export function ApplicationDetailScreen({ application }: Props) {
  return <ApplicationDetailsContent application={application} mode="page" />
}
