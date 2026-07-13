import { ActionModal } from '@/features/tasks/modals/ActionModal'
import { ConditionalModal } from '@/features/tasks/modals/ConditionalModal'
import { PrelimApplicationDetailsDrawer } from '@/features/prelim/components/PrelimApplicationDetailsDrawer'
import { PrelimDashboardFilters } from '@/features/prelim/components/PrelimDashboardFilters'
import { PrelimDashboardList } from '@/features/prelim/components/PrelimDashboardList'
import { usePrelimDashboardState } from '@/features/prelim/hooks/usePrelimDashboardState'

export function PrelimDashboardContent() {
  const {
    q,
    status,
    applications,
    isLoading,
    expandedTaskPanel,
    setExpandedTaskPanel,
    selectedId,
    setSelectedId,
    applicationDetails,
    isDetailsLoading,
    applicationDetailsError,
    updateSearch,
    handleTaskAction,
    handleCancelTask,
    showActionModal,
    setShowActionModal,
    showConditionModal,
    setShowConditionModal,
    selectedAction,
    executeAction,
  } = usePrelimDashboardState()

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Application Intake</h1>

      <PrelimDashboardFilters q={q} status={status} onChange={updateSearch} />

      <PrelimDashboardList
        applications={applications}
        expandedTaskPanel={expandedTaskPanel}
        setExpandedTaskPanel={setExpandedTaskPanel}
        onViewApplication={(externalReferenceId) =>
          setSelectedId(externalReferenceId == null ? null : Number(externalReferenceId))
        }
        handleCancelTask={handleCancelTask}
        handleTaskAction={handleTaskAction}
      />

      <PrelimApplicationDetailsDrawer
        open={selectedId !== null}
        externalReferenceId={selectedId}
        data={applicationDetails}
        isLoading={isDetailsLoading}
        error={applicationDetailsError}
        onClose={() => setSelectedId(null)}
      />

      <ActionModal
        setShowActionModal={setShowActionModal}
        showActionModal={showActionModal}
        executeAction={executeAction}
        selectedAction={selectedAction}
      />
      <ConditionalModal
        setShowConditionModal={setShowConditionModal}
        showConditionModal={showConditionModal}
        executeAction={executeAction}
        selectedAction={selectedAction}
      />
    </div>
  )
}
