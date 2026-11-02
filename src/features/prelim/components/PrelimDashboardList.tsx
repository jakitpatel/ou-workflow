import { PrelimApplicationCard } from '@/features/prelim/components/PrelimApplicationCard'

type Props = {
  applications: import('@/types/application').Applicant[]
  expandedTaskPanel: string | null
  setExpandedTaskPanel: (id: string | null) => void
  onViewApplication: (externalReferenceId: string | number | null | undefined) => void
  handleCancelTask: (application: import('@/types/application').Applicant, action: import('@/types/application').Task, reason: string) => void
  handleTaskAction: (event: React.MouseEvent, application: import('@/types/application').Applicant, action: import('@/types/application').Task) => void
  paginationMode: 'paged' | 'infinite'
  hasNextPage: boolean
  isFetchingNextPage: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
}

export function PrelimDashboardList({
  applications,
  expandedTaskPanel,
  setExpandedTaskPanel,
  onViewApplication,
  handleCancelTask,
  handleTaskAction,
  paginationMode,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {applications.length > 0 ? (
        applications.map((application) => (
          <PrelimApplicationCard
            key={application.applicationId}
            company={application}
            expanded={expandedTaskPanel === String(application.applicationId)}
            setExpanded={setExpandedTaskPanel}
            onViewApplication={() => onViewApplication(application.externalReferenceId)}
            handleCancelTask={handleCancelTask}
            handleTaskAction={handleTaskAction}
          />
        ))
      ) : (
        <p className="text-gray-500">No applications found</p>
      )}
      {paginationMode === 'infinite' && hasNextPage && <div ref={sentinelRef} className="h-1" />}
      {paginationMode === 'infinite' && isFetchingNextPage && (
        <p className="py-4 text-center text-sm text-gray-500">Loading more applications...</p>
      )}
      {paginationMode === 'infinite' &&
        !hasNextPage &&
        applications.length > 0 &&
        !isFetchingNextPage && (
          <p className="py-4 text-center text-sm text-gray-500">
            All {applications.length} applications loaded
          </p>
        )}
    </div>
  )
}
