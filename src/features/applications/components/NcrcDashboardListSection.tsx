import { Search } from 'lucide-react'
import { ApplicantCard } from '@/features/applications/components/ApplicantCard'
import type { Applicant, Task } from '@/types/application'

type NcrcDashboardListSectionProps = {
  applicants: Applicant[]
  paginationMode: 'paged' | 'infinite'
  isLoading: boolean
  isError: boolean
  isInfiniteInitialLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
  onTaskAction: (event: React.MouseEvent, application: Applicant, action: Task) => void
  onCancelTask: (application: Applicant, action: Task, reason: string) => Promise<void>
}

export function NcrcDashboardListSection({
  applicants,
  paginationMode,
  isLoading,
  isError,
  isInfiniteInitialLoading,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
  onTaskAction,
  onCancelTask,
}: NcrcDashboardListSectionProps) {
  return (
    <div className="pb-8">
      {paginationMode === 'infinite' && isInfiniteInitialLoading && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-4 text-gray-500">Loading applications...</p>
        </div>
      )}

      {!isError && (
        <div className="space-y-4">
          {applicants.length > 0 ? (
            applicants.map((applicant) => (
              <ApplicantCard
                key={`${applicant.applicationId}-${paginationMode}`}
                applicant={applicant}
                handleTaskAction={onTaskAction}
                handleCancelTask={onCancelTask}
              />
            ))
          ) : (
            !isLoading && (
              <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="mb-2 text-lg font-medium text-gray-900">No applications found</p>
                  <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {paginationMode === 'infinite' && !isError && (
        <>
          {hasNextPage && <div ref={sentinelRef} className="h-1" />}

          {isFetchingNextPage && (
            <div className="py-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-blue-500 border-r-transparent" />
              <p className="mt-2 text-sm text-gray-500">Loading more applications...</p>
            </div>
          )}

          {!hasNextPage && applicants.length > 0 && !isFetchingNextPage && (
            <div className="mt-6 py-8 text-center">
              <div className="inline-block rounded-full bg-gray-100 px-4 py-2">
                <p className="text-sm font-medium text-gray-600">
                  All {applicants.length} applications loaded
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
