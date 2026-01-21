import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignTask, confirmTask } from '@/api';
import { useUser } from '@/context/UserContext';
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import { PlantHistoryModal } from './PlantHistoryModal';
import { TaskStatsCards } from './TaskStatsCards';
import { TaskFilters } from './TaskFilters';
import { TaskRow } from './TaskRow';
import { plantHistory } from './demoData';
import { useTasks } from '@/components/ou-workflow/hooks/useTaskDashboardHooks';
import { ErrorDialog, type ErrorDialogRef } from '@/components/ErrorDialog';
import type { ApplicationTask, Task } from '@/types/application';

// Constants
const DEBOUNCE_DELAY = 700; // Reduced from 1000ms for better UX
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  normal: 2,
  low: 3
};

const STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  COMPLETED: 'completed',
  COMPLETE: 'complete'
} as const;

const TASK_TYPES = {
  CONFIRM: 'confirm',
  CONDITIONAL: 'conditional',
  CONDITION: 'condition',
  ACTION: 'action',
  PROGRESS: 'progress'
} as const;

const TASK_CATEGORIES = {
  CONFIRMATION: 'confirmation',
  APPROVAL: 'approval',
  SELECTOR: 'selector',
  INPUT: 'input',
  SCHEDULING: 'scheduling',
  PROGRESS_TASK: 'progress_task',
  ASSIGNMENT: 'assignment'
} as const;

// Types
type TaskDashboardProps = {
  applicationId?: string | number | null;
};

type DaysFilter = 'pending' | 7 | 30;

// Helper Functions
const normalizeId = (id: string | number | undefined | null): string => {
  return id != null ? String(id) : '';
};

const normalizeStatus = (status: string | undefined): string => {
  return status?.toLowerCase() || '';
};

const calculateTaskStats = (tasks: ApplicationTask[]) => {
  const userTasks = tasks.map(task => ({
    ...task,
    status: normalizeStatus(task.status)
  }));

  return {
    total: userTasks.length,
    new: userTasks.filter(t => t.status === STATUS.NEW).length,
    inProgress: userTasks.filter(t => {
      const status = normalizeStatus(t.status);
      return status === STATUS.IN_PROGRESS || status === STATUS.PENDING;
    }).length,
    overdue: userTasks.filter(t => t.daysOverdue > 0).length,
    completed: userTasks.filter(t => {
      const status = normalizeStatus(t.status);
      return status === STATUS.COMPLETED || status === STATUS.COMPLETE;
    }).length
  };
};

const determineTaskRole = (preScript: string): string => {
  if (!preScript) return "OtherRole";

  // "api/vSelectRFR,RFR" → ["api/vSelectRFR", "RFR"]
  const [, role] = preScript.split(",");

  return role?.trim().toUpperCase();
};

const getStatusFromResult = (result: string): string => {
  switch (result) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'pending':
      return 'Pending';
    default:
      return '';
  }
};

