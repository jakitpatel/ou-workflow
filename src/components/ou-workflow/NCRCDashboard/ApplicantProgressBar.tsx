import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { Task, Applicant } from '@/types/application';
import { useUser } from '@/context/UserContext';

type Props = {
  applicant: Applicant
  handleTaskAction?: (
    e: React.MouseEvent,
    application: Applicant,
    action: Task
  ) => void
}

export function ApplicantProgressBar({
  applicant,
  handleTaskAction
}: Props) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const { username, role, roles } = useUser() // 👈 use context

  const handleStageClick = (stageName: string) => {
      setExpandedStage(expandedStage === stageName ? null : stageName);
  };

  const stageOrder = [
    { key: 'initial', name: 'Initial' },
    { key: 'nda', name: 'NDA' },
    { key: 'inspection', name: 'Inspection' },
    { key: 'ingredients', name: 'Ingredients' },
    { key: 'products', name: 'Products' },
    { key: 'contract', name: 'Contract' },
    { key: 'certification', name: 'Certification' }
  ]
  // Define colors for task statuses
  const statusColors: Record<string, string> = {
    new: '#6366f1',        // indigo-500
    completed: '#10b981',  // green-500
    in_progress: '#3b82f6',// blue-500
    overdue: '#ef4444',    // red-500
    blocked: '#9ca3af'     // gray-400
  }

  const getStageColor = (status: string) => {
    // normalize: lowercase + trim + replace spaces with underscores
    const normalized = status?.toLowerCase().trim().replace(/\s+/g, '_')
    return statusColors[normalized] ?? '#d1d5db' // default gray-300
  }

  function getAssignedUser(taskRoles, assignedRoles) {
    if (!taskRoles?.length || !Array.isArray(assignedRoles)) return null;

    // Build a fast case-insensitive lookup map
    const roleMap = assignedRoles.reduce((map, item) => {
      const key = Object.keys(item)[0];
      if (key) map[key.toLowerCase()] = item[key];
      return map;
    }, {});

    // Return first matching role/user
    for (const role of taskRoles) {
      const user = roleMap[role.toLowerCase()];
      if (user) return user;
    }

    return null;
  }

  const mapTaskToAction = (taskItem: Task, application: Applicant) => {
    // Default styling
    let color = 'bg-gray-300 cursor-not-allowed';
    let icon = null;
    let disabled = true;

    const status = taskItem.status?.toLowerCase() ?? 'unknown';
    const taskRoles = Array.isArray(taskItem.taskRoles)
      ? taskItem.taskRoles.map((r: { taskRole?: string }) => r.taskRole?.toLowerCase()).filter(Boolean)
      : taskItem.taskRole
        ? [taskItem.taskRole.toLowerCase()]
        : [];

    const userRoles =
    role?.toUpperCase() === 'ALL'
      ? (roles ?? []).map(r => r.value?.toLowerCase()).filter(Boolean)
      : role
      ? [role.toLowerCase()]
      : [];

    const taskType = taskItem.taskType?.toLowerCase() ?? 'unknown';
    const taskCategory = taskItem.taskCategory?.toLowerCase() ?? 'unknown';

    // ✅ Case 1: Completed
    if (['complete', 'done', 'completed'].includes(status)) {
      color = 'bg-green-400';
      disabled = true;
    }

    // ✅ Case 2: Role-based permission check
    else if (taskRoles.length > 0) {
      //console.log('roles from context:', userRoles);
      //console.log('taskRoles:', taskRoles);

      // Find intersection between taskRoles and userRoles
      const matchingRoles = userRoles.filter(r => taskRoles.includes(r));

      if (matchingRoles.length === 0) {
        // User has none of the required roles
        color = 'bg-gray-300 cursor-not-allowed';
        disabled = true;
      } else {
        // User has at least one matching role → check assignment
        const assignedRoles = Array.isArray(application?.assignedRoles)
          ? application.assignedRoles
          : [];

        // Check if user is assigned under any matching role
        const isAssigned = assignedRoles.some(ar =>
          matchingRoles.some(role =>
            ar[role.toUpperCase()]?.toLowerCase() === (username ? username.toLowerCase() : '')
          )
        );

        if (isAssigned && (status === 'pending' || status === 'in_progress')) {
          color = 'bg-blue-600 hover:bg-blue-700';
          disabled = false;
        }
      }
    }
    const assignedRolesList = Array.isArray(application?.assignedRoles)
          ? application.assignedRoles
          : [];
    const assignee = getAssignedUser(taskRoles, assignedRolesList);

    return {
      TaskInstanceId: String(taskItem.TaskInstanceId ?? ''),
      label: taskItem.name ?? '',
      status: taskItem.status ?? '',
      required: taskItem.required ?? false,
      assignee: assignee ?? null,
      taskType,
      taskCategory,
      color,
      icon,
      disabled,
    };
  };

  return (
    <div className="mt-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex space-x-1">
          {stageOrder.map((stage) => (
            <button
              key={stage.key}
              onClick={() => handleStageClick(stage.key)}
              className={`flex-1 h-6 rounded cursor-pointer hover:opacity-80 transition-all ${
                expandedStage === stage.key
                  ? 'ring-2 ring-blue-400 ring-offset-1'
                  : ''
              }`}
              style={{
                backgroundColor: getStageColor(applicant.stages[stage.key]?.status)
              }}
              title={`Click to see ${stage.name} tasks`}
            >
              <span className="text-white text-xs leading-6">{stage.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Stage Details */}
      {expandedStage &&
        applicant.stages[expandedStage]?.tasks?.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 capitalize text-lg">
                {expandedStage} Stage Tasks
              </h4>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium`}>
                  {applicant.stages[expandedStage]?.progress || '0%'} Complete
                </span>
              </div>
              <button
                onClick={() => setExpandedStage(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem'
              }}
            >
              {applicant.stages[expandedStage].tasks.map((task, index) => {
                const action = mapTaskToAction(task, applicant);
                console.log(action);
                return (
                <div
                  key={index}
                  className={`bg-white rounded border-l-4 p-3 shadow-sm ${
                    task.status === 'completed'
                      ? 'border-l-green-500'
                      : task.status === 'in_progress'
                      ? 'border-l-blue-500'
                      : task.status === 'overdue'
                      ? 'border-l-red-500'
                      : task.status === 'blocked'
                      ? 'border-l-gray-400'
                      : 'border-l-yellow-500'
                  }`}
                >
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
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
                        {roleObj.taskRole}
                      </span>
                    ))}
                    {action.assignee && (
                      <span
                        className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded"  >
                        {action.assignee}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    {/*task.required && (
                      <span className="text-xs text-red-600 bg-red-50 px-1 py-0.5 rounded mt-1 inline-block">
                        Required
                      </span>
                    )*/}
                    <span className="text-xs text-red-600 bg-red-50 px-1 py-0.5 rounded mt-1 inline-block">
                        Required : {task.required ? 'Yes' : 'No'}
                    </span>
                    {(task?.daysOverdue ?? 0) > 0 && (
                      <span className="text-xs font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        {task.daysOverdue ?? 0} overdue
                      </span>
                    )}
                  </div>
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        task.status?.toLowerCase() === 'complete' ||
                        task.status?.toLowerCase() === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status?.toLowerCase() === 'pending'
                          ? 'bg-blue-100 text-blue-800'
                          : task.status?.toLowerCase() === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : task.status?.toLowerCase() === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : task.status?.toLowerCase() === 'new'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {(() => {
                        const status = (task.status || '').toLowerCase()
                        return status
                      })()}
                    </span>

                    {task.status?.toLowerCase() === 'completed' && (
                      <>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
                        {task.CompletedDate?.split('.')[0]}
                      </span>
                      {task.executedBy && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
                        {task.executedBy}
                      </span>
                      )}
                      </>
                    )}
                    
                    {task.status?.toLowerCase() === 'pending' && Number(task.daysPending) > 0 && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                        {task.daysPending} days pending
                      </span>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}
    </div>
  )
}