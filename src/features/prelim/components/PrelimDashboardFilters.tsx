import { Search } from 'lucide-react'

type Props = {
  q?: string
  status?: string
  applicationId?: number
  onChange: (next: { q?: string; status?: string; applicationId?: number; page: number }) => void
}

export function PrelimDashboardFilters({ q, status, applicationId, onChange }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by company, plant, region..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={q || ''}
              onChange={(event) => onChange({ q: event.target.value, page: 0 })}
            />
          </div>
        </div>

        <select
          value={status || 'all'}
          onChange={(event) => onChange({ status: event.target.value, page: 0 })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
        >
          <option value="all">All Statuses</option>
          <option value="COMPL">Completed</option>
          <option value="INP">In Progress</option>
          <option value="NEW">New</option>
          <option value="WTH">Withdrawn</option>
        </select>

        {applicationId !== undefined && (
          <button
            type="button"
            onClick={() => onChange({ applicationId: undefined, page: 0 })}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            title="Clear application id filter"
          >
            AppId: {applicationId} x
          </button>
        )}
      </div>
    </div>
  )
}
