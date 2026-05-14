import { PrelimApplicationCard } from '@/features/prelim/components/PrelimApplicationCard'

type Props = {
  applications: any[]
  expandedTaskPanel: string | null
  setExpandedTaskPanel: (id: string | null) => void
  onViewApplication: (externalReferenceId: string | number | null | undefined) => void
  handleCancelTask: (...args: any[]) => void
  handleTaskAction: (...args: any[]) => void
}

export function PrelimDashboardList({
  applications,
  expandedTaskPanel,
  setExpandedTaskPanel,
  onViewApplication,
  handleCancelTask,
  handleTaskAction,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {applications.length > 0 ? (
        applications.map((application: any) => (
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
    </div>
  )
}
