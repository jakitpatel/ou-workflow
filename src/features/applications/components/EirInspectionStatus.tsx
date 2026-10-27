import { hasInspectionDate } from '../utils/inspectionDate'

export function EirInspectionStatus({ inspectionDate }: { inspectionDate?: string | null }) {
  const ready = hasInspectionDate(inspectionDate)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        ready
          ? 'border-green-200 bg-green-100 text-green-800'
          : 'border-yellow-200 bg-yellow-100 text-yellow-800'
      }`}
    >
      {ready ? 'Report Ready' : 'Awaiting Report'}
    </span>
  )
}
