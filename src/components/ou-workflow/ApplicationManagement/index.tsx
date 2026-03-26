import type { ApplicationDetail } from '@/types/application'
import { ApplicationDetailsContent } from '@/features/applications/components/ApplicationDetailsContent'

type Props = {
  application: ApplicationDetail
}

export const ApplicationManagementInterface = ({ application }: Props) => {
  return <ApplicationDetailsContent application={application} mode="page" />
}

