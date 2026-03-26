import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearch, useNavigate, useParams } from '@tanstack/react-router';
import { useUser } from '@/context/UserContext';
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import { UploadNdaModal } from '@/components/ou-workflow/modal/UploadNdaModal';
import { PlantHistoryModal } from './PlantHistoryModal';
import { TaskStatsCards } from './TaskStatsCards';
import { TaskFilters } from './TaskFilters';
import { TaskRow } from './TaskRow';
import { plantHistory } from './demoData';
import { useTasks } from '@/features/tasks/hooks/useTaskQueries';
import { ErrorDialog, type ErrorDialogRef } from '@/components/ErrorDialog';
import type { ApplicationTask, Task } from '@/types/application';
import { TASK_TYPES, TASK_CATEGORIES } from '@/lib/constants/task';
import {
  detectRole,
  getProgressStatus,
  normalizeStatus,
} from '@/lib/utils/taskHelpers';
import {
  useAssignTaskMutation,
  useConfirmTaskMutation,
} from '@/features/tasks/hooks/useTaskMutations';

type TaskSearchParams = {
  qs?: string;
  days?: string | number;
};

const DEBOUNCE_DELAY = 700;
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  normal: 2,
  low: 3,
};

const STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  COMPLETED: 'completed',
  COMPLETE: 'complete',
} as const;

type DaysFilter = string | number;

const calculateTaskStats = (tasks: ApplicationTask[]) => {
  const userTasks = tasks.map(task => ({
    ...task,
    status: normalizeStatus(task.status),
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
    }).length,
  };
};