// Main Component
export function TaskDashboard({ applicationId }: TaskDashboardProps) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [showPlantHistory, setShowPlantHistory] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<boolean | null | Task>(null);
  const [showConditionModal, setShowConditionModal] = useState<boolean | null | Task>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [daysFilter, setDaysFilter] = useState<DaysFilter>('pending');

  // Refs
  const errorDialogRef = useRef<ErrorDialogRef>(null);

  // Context & Hooks
  const { username, role, roles, token } = useUser();
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch tasks
  const normalizedAppId = useMemo(() => {
    if (typeof applicationId === 'string' || applicationId === undefined) {
      return applicationId;
    }
    return applicationId != null ? String(applicationId) : undefined;
  }, [applicationId]);

  const {
    data: tasksplants = [],
    isLoading,
    isError,
    error
  } = useTasks(normalizedAppId, debouncedSearchTerm, daysFilter);

  // Close modals on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (
        target &&
        !target.closest('.task-assignment-panel') &&
        !target.closest('.plant-history-modal')
      ) {
        if (!target.closest('.plant-history-modal')) {
          setShowPlantHistory(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate stats
  const taskStats = useMemo(
    () => calculateTaskStats(tasksplants),
    [tasksplants]
  );

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    const isAllRole = role?.toUpperCase() === 'ALL';
    const userRoles = isAllRole
      ? (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
      : role
      ? [role.toLowerCase()]
      : [];

    // Filter by role
    let filtered = tasksplants.filter(task => {
      if (!isAllRole) {
        const taskRole = task.assigneeRole?.toLowerCase();
        return taskRole && userRoles.includes(taskRole);
      }
      return true;
    });

    // Sort by priority and activity
    return filtered.sort((a, b) => {
      const aPriority = normalizeStatus(a.priority);
      const bPriority = normalizeStatus(b.priority);
      const priorityDiff = (PRIORITY_ORDER[aPriority] ?? 99) - (PRIORITY_ORDER[bPriority] ?? 99);
      
      if (priorityDiff !== 0) return priorityDiff;
      return (b.daysActive ?? 0) - (a.daysActive ?? 0);
    });
  }, [tasksplants, role, roles]);

  // Mutations
  const confirmTaskMutation = useMutation({
    mutationFn: confirmTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasksplants'] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to confirm task:', error);
      const message =
        error?.message ||
        error?.response?.data?.message ||
        'Something went wrong while confirming the task.';
      errorDialogRef.current?.open(message);
    }
  });

  const assignTaskMutation = useMutation({
    mutationFn: assignTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasksplants'] });
    },
    onError: (error: any) => {
      console.error('❌ Failed to assign task:', error);
      const message =
        error?.message ||
        error?.response?.data?.message ||
        'Something went wrong while assigning the task.';
      errorDialogRef.current?.open(message);
    }
  });

  // Action handlers
  const executeAction = useCallback(
    (assignee: string, action: any, result?: string) => {
      const taskType = action.taskType?.toLowerCase();
      const taskCategory = (action.taskCategory || action.TaskCategory)?.toLowerCase();
      const taskId = action?.TaskInstanceId ?? action?.taskInstanceId;
      let capacity = "";
      let assigneeValue = action.assignee;
      if(assigneeValue.trim() !== '' && assigneeValue.toUpperCase() !== 'NULL'){
        if(username?.toLowerCase() === assigneeValue.toLowerCase()){
          capacity = "MEMBER";
        } else {
          capacity = "ASSISTANT";
        }
      } else {
        capacity = "DESIGNATED";
      }
      const mutationParams = {
        taskId,
        token: token ?? undefined,
        username: username ?? undefined,
        capacity: capacity
      };

      // Handle different task types
      if (taskType === TASK_TYPES.CONFIRM && taskCategory === TASK_CATEGORIES.CONFIRMATION) {
        confirmTaskMutation.mutate(mutationParams);
      } else if (
        (taskType === TASK_TYPES.CONDITIONAL || taskType === TASK_TYPES.CONDITION) &&
        taskCategory === TASK_CATEGORIES.APPROVAL
      ) {
        confirmTaskMutation.mutate({ ...mutationParams, result });
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.SELECTOR) {
        confirmTaskMutation.mutate({ ...mutationParams, result });
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.INPUT) {
        confirmTaskMutation.mutate({ ...mutationParams, result });
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.SCHEDULING) {
        confirmTaskMutation.mutate({ ...mutationParams, result });
      } else if (taskType === TASK_TYPES.PROGRESS && taskCategory === TASK_CATEGORIES.PROGRESS_TASK) {
        const status = result ? getStatusFromResult(result) : '';
        confirmTaskMutation.mutate({ ...mutationParams, result, status });
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.ASSIGNMENT) {
        // Fix: Handle both id and applicationId
        const appId = 
          selectedAction?.application?.id ?? 
          selectedAction?.application?.applicationId ?? 
          null;
        const rawLabel = action?.PreScript; //action?.name ?? action?.taskName ?? '';
        const roleType = determineTaskRole(rawLabel);

        assignTaskMutation.mutate({
          appId,
          taskId,
          role: roleType,
          assignee,
          token: token ?? undefined,
          capacity: capacity
        });
      }
    },
    [confirmTaskMutation, assignTaskMutation, token, username]
  );

  const handleSelectAppActions = useCallback((applicationId: string, actionId: string) => {
    setSelectedActionId(`${applicationId}:${actionId}`);
  }, []);

  const selectedAction = useMemo(() => {
    if (!selectedActionId) return null;

    const [appId, actId] = selectedActionId.split(':');

    // Fix: Check both id and applicationId fields
    const app = tasksplants.find(
      a => normalizeId(a.id) === normalizeId(appId) || 
           normalizeId(a.applicationId) === normalizeId(appId)
    );
    if (!app) {
      console.warn('No app found for', appId, 'in tasks:', tasksplants.map(t => ({ id: t.id, applicationId: t.applicationId })));
      return null;
    }

    const act = tasksplants.find(a => normalizeId(a.taskInstanceId) === normalizeId(actId));
    if (!act) {
      console.warn('No action found for', actId);
      return null;
    }

    return { application: app, action: act };
  }, [selectedActionId, tasksplants]);

  const handleApplicationTaskAction = useCallback(
    (e: React.MouseEvent<HTMLElement>, application: any) => {
      e.stopPropagation();
      e.preventDefault();

      console.log('Action clicked for application:', application);

      // Fix: Use applicationId instead of id
      const appId = application.id ?? application.applicationId;
      handleSelectAppActions(appId, application.taskInstanceId);

      const actionType = application.taskType?.toLowerCase();
      const actionCategory = application.TaskCategory?.toLowerCase();

      // Route to appropriate modal or execute action
      if (actionType === TASK_TYPES.CONFIRM && actionCategory === TASK_CATEGORIES.CONFIRMATION) {
        executeAction('Confirmed', application, 'no');
      } else if (
        (actionType === TASK_TYPES.CONDITIONAL || actionType === TASK_TYPES.CONDITION) &&
        actionCategory === TASK_CATEGORIES.APPROVAL
      ) {
        setShowConditionModal(application);
      } else if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.ASSIGNMENT) {
        setShowActionModal(application);
      } else if (
        actionType === TASK_TYPES.ACTION &&
        [TASK_CATEGORIES.SELECTOR, TASK_CATEGORIES.INPUT, TASK_CATEGORIES.SCHEDULING].includes(actionCategory)
      ) {
        setShowConditionModal(application);
      } else if (actionType === TASK_TYPES.PROGRESS && actionCategory === TASK_CATEGORIES.PROGRESS_TASK) {
        setShowConditionModal(application);
      }
    },
    [executeAction, handleSelectAppActions]
  );

  const handleShowPlantHistory = useCallback((plantName: string) => {
    setShowPlantHistory(plantName);
  }, []);

  const handleViewNCRCDashboard = useCallback(() => {
    console.log('Returning to NCRC Dashboard');
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error loading tasks</p>
          <p className="text-red-600 text-sm mt-1">{error?.message || 'An unexpected error occurred'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Modals */}
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
      <PlantHistoryModal
        showPlantHistory={showPlantHistory}
        setShowPlantHistory={setShowPlantHistory}
        plantHistory={plantHistory}
        onViewNCRCDashboard={handleViewNCRCDashboard}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tasks & Notifications</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {username || 'User'} • Role: {role || 'Not assigned'}
          </p>
        </header>

        {/* Stats Cards */}
        <TaskStatsCards stats={taskStats} />

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <TaskFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

          {/* Days Filter Buttons */}
          <div className="shrink-0">
            {/* Days Filter – Segmented Control */}
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              {(['pending', 7, 30] as DaysFilter[]).map((option, index, arr) => {
                const isActive = daysFilter === option;
                const isFirst = index === 0;
                const isLast = index === arr.length - 1;

                return (
                  <button
                    key={option}
                    onClick={() => setDaysFilter(option)}
                    aria-pressed={isActive}
                    className={[
                      'px-3 py-1.5 text-sm font-medium transition',
                      'border-r border-gray-300 last:border-r-0',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100',
                      isFirst && 'rounded-l-lg',
                      isLast && 'rounded-r-lg',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {option === 'pending' ? 'Pending' : `${option} Days`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Tasks Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Task & Plant
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Assignee
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Stage
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map(application => (
                  <TaskRow
                    key={application.taskInstanceId}
                    application={application}
                    plantInfo={plantHistory[String(application.plantId) as keyof typeof plantHistory]}
                    handleApplicationTaskAction={handleApplicationTaskAction as (e: React.MouseEvent<Element>, application: ApplicationTask) => void}
                    handleShowPlantHistory={handleShowPlantHistory}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border mt-6">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500 text-lg mt-4">No tasks match your current filters</p>
            <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Global Error Dialog */}
      <ErrorDialog ref={errorDialogRef} />
    </div>
  );
}