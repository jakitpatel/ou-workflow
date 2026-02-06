import type { Applicant, Task } from '@/types/application';

export const getAllTasks = (app: Applicant): Task[] => {
  if (!app?.stages) return [];
  return Object.values(app.stages).flatMap(stage => stage.tasks || []);
};

export const getProgressStatus = (result: string): string => {
  const statusMap: Record<string, string> = {
    completed: 'Completed',
    in_progress: 'In Progress',
    pending: 'Pending',
  };
  return statusMap[result] || '';
};

export const detectRole = (preScript?: string): string => {
  if (!preScript) return 'OtherRole';
  const [, role] = preScript.split(',');
  return role?.trim().toUpperCase();
};
