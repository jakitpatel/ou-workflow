import { useScheduleAApplication } from './useScheduleAApplication'
import { getScheduleAEirUrl } from '../utils/scheduleAEirUrl'

export function useScheduleEir(applicationId?: string, visitId?: string | number | null) {
  const { data: applicationItem } = useScheduleAApplication(applicationId)
  const inspectionStatus = applicationItem?.stages?.inspection?.status

  return {
    applicationItem,
    inspectionStatus,
    eirNewUrl: inspectionStatus === 'COMPLETED' ? getScheduleAEirUrl(visitId) : '',
  }
}
