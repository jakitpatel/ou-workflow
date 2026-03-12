import type { Applicant, AssignedRole, Task } from '@/types/application';

export const getAllTasks = (app: Applicant): Task[] => {
  if (!app?.stages) return [];
  return Object.values(app.stages).flatMap(stage => stage.tasks || []);
};

export const COMPLETED_STATUSES = ['complete', 'done', 'completed', 'withdrawn'];

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

export const normalizeStatus = (status?: string): string =>
  status?.toLowerCase().trim().replace(/\s+/g, '_') ?? 'unknown';

export const normalizeTaskRoles = (
  taskRoles?: string | { taskRole: string }[]
): string[] => {
  if (Array.isArray(taskRoles)) {
    return taskRoles
      .map(role => (typeof role === 'string' ? role : role?.taskRole))
      .filter(Boolean)
      .map(role => role.toLowerCase());
  }

  if (typeof taskRoles === 'string') {
    return [taskRoles.toLowerCase()];
  }

  return [];
};

export const getAssignedUser = (
  taskRoles: string[] | undefined,
  assignedRoles: AssignedRole[] | undefined
): string | null => {
  if (!taskRoles?.length || !Array.isArray(assignedRoles)) return null;

  for (const taskRole of taskRoles) {
    if (!taskRole) continue;

    const normalizedTaskRole = taskRole.toLowerCase();

    for (const item of assignedRoles) {
      if ((item as Record<string, unknown>).isPrimary !== true) continue;

      const roleKey = Object.keys(item).find(key => key !== 'isPrimary');
      if (!roleKey) continue;

      if (roleKey.toLowerCase() === normalizedTaskRole) {
        return item[roleKey];
      }
    }
  }

  return null;
};

export const getStatusBadgeClass = (status: string): string => {
  const normalized = status.toLowerCase();

  if (COMPLETED_STATUSES.includes(normalized)) {
    return 'bg-green-100 text-green-800';
  }

  const statusMap: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800',
    new: 'bg-yellow-100 text-yellow-800',
  };

  return statusMap[normalized] ?? 'bg-gray-100 text-gray-800';
};

const STATUS_HEX_COLORS: Record<string, string> = {
  new: '#808080',
  completed: '#10b981',
  in_progress: '#3b82f6',
  overdue: '#ef4444',
  blocked: '#9ca3af',
  unknown: '#d1d5db',
};

export const getStageStatusColor = (status?: string): string =>
  STATUS_HEX_COLORS[normalizeStatus(status)] ?? STATUS_HEX_COLORS.unknown;

export const getTaskBorderClass = (status: string): string => {
  const normalized = status.toLowerCase();

  const borderMap: Record<string, string> = {
    completed: 'border-l-green-500',
    pending: 'border-l-blue-500',
    in_progress: 'border-l-blue-500',
    overdue: 'border-l-red-500',
    blocked: 'border-l-gray-400',
  };

  return borderMap[normalized] ?? 'border-l-yellow-500';
};

type TaskActionContext = {
  application: Applicant;
  task: Task;
  username?: string | null;
  userRoles: string[];
  delegated?: { name: string }[] | null;
  taskRolesAll?: string[];
  disableForCompletedApplication?: boolean;
};

type TaskActionResult = {
  TaskInstanceId: string;
  label: string;
  status: string;
  required: boolean;
  assignee: string | null;
  taskType: string;
  taskCategory: string;
  color: string;
  disabled: boolean;
  isdelegate: boolean;
  capacity: string;
};

export const mapTaskToAction = ({
  application,
  task,
  username,
  userRoles,
  delegated,
  taskRolesAll = [],
  disableForCompletedApplication = false,
}: TaskActionContext): TaskActionResult => {
  const status = normalizeStatus(task.status);
  const normalizedTaskRoles = normalizeTaskRoles(task.taskRoles);
  const applicationStatus = normalizeStatus(application.status);

  let color = 'bg-gray-300 cursor-not-allowed';
  let disabled = true;
  let isdelegate = false;
  let capacity = 'MEMBER';

  if (COMPLETED_STATUSES.includes(status)) {
    color = 'bg-green-400';
    disabled = true;
  } else if (
    disableForCompletedApplication &&
    COMPLETED_STATUSES.includes(applicationStatus)
  ) {
    color = 'bg-green-400';
    disabled = true;
  } else if (normalizedTaskRoles.length > 0) {
    const matchingRoles = userRoles.filter(role =>
      normalizedTaskRoles.includes(role)
    );

    if (matchingRoles.length > 0) {
      const assignedRoles = Array.isArray(application.assignedRoles)
        ? application.assignedRoles
        : [];

      const isAssigned = assignedRoles.some(assignedRole =>
        matchingRoles.some(
          role =>
            assignedRole[role.toUpperCase()]?.toLowerCase() ===
            username?.toLowerCase()
        )
      );

      if (isAssigned && (status === 'pending' || status === 'in_progress')) {
        color = 'bg-blue-600 hover:bg-blue-700';
        disabled = false;
        capacity = 'MEMBER';
      }

      const delegatedNames = delegated?.map(item => item.name.toLowerCase()) ?? [];

      const isAssignedToDelegated = assignedRoles.some(assignedRole =>
        matchingRoles.some(role => {
          const assignedName = assignedRole[role.toUpperCase()]?.toLowerCase();
          return Boolean(assignedName) && delegatedNames.includes(assignedName);
        })
      );

      if (
        isAssignedToDelegated &&
        (status === 'pending' || status === 'in_progress')
      ) {
        color = 'bg-blue-600 hover:bg-blue-700';
        disabled = false;
        isdelegate = true;
        capacity = 'ASSISTANT';
      }

      const hasIncludedRole = taskRolesAll.some(role =>
        normalizedTaskRoles.includes(role)
      );

      if (
        (status === 'pending' || status === 'in_progress') &&
        normalizedTaskRoles.length > 0 &&
        hasIncludedRole
      ) {
        color = 'bg-blue-600 hover:bg-blue-700';
        disabled = false;
        capacity = 'DESIGNATED';
      }
    }
  }

  const assignee = getAssignedUser(
    normalizedTaskRoles,
    Array.isArray(application.assignedRoles) ? application.assignedRoles : []
  );

  return {
    TaskInstanceId: String(task.TaskInstanceId ?? ''),
    label: task.name ?? '',
    status: task.status ?? '',
    required: task.required ?? false,
    assignee,
    taskType: task.taskType?.toLowerCase() ?? 'unknown',
    taskCategory: task.taskCategory?.toLowerCase() ?? 'unknown',
    color,
    disabled,
    isdelegate,
    capacity,
  };
};