export function TaskDashboard() {
  const search = useSearch({ strict: false }) as TaskSearchParams;
  const navigate = useNavigate();
  const params = useParams({ strict: false });

  const searchTerm = (search as any).qs || '';
  const daysFilter = (search as any).days || 'pending';
  const applicationId = (params as any)?.applicationId;

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [showPlantHistory, setShowPlantHistory] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<boolean | null | Task>(null);
  const [showConditionModal, setShowConditionModal] = useState<boolean | null | Task>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean | null | Task | ApplicationTask>(null);
  const [selectedAction, setSelectedAction] = useState<{ application: any; action: any } | null>(null);
  const errorDialogRef = useRef<ErrorDialogRef>(null);

  const { username, role, roles, token } = useUser();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [searchTerm]);

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
    error,
  } = useTasks(normalizedAppId, debouncedSearchTerm, daysFilter);

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

  const taskStats = useMemo(() => calculateTaskStats(tasksplants), [tasksplants]);

  const filteredTasks = useMemo(() => {
    const isAllRole = role?.toUpperCase() === 'ALL';
    const userRoles = isAllRole
      ? (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
      : role
        ? [role.toLowerCase()]
        : [];

    const filtered = tasksplants.filter(task => {
      if (!isAllRole) {
        const taskRole = task.assigneeRole?.toLowerCase();
        return taskRole && userRoles.includes(taskRole);
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const aPriority = normalizeStatus(a.priority);
      const bPriority = normalizeStatus(b.priority);
      const priorityDiff =
        (PRIORITY_ORDER[aPriority] ?? 99) - (PRIORITY_ORDER[bPriority] ?? 99);

      if (priorityDiff !== 0) return priorityDiff;
      return (b.daysActive ?? 0) - (a.daysActive ?? 0);
    });
  }, [tasksplants, role, roles]);

  const confirmTaskMutation = useConfirmTaskMutation({
    onError: (message) => {
      console.error('Failed to confirm task:', message);
      errorDialogRef.current?.open(message);
    },
  });

  const assignTaskMutation = useAssignTaskMutation({
    onError: (message) => {
      console.error('Failed to assign task:', message);
      errorDialogRef.current?.open(message);
    },
  });

  const executeAction = useCallback(
    (
      assignee: string,
      action: any,
      result?: string | { inspectionNeeded: 'YES' | 'NO'; feeNeeded: 'YES' | 'NO' },
      selectedActionArg?: { application: any; action: any } | null
    ) => {
      const taskType = action.taskType?.toLowerCase();
      const taskCategory = (action.taskCategory || action.TaskCategory)?.toLowerCase();
      const taskId = action?.TaskInstanceId ?? action?.taskInstanceId;
      let capacity = '';
      const assigneeValue = action.assignee;

      if (assigneeValue.trim() !== '' && assigneeValue.toUpperCase() !== 'NULL') {
        if (username?.toLowerCase() === assigneeValue.toLowerCase()) {
          capacity = 'MEMBER';
        } else {
          capacity = 'ASSISTANT';
        }
      } else {
        capacity = 'DESIGNATED';
      }

      const mutationParams = {
        taskId,
        token: token ?? undefined,
        username: username ?? undefined,
        capacity,
      };

      if (taskType === TASK_TYPES.CONFIRM && taskCategory === TASK_CATEGORIES.CONFIRMATION) {
        confirmTaskMutation.mutate(mutationParams);
      } else if (
        (taskType === TASK_TYPES.CONDITIONAL || taskType === TASK_TYPES.CONDITION) &&
        [TASK_CATEGORIES.APPROVAL, TASK_CATEGORIES.APPROVAL1].includes(taskCategory)
      ) {
        if (taskCategory === TASK_CATEGORIES.APPROVAL1 && result && typeof result === 'object') {
          confirmTaskMutation.mutate({
            ...mutationParams,
            result: 'YES',
            inspectionNeeded: result.inspectionNeeded,
            feeNeeded: result.feeNeeded,
          });
        } else {
          confirmTaskMutation.mutate({
            ...mutationParams,
            result: typeof result === 'string' ? result : undefined,
          });
        }
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.SELECTOR) {
        confirmTaskMutation.mutate({
          ...mutationParams,
          result: typeof result === 'string' ? result : undefined,
        });
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.INPUT) {
        confirmTaskMutation.mutate({
          ...mutationParams,
          result: typeof result === 'string' ? result : undefined,
        });
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.SCHEDULING) {
        confirmTaskMutation.mutate({
          ...mutationParams,
          result: typeof result === 'string' ? result : undefined,
        });
      } else if (taskType === TASK_TYPES.PROGRESS && taskCategory === TASK_CATEGORIES.PROGRESS_TASK) {
        const stringResult = typeof result === 'string' ? result : '';
        const status = stringResult ? getProgressStatus(stringResult) : '';
        confirmTaskMutation.mutate({ ...mutationParams, result: stringResult || undefined, status });
      } else if (taskType === TASK_TYPES.ACTION && taskCategory === TASK_CATEGORIES.ASSIGNMENT) {
        const effectiveSelectedAction = selectedActionArg ?? selectedAction;
        const rawAppId =
          effectiveSelectedAction?.application?.applicationId ??
          effectiveSelectedAction?.application?.id ??
          action?.applicationId;
        const appId = rawAppId == null || Number.isNaN(Number(rawAppId)) ? null : Number(rawAppId);
        const rawLabel = action?.PreScript ?? effectiveSelectedAction?.action?.PreScript;
        const roleType = detectRole(rawLabel);

        assignTaskMutation.mutate({
          appId,
          taskId,
          role: roleType,
          assignee,
          token: token ?? undefined,
          capacity,
        });
      }
    },
    [confirmTaskMutation, assignTaskMutation, token, username, selectedAction]
  );

  const handleSelectAppActions = useCallback((application: any) => {
    setSelectedAction({ application, action: application });
  }, []);

  const completeTaskWithResult = useCallback(
    (action: any, result: string, status?: string, completionNotes?: string) => {
      const taskId = action?.TaskInstanceId ?? action?.taskInstanceId ?? action?.id;
      const assigneeValue = action?.assignee;
      let capacity = '';

      if (typeof assigneeValue === 'string' && assigneeValue.trim() !== '' && assigneeValue.toUpperCase() !== 'NULL') {
        capacity = username?.toLowerCase() === assigneeValue.toLowerCase() ? 'MEMBER' : 'ASSISTANT';
      } else {
        capacity = 'DESIGNATED';
      }

      confirmTaskMutation.mutate({
        taskId,
        token: token ?? undefined,
        username: username ?? undefined,
        capacity,
        result,
        status,
        completionNotes,
      });
    },
    [confirmTaskMutation, token, username]
  );

  const handleApplicationTaskAction = useCallback(
    (e: React.MouseEvent<HTMLElement>, application: any) => {
      e.stopPropagation();
      e.preventDefault();

      console.log('Action clicked for application:', application);

      handleSelectAppActions(application);

      const actionType = application.taskType?.toLowerCase();
      const actionCategory = (application.taskCategory || application.TaskCategory)?.toLowerCase();

      if (actionType === TASK_TYPES.CONFIRM && actionCategory === TASK_CATEGORIES.CONFIRMATION) {
        executeAction('Confirmed', application, 'no');
      } else if (
        (actionType === TASK_TYPES.CONDITIONAL || actionType === TASK_TYPES.CONDITION) &&
        [TASK_CATEGORIES.APPROVAL, TASK_CATEGORIES.APPROVAL1].includes(actionCategory)
      ) {
        setShowConditionModal(application);
      } else if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.ASSIGNMENT) {
        setShowActionModal(application);
      } else if (
        actionType === TASK_TYPES.ACTION &&
        [TASK_CATEGORIES.SELECTOR, TASK_CATEGORIES.INPUT, TASK_CATEGORIES.SCHEDULING].includes(
          actionCategory
        )
      ) {
        setShowConditionModal(application);
      } else if (
        actionType === TASK_TYPES.ACTION &&
        [TASK_CATEGORIES.UPLOAD, TASK_CATEGORIES.EMAIL].includes(actionCategory)
      ) {
        setShowUploadModal(application);
      } else if (
        actionType === TASK_TYPES.UPLOAD &&
        actionCategory === TASK_CATEGORIES.UPLOAD
      ) {
        setShowUploadModal(application);
      } else if (actionType === TASK_TYPES.PROGRESS && actionCategory === TASK_CATEGORIES.PROGRESS_TASK) {
        setShowConditionModal(application);
      }
    },
    [executeAction, handleSelectAppActions]
  );

  const handleShowPlantHistory = useCallback((plantName: string) => {
    setShowPlantHistory(plantName);
  }, []);

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
                <TaskFilters
                  searchTerm={searchTerm}
                  setSearchTerm={value =>
                    navigate({
                      search: (prev: TaskSearchParams) => ({
                        ...prev,
                        qs: value,
                      }),
                    } as any)
                  }
                />
              </div>

              <div className="shrink-0">
                <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
                  {(['pending', 7, 30] as DaysFilter[]).map((option, i, arr) => (
                    <button
                      key={option}
                      onClick={() =>
                        navigate({
                          search: (prev: TaskSearchParams) => ({
                            ...prev,
                            days: option,
                          }),
                        } as any)
                      }
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
                  {filteredTasks.map(application => (
                    <TaskRow
                      key={application.taskInstanceId}
                      application={application}
                      plantInfo={
                        plantHistory[String(application.plantId) as keyof typeof plantHistory] ||
                        undefined
                      }
                      handleApplicationTaskAction={handleApplicationTaskAction}
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
        taskInstanceId={selectedAction?.action?.taskInstanceId ?? selectedAction?.action?.TaskInstanceId}
        completeTaskWithResult={completeTaskWithResult}
      />
      <PlantHistoryModal {...{ showPlantHistory, setShowPlantHistory, plantHistory }} />
      <ErrorDialog ref={errorDialogRef} />
    </>
  );
}
