import { Search } from 'lucide-react'
import { CompanyCard } from '@/components/ou-workflow/PrelimDashboard/CompanyCard'
import { JsonModal } from '@/components/ou-workflow/PrelimDashboard/JsonModal'
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal'
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal'
import { PrelimApplicantStatsCards } from './PrelimApplicantStatsCards'
import { usePrelimDashboardState } from '@/features/prelim/hooks/usePrelimDashboardState'

const SHOW_PRELIM_APPLICANT_STATS_CARDS = false

export function PrelimDashboard() {
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
                onChange={(event) => updateSearch({ q: event.target.value, page: 0 })}
              />
            </div>
          </div>

          <select
            value={status || 'all'}
            onChange={(event) => updateSearch({ status: event.target.value, page: 0 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            <option value="COMPL">Completed</option>
            <option value="INP">In Progress</option>
            <option value="NEW">New</option>
            <option value="WTH">Withdrawn</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {applications.length > 0 ? (
          applications.map((application: any) => (
            <CompanyCard
              key={application.applicationId}
              company={application}
              expanded={expandedTaskPanel === String(application.applicationId)}
              setExpanded={setExpandedTaskPanel}
              onViewApplication={() => setSelectedId(application.externalReferenceId)}
              handleCancelTask={handleCancelTask}
              handleTaskAction={handleTaskAction}
            />
          ))
        ) : (
          <p className="text-gray-500">No applications found</p>
        )}
      </div>

      {selectedId && (
        <JsonModal
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
