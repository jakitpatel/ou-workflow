import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignTask, confirmTask } from '@/api';
import { TASK_TYPES, TASK_CATEGORIES } from '@/lib/constants/task';
import { getAllTasks, getProgressStatus, detectRole } from '@/lib/utils/taskHelpers';
import type { Applicant, Task } from '@/types/application';

type Params = {
  applications: Applicant[];
  token?: string;
  username?: string;
  onError?: (msg: string) => void;
};

export function useTaskActions({
  applications,
  token,
  username,
  onError,
}: Params) {
  const queryClient = useQueryClient();

  const confirmTaskMutation = useMutation({
    mutationFn: confirmTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error: any) => {
      onError?.(
        error?.message ||
        error?.response?.data?.message ||
        'Task confirmation failed'
      );
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: assignTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error: any) => {
      onError?.(
        error?.message ||
        error?.response?.data?.message ||
        'Task assignment failed'
      );
    },
  });

  const executeAction = (
    assignee: string,
    action: any,
    result?: string,
    selectedAction?: { application: Applicant; action: Task } | null,
  ) => {
    const taskType = action.taskType?.toLowerCase();
    const taskCategory = action.taskCategory?.toLowerCase();
    const taskId = action.TaskInstanceId;

    const baseParams = {
      taskId,
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: action.capacity ?? undefined,
    };

    if (taskType === TASK_TYPES.CONFIRM) {
      confirmTaskMutation.mutate(baseParams);
      return;
    }

    if (
      [TASK_TYPES.CONDITIONAL, TASK_TYPES.CONDITION].includes(taskType as any)
    ) {
      confirmTaskMutation.mutate({ ...baseParams, result: result ?? undefined });
      return;
    }

    if (taskType === TASK_TYPES.ACTION) {
      if (taskCategory === TASK_CATEGORIES.ASSIGNMENT) {
        const appId =
          selectedAction?.application?.applicationId ??
          action.application?.applicationId ??
          action.applicationId;

        const role = detectRole(selectedAction?.action?.PreScript);

        assignTaskMutation.mutate({
          appId,
          taskId,
          role,
          assignee,
          token,
          capacity: action.capacity ?? undefined
        });
        return;
      }

      confirmTaskMutation.mutate({ ...baseParams, result });
      return;
    }

    if (taskType === TASK_TYPES.PROGRESS) {
      confirmTaskMutation.mutate({
        ...baseParams,
        result,
        status: getProgressStatus(result ?? ''),
      });
    }
  };

  const getSelectedAction = (selectedActionId: string | null) =>
    useMemo(() => {
      if (!selectedActionId) return null;
      const [appId, actId] = selectedActionId.split(':');

      const app = applications.find(
        a => String(a.applicationId) === appId
      );
      if (!app) return null;

      const action = getAllTasks(app).find(
        t => String(t.TaskInstanceId) === actId
      );
      if (!action) return null;

      return { application: app, action };
    }, [selectedActionId, applications]);

  return { executeAction, getSelectedAction };
}
