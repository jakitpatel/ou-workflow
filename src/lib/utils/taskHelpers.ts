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

export const getStatusLabel = (status?: string) => {
  const s = status?.toLowerCase();
  if (s === 'pending') return 'Ready';
  if (s === 'new') return 'Not Ready';
  return s || 'Unknown';
};