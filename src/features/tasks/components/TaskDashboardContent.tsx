import { ErrorDialog } from '@/components/ErrorDialog';
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import { UploadNdaModal } from '@/components/ou-workflow/modal/UploadNdaModal';
import { ScheduleAIngredientsDrawer } from '@/features/applications/components/ScheduleAIngredientsDrawer';
import { ScheduleBProductsDrawer } from '@/features/applications/components/ScheduleBProductsDrawer';
import { useTaskDashboardState } from '@/features/tasks/hooks/useTaskDashboardState';
import { plantHistory } from '@/features/tasks/model/plantHistory';

import { PlantHistoryModal } from './PlantHistoryModal';
import { TaskDashboardHeader } from './TaskDashboardHeader';
import { TaskDashboardTable } from './TaskDashboardTable';

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
    scheduleADrawerState,
    setScheduleADrawerState,
    scheduleBDrawerState,
    setScheduleBDrawerState,
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
          <TaskDashboardHeader
            daysFilter={daysFilter}
            role={role}
            searchTerm={searchTerm}
            setDaysFilter={setDaysFilter}
            setSearchTerm={setSearchTerm}
            stats={taskStats}
            username={username}
          />

          <TaskDashboardTable
            filteredTasks={filteredTasks}
            handleApplicationTaskAction={handleTaskAction}
            handleShowPlantHistory={handleShowPlantHistory}
          />
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
      <ScheduleAIngredientsDrawer
        open={scheduleADrawerState.open}
        applicationId={scheduleADrawerState.applicationId}
        applicationName={scheduleADrawerState.applicationName}
        taskName={scheduleADrawerState.taskName}
        onClose={() => setScheduleADrawerState({ open: false })}
      />
      <ScheduleBProductsDrawer
        open={scheduleBDrawerState.open}
        applicationId={scheduleBDrawerState.applicationId}
        applicationName={scheduleBDrawerState.applicationName}
        taskName={scheduleBDrawerState.taskName}
        onClose={() => setScheduleBDrawerState({ open: false })}
      />
    </>
  );
}
