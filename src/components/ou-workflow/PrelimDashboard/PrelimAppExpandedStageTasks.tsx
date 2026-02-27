import React, { useMemo } from 'react'
import { UserCog, X } from 'lucide-react'
import type { Task, Applicant } from '@/types/application'
import { useUser } from '@/context/UserContext'
import { useFetchTaskRoles } from '@/components/ou-workflow/hooks/useTaskDashboardHooks';
import { getStatusLabel } from '@/lib/utils/taskHelpers';

type Props = {
  expandedStage: string | null
  setExpandedStage: (stage: string | null) => void    
  applicant: Applicant
  handleTaskAction?: (
    e: React.MouseEvent,
    application: Applicant,
    action: Task
  ) => void
}

const COMPLETED_STATUSES = ['complete', 'done', 'completed']

// 🔹 Utility functions extracted for clarity
function normalizeStatus(status?: string): string {
  return status?.toLowerCase().trim().replace(/\s+/g, '_') ?? 'unknown'
}

function getAssignedUser(
  taskRoles: string[] | undefined,
  assignedRoles: Array<Record<string, any>> | undefined
): string | null {
  if (!taskRoles?.length || !Array.isArray(assignedRoles)) return null
  //console.log('Assigned Roles:', assignedRoles);
  //console.log('Task Roles:', taskRoles);
 for (const taskRole of taskRoles) {
    if (!taskRole) continue

    const normalizedTaskRole = taskRole.toLowerCase()

    for (const item of assignedRoles) {
      if (item.isPrimary !== true) continue

      const roleKey = Object.keys(item).find(k => k !== "isPrimary")
      if (!roleKey) continue

      if (roleKey.toLowerCase() === normalizedTaskRole) {
        return item[roleKey]
      }
    }
  }

  return null
}

function normalizeTaskRoles(taskRoles: any): string[] {
  if (Array.isArray(taskRoles)) {
    return taskRoles
      .map((r: any) => (typeof r === 'string' ? r : r?.taskRole))
      .filter(Boolean)
      .map((s: string) => s.toLowerCase())
  }
  if (typeof taskRoles === 'string') {
    return [taskRoles.toLowerCase()]
  }
  return []
}

function getStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase()
  
  if (COMPLETED_STATUSES.includes(normalized)) {
    return 'bg-green-100 text-green-800'
  }
  
  const statusMap: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800',
    new: 'bg-yellow-100 text-yellow-800'
  }
  
  return statusMap[normalized] ?? 'bg-gray-100 text-gray-800'
}

function getTaskBorderClass(status: string): string {
  const normalized = status.toLowerCase()
  
  const borderMap: Record<string, string> = {
    completed: 'border-l-green-500',
    in_progress: 'border-l-blue-500',
    overdue: 'border-l-red-500',
    blocked: 'border-l-gray-400'
  }
  
  return borderMap[normalized] ?? 'border-l-yellow-500'
}

