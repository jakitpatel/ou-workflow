import { ActionModal } from '@/components/ou-workflow/modal/ActionModal'
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal'
import { PrelimDashboardFilters } from '@/features/prelim/components/PrelimDashboardFilters'
import { PrelimDashboardList } from '@/features/prelim/components/PrelimDashboardList'
import { PrelimJsonModal } from '@/features/prelim/components/PrelimJsonModal'
import { PrelimApplicantStatsCards } from '@/features/prelim/components/PrelimApplicantStatsCards'
import { usePrelimDashboardState } from '@/features/prelim/hooks/usePrelimDashboardState'

const SHOW_PRELIM_APPLICANT_STATS_CARDS = false

export function PrelimDashboardContent() {
  const {
    q,
    status,
    applications,
    applicantStats,
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

      {SHOW_PRELIM_APPLICANT_STATS_CARDS && (
        <div className="pb-4">
          <PrelimApplicantStatsCards stats={applicantStats} />
        </div>
      )}

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

      {selectedId && (
        <PrelimJsonModal
          open={true}
          data={applicationDetails}
          isLoading={isDetailsLoading}
          error={applicationDetailsError}
          onClose={() => setSelectedId(null)}
        />
      )}

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
