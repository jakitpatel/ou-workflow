import { getScheduleAEirUrl } from '../utils/scheduleAEirUrl'

export function useScheduleEir(visitId?: string | number | null) {
  return {
    eirNewUrl: getScheduleAEirUrl(visitId),
  }
}