export function PrelimAppExpandedStageTasks({ expandedStage, setExpandedStage, applicant, handleTaskAction }: Props) {
  const { username, role, roles, delegated } = useUser()
  // 🔹 Fetch TaskRoles
  const {
    data: taskRolesAll = [],
  } = useFetchTaskRoles();

  // 🔹 Memoize user roles to avoid recalculation
  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
    }
    return role ? [role.toLowerCase()] : []
  }, [role, roles])

  // 🔹 Extracted and simplified task action mapping
  const mapTaskToAction = (taskItem: Task, application: Applicant) => {
    const status = normalizeStatus(taskItem.status)
    const taskRoles = normalizeTaskRoles(taskItem.taskRoles)
    
    // Default state
    let color = 'bg-gray-300 cursor-not-allowed'
    let disabled = true
    let isdelegate = false;
    let capacity = "MEMBER";
    // Case 1: Completed tasks
    if (COMPLETED_STATUSES.includes(status)) {
      color = 'bg-green-400'
      disabled = true
    }
    // Case 2: Role-based permission check
    else if (taskRoles.length > 0) {
      const matchingRoles = userRoles.filter(r => taskRoles.includes(r))

      if (matchingRoles.length > 0) {
        const assignedRoles = Array.isArray(application?.assignedRoles)
          ? application.assignedRoles
          : []

        const isAssigned = assignedRoles.some(ar =>
          matchingRoles.some(role =>
            ar[role.toUpperCase()]?.toLowerCase() === username?.toLowerCase()
          )
        )

        if (isAssigned && (status === 'pending' || status === 'in_progress')) {
          color = 'bg-blue-600 hover:bg-blue-700'
          disabled = false;
          capacity = "MEMBER";
        }
        // Case 3: Special delegated user that act/assign on behalf of others
        //console.log('Delegated User Roles:', delegated);
        const delegatedNames = delegated?.map(d => d.name.toLowerCase()) ?? [];

        const isAssignedToDelegated = assignedRoles.some(ar =>
          matchingRoles.some(role => {
            const assignedName = ar[role.toUpperCase()]?.toLowerCase();
            return assignedName && delegatedNames.includes(assignedName);
          })
        );

        if (isAssignedToDelegated && (status === 'pending' || status === 'in_progress')) {
          color = 'bg-blue-600 hover:bg-blue-700'
          disabled = false
          isdelegate = true;
          capacity = "ASSISTANT";
        }

        // Case 4: Special roles that cannot act/assign
        //console.log('Group Task Roles All:', taskRolesAll);
        const hasIncludedRole = taskRolesAll.some(role => taskRoles.includes(role));

        if ((status === 'pending' || status === 'in_progress') && 
            taskRoles.length > 0 && 
            hasIncludedRole) {
          color = 'bg-blue-600 hover:bg-blue-700';
          disabled = false;
          capacity = "DESIGNATED";
        }
      }
    }

    const assignedRolesList = Array.isArray(application?.assignedRoles)
      ? application.assignedRoles
      : []
    const assignee = getAssignedUser(taskRoles, assignedRolesList)

    return {
      TaskInstanceId: String(taskItem.TaskInstanceId ?? ''),
      label: taskItem.name ?? '',
      status: taskItem.status ?? '',
      required: taskItem.required ?? false,
      assignee: assignee ?? null,
      taskType: taskItem.taskType?.toLowerCase() ?? 'unknown',
      taskCategory: taskItem.taskCategory?.toLowerCase() ?? 'unknown',
      color,
      disabled,
      isdelegate,
      capacity
    }
  }

  return (
    <div>
      {/* Expanded Stage Details */}
      {expandedStage &&
        applicant?.stages?.[expandedStage]?.tasks?.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-900 capitalize text-lg">
              {expandedStage} Stage Tasks
            </h4>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium">
                {applicant.stages[expandedStage]?.progress || '0'}% Complete
              </span>
              <button
                onClick={() => setExpandedStage(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close task details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {applicant.stages[expandedStage].tasks.map((task, index) => {
              const action = mapTaskToAction(task, applicant)
              task.capacity = action.capacity; // Assign capacity for debugging
              return (
                <div
                  key={task.TaskInstanceId || index}
                  className={`bg-white rounded border-l-4 p-3 shadow-sm ${getTaskBorderClass(
                    task.status || ''
                  )}`}
                >
                  {/* Task Header */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Task name OR button */}
                      {action.disabled ? (
                        <span
                          className="text-sm font-semibold text-gray-900 leading-tight"
                          title={task.description || 'No description available'}
                        >
                          {task.name}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleTaskAction?.(e, applicant, task)}
                          title={task.description || 'No description available'}
                          className="text-sm font-semibold text-white bg-blue-600 px-2 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {task.name}
                        </button>
                      )}

                      {/* Roles inline */}
                      {task.taskRoles?.map((roleObj, idx) => (
                        <span
                          key={idx}
                          className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded"
                        >
                          {typeof roleObj === 'string' ? roleObj : roleObj.taskRole}
                        </span>
                      ))}

                      {/* Assignee */}
                      {action.assignee && (
                        <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {action.assignee}
                        </span>
                      )}
                      {/* isdelegate */}
                      {action.isdelegate && (
                        <span className="relative group inline-flex items-center ml-1 text-blue-600">
                          <UserCog size={14} />

                          <span className="
                            absolute -top-7 left-1/2 -translate-x-1/2
                            hidden group-hover:block
                            whitespace-nowrap
                            bg-gray-800 text-white text-xs
                            px-2 py-1 rounded shadow
                          ">
                            As Assistant
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Required & Overdue Info */}
                    <div className="flex justify-between items-center mt-1">
                      {(task?.daysOverdue ?? 0) > 0 && (
                        <span className="text-xs font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                          {task.daysOverdue} days overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status & Timeline Info */}
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                        task.status || ''
                      )}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>

                    {/* Completed Info */}
                    {task.status?.toLowerCase() === 'completed' && (
                      <>
                        {task.CompletedDate && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
                            {task.CompletedDate.split('.')[0]}
                          </span>
                        )}
                        {task.executedBy && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
                            {task.executedBy}
                          </span>
                        )}
                      </>
                    )}

                    {/* Pending Info */}
                    {task.status?.toLowerCase() === 'pending' &&
                      Number(task.daysPending) > 0 && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                          {task.daysPending} days pending
                        </span>
                      )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}