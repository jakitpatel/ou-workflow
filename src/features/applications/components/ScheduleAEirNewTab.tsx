import { hasInspectionDate } from '../utils/inspectionDate'

export function ScheduleAEirNewTab({ url, inspectionDate }: { url: string; inspectionDate?: string | null }) {
  if (!hasInspectionDate(inspectionDate)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Inspection has not been done yet.
      </div>
    )
  }

  if (!url) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        The inspection form will be available once a Visit ID is assigned.
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-gray-900">EIR</h2>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          Open inspection form in a new tab
        </a>
      </div>
      <iframe
        title="EIR inspection form"
        src={url}
        className="h-[720px] w-full rounded-lg border border-gray-200"
      />
    </section>
  )
}
