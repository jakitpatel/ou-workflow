import React, { useMemo } from 'react'
import { UserCog, X } from 'lucide-react'
import type { Task, Applicant } from '@/types/application'
import { useUser } from '@/context/UserContext'
import { useFetchTaskRoles } from '@/components/ou-workflow/hooks/useTaskDashboardHooks'
import {
  getStatusBadgeClass,
  getStatusLabel,
  getTaskBorderClass,
  mapTaskToAction,
} from '@/lib/utils/taskHelpers'

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

export function PrelimAppExpandedStageTasks({
  expandedStage,
  setExpandedStage,
  applicant,
  handleTaskAction,
}: Props) {
  const { username, role, roles, delegated } = useUser()
  const { data: taskRolesAll = [] } = useFetchTaskRoles()

  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
    }
    return role ? [role.toLowerCase()] : []
  }, [role, roles])

  const normalizedExpandedStage =
    expandedStage?.toLowerCase() === 'global' ? null : expandedStage

  return (
    <div>
      {normalizedExpandedStage &&
        applicant?.stages?.[normalizedExpandedStage]?.tasks?.length > 0 && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-bold capitalize text-gray-900">
                {normalizedExpandedStage} Stage Tasks
              </h4>
              <div className="flex items-center space-x-2">
                <span className="rounded-full px-2 py-1 text-xs font-medium">
                  {applicant.stages[normalizedExpandedStage]?.progress || '0'}%
                  Complete
                </span>
                <button
                  onClick={() => setExpandedStage(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Close task details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {applicant.stages[normalizedExpandedStage].tasks.map((task, index) => {
                const action = mapTaskToAction({
                  task,
                  application: applicant,
                  username,
                  userRoles,
                  delegated,
                  taskRolesAll,
                })

                task.capacity = action.capacity

                return (
                  <div
                    key={task.TaskInstanceId || index}
                    className={`rounded border-l-4 bg-white p-3 shadow-sm ${getTaskBorderClass(
                      task.status || ''
                    )}`}
                  >
                    <div className="mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {action.disabled ? (
                          <span
                            className="text-sm font-semibold leading-tight text-gray-900"
                            title={task.description || 'No description available'}
                          >
                            {task.name}
                          </span>
                        ) : (
                          <button
                            onClick={e => handleTaskAction?.(e, applicant, task)}
                            title={task.description || 'No description available'}
                            className="rounded bg-blue-600 px-2 py-1 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {task.name}
                          </button>
                        )}

                        {task.taskRoles?.map((roleObj, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
                          >
                            {typeof roleObj === 'string'
                              ? roleObj
                              : roleObj.taskRole}
                          </span>
                        ))}

                        {action.assignee && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                            {action.assignee}
                          </span>
                        )}

                        {action.isdelegate && (
                          <span className="group relative ml-1 inline-flex items-center text-blue-600">
                            <UserCog size={14} />
                            <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white shadow group-hover:block">
                              As Assistant
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between">
                        {(task?.daysOverdue ?? 0) > 0 && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                            {task.daysOverdue} days overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                          task.status || ''
                        )}`}
                      >
                        {getStatusLabel(task.status)}
                      </span>

                      {task.status?.toLowerCase() === 'pending' &&
                        task.activeStartDate && (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            {task.activeStartDate.split('.')[0]}
                          </span>
                        )}

                      {task.status?.toLowerCase() === 'completed' && (
                        <>
                          {task.CompletedDate && (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              {task.CompletedDate.split('.')[0]}
                            </span>
                          )}
                          {task.executedBy && (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                              {task.executedBy}
                            </span>
                          )}
                        </>
                      )}

                      {task.status?.toLowerCase() === 'pending' &&
                        Number(task.daysPending) > 0 && (
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
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
