import { ErrorDialog } from '@/components/ErrorDialog';
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import { UploadNdaModal } from '@/components/ou-workflow/modal/UploadNdaModal';
import { useTaskDashboardState } from '@/features/tasks/hooks/useTaskDashboardState';
import { plantHistory } from '@/features/tasks/model/plantHistory';

import { PlantHistoryModal } from './PlantHistoryModal';
import { TaskFilters } from './TaskFilters';
import { TaskRow } from './TaskRow';
import { TaskStatsCards } from './TaskStatsCards';

export function TaskDashboardContent() {
  const {
    username,
    role,
    searchTerm,
    daysFilter,
    filteredTasks,
    taskStats,
    isLoading,
    isError,
    error,
    showPlantHistory,
    setShowPlantHistory,
    showActionModal,
    setShowActionModal,
    showConditionModal,
    setShowConditionModal,
    showUploadModal,
    setShowUploadModal,
    selectedAction,
    executeAction,
    completeTaskWithResult,
    handleTaskAction,
    handleShowPlantHistory,
    setSearchTerm,
    setDaysFilter,
    errorDialogRef,
  } = useTaskDashboardState();

  if (isLoading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto bg-gray-50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto bg-gray-50 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">Error loading tasks</p>
          <p className="mt-1 text-sm text-red-600">
            {error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="sticky top-16 z-20 bg-gray-50 pb-4">
            <header className="pt-6 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">Tasks & Notifications</h1>
              <p className="mt-1 text-gray-600">
                Welcome back, {username || 'User'} • Role: {role || 'Not assigned'}
              </p>
            </header>

            <div className="pb-4">
              <TaskStatsCards stats={taskStats} />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
              <div className="flex-1">
                <TaskFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              </div>

              <div className="shrink-0">
                <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
                  {(['pending', 7, 30] as Array<string | number>).map((option, i, arr) => (
                    <button
                      key={option}
                      onClick={() => setDaysFilter(option)}
                      className={[
                        'px-3 py-1.5 text-sm font-medium transition',
                        'border-r border-gray-300 last:border-r-0',
                        daysFilter === option
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100',
                        i === 0 && 'rounded-l-lg',
                        i === arr.length - 1 && 'rounded-r-lg',
                      ].join(' ')}
                    >
                      {option === 'pending' ? 'Pending' : `${option} Days`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="relative max-h-[calc(100vh-20rem)] overflow-y-auto">
              <table className="min-w-full table-fixed">
                <thead className="sticky top-0 z-10 border-b bg-gray-50">
                  <tr>
                    <th className="w-[28%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Task & Plant
                    </th>
                    <th className="w-[16%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                    <th className="w-[12%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Role
                    </th>
                    <th className="w-[14%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Assignee
                    </th>
                    <th className="w-[15%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Stage
                    </th>
                    <th className="w-[15%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredTasks.map((application) => (
                    <TaskRow
                      key={application.taskInstanceId}
                      application={application}
                      plantInfo={
                        plantHistory[String(application.plantId) as keyof typeof plantHistory] ||
                        undefined
                      }
                      handleApplicationTaskAction={handleTaskAction}
                      handleShowPlantHistory={handleShowPlantHistory}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ActionModal {...{ showActionModal, setShowActionModal, executeAction, selectedAction }} />
      <ConditionalModal
        {...{ showConditionModal, setShowConditionModal, executeAction, selectedAction }}
      />
      <UploadNdaModal
        showUploadModal={showUploadModal}
        setShowUploadModal={setShowUploadModal}
        selectedAction={selectedAction}
        taskInstanceId={
          selectedAction?.action?.taskInstanceId ?? selectedAction?.action?.TaskInstanceId
        }
        completeTaskWithResult={completeTaskWithResult}
      />
      <PlantHistoryModal {...{ showPlantHistory, setShowPlantHistory, plantHistory }} />
      <ErrorDialog ref={errorDialogRef} />
    </>
  );
}
