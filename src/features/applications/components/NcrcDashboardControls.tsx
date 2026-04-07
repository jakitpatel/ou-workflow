import { MessageSquareText, Search } from 'lucide-react'
import { ApplicantStatsCards } from '@/components/ou-workflow/NCRCDashboard/ApplicantStatsCards'

const PAGE_SIZE = 5

type ApplicantStats = {
  total: number
  new: number
  inProgress: number
  withdrawn: number
  completed: number
  others: number
}

type DashboardSearchUpdates = {
  q?: string
  status?: string
  priority?: string
  page?: number
  myOnly?: boolean
}

type NcrcDashboardControlsProps = {
  q: string
  status: string
  priority: string
  page: number
  myOnly: boolean
  totalCount: number
  totalPages: number
  paginationMode: 'paged' | 'infinite'
  isLoading: boolean
  isError: boolean
  error: unknown
  username?: string | null
  showApplicantStats?: boolean
  applicantStats: ApplicantStats
  onOpenMyNotes: () => void
  onUpdateSearch: (updates: DashboardSearchUpdates) => void
  onFirstPage: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onLastPage: () => void
}

export function NcrcDashboardControls({
  q,
  status,
  priority,
  page,
  myOnly,
  totalCount,
  totalPages,
  paginationMode,
  isLoading,
  isError,
  error,
  username,
  showApplicantStats = false,
  applicantStats,
  onOpenMyNotes,
  onUpdateSearch,
  onFirstPage,
  onPrevPage,
  onNextPage,
  onLastPage,
}: NcrcDashboardControlsProps) {
  return (
    <div className="sticky top-16 z-20 bg-gray-50 pb-4">
      <div className="flex items-start justify-between gap-4 pt-6 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Application Dashboard</h2>
          <p className="text-gray-600">Executive Overview - Certification Management</p>
        </div>
        <button
          type="button"
          onClick={onOpenMyNotes}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          title={username ? `View notes for ${username}` : 'View my notes'}
          aria-label={username ? `View notes for ${username}` : 'View my notes'}
        >
          <MessageSquareText className="h-4 w-4" />
          My Notes
        </button>
      </div>

      {showApplicantStats && (
        <div className="pb-4">
          <ApplicantStatsCards stats={applicantStats} />
        </div>
      )}

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company, plant, region..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                value={q}
                onChange={(event) => onUpdateSearch({ q: event.target.value, page: 0 })}
              />
            </div>
          </div>

          <select
            value={status}
            onChange={(event) => onUpdateSearch({ status: event.target.value, page: 0 })}
            className="min-w-[140px] rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="COMPL">Certified</option>
            <option value="CONTRACT">Contract Sent</option>
            <option value="DISP">Dispatched</option>
            <option value="INC">Incomplete</option>
            <option value="INP">In Progress</option>
            <option value="INSPECTION">Inspection Scheduled</option>
            <option value="NEW">New</option>
            <option value="PAYPEND">Payment Pending</option>
            <option value="REVIEW">Under Review</option>
            <option value="WTH">Withdrawn</option>
          </select>

          <select
            value={priority}
            onChange={(event) => onUpdateSearch({ priority: event.target.value, page: 0 })}
            className="min-w-[120px] rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="ml-auto flex items-center border-gray-200">
            <div
              className="inline-flex overflow-hidden rounded-lg border border-gray-300"
              role="group"
              aria-label="Application visibility filter"
            >
              <button
                type="button"
                onClick={() => onUpdateSearch({ myOnly: true, page: 0 })}
                aria-pressed={Boolean(myOnly)}
                className={[
                  'border-l border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors',
                  myOnly ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                ].join(' ')}
                title="Show only applications assigned to me"
              >
                My Apps
              </button>
              <button
                type="button"
                onClick={() => onUpdateSearch({ myOnly: false, page: 0 })}
                aria-pressed={!myOnly}
                className={[
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  !myOnly ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                ].join(' ')}
                title="Show all applications"
              >
                All Apps
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading && paginationMode === 'paged' && (
        <div className="mb-4 text-gray-500">Loading applicants...</div>
      )}
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 py-4 text-center">
          <div className="font-semibold text-red-600">Error loading applications</div>
          <div className="mt-2 text-gray-600">{(error as Error).message}</div>
        </div>
      )}

      {paginationMode === 'paged' && !isError && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-sm text-gray-600">
            Showing {page + 1}-{Math.min(page + PAGE_SIZE, totalCount)} of {totalCount} applications
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onFirstPage}
              disabled={page === 0}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={onPrevPage}
              disabled={page === 0}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium">
              Page {Math.floor(page / PAGE_SIZE) + 1} of {totalPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={page + PAGE_SIZE >= totalCount}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={onLastPage}
              disabled={page + PAGE_SIZE >= totalCount}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
