import React, { useMemo } from 'react'
import {
  Inbox,
  MessageSquarePlus,
  SendHorizontal,
  UserCog,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Applicant } from '@/types/application'
import { useUser } from '@/context/UserContext'
import { useFetchTaskRoles } from '@/features/tasks/hooks/useTaskQueries'
import { useTaskNotesDrawerState } from '@/features/tasks/notes/useTaskNotesDrawerState'
import {
  TaskNotesDrawer,
} from '@/components/ou-workflow/NCRCDashboard/TaskNotesDrawer'
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

const getTaskInstanceId = (task: Task): string =>
  String((task as any)?.TaskInstanceId ?? (task as any)?.taskInstanceId ?? '')

const toSafeCount = (value: unknown): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.trunc(parsed)
}

const getGUIDisplayResult = (resultData: unknown): string | null => {
  if (resultData === null || resultData === undefined) return null

  const formatInspectionFeeObject = (value: any): string | null => {
    if (!value || typeof value !== 'object') return null
    const inspectionNeeded = value?.inspectionNeeded
    const feeNeeded = value?.feeNeeded
    if (inspectionNeeded === undefined || feeNeeded === undefined) return null
    return `{inspectionNeeded:${String(inspectionNeeded)}, feeNeeded:${String(feeNeeded)}}`
  }

  const readValue = (data: any): string | null => {
    const value = data?.GUIDisplayResult
    if (value === null || value === undefined) return null
    if (typeof value === 'object') {
      const formatted = formatInspectionFeeObject(value)
      if (formatted) return formatted
    }
    const text = String(value).trim()
    return text ? text : null
  }

  if (typeof resultData === 'object') {
    return readValue(resultData)
  }

  if (typeof resultData === 'string') {
    const raw = resultData.trim()
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return readValue(parsed)
    } catch {
      const directObjectMatch = raw.match(/GUIDisplayResult"\s*:\s*(\{[^}]*\})/)
      if (directObjectMatch?.[1]) {
        return directObjectMatch[1].trim()
      }
      return null
    }
  }

  return null
}

export function ApplicationExpandedStage({
  expandedStage,
  setExpandedStage,
  applicant,
  handleTaskAction,
}: Props) {
  const { username, role, roles, delegated } = useUser()
  const { data: taskRolesAll = [] } = useFetchTaskRoles()
  const taskNotes = useTaskNotesDrawerState({
    applicationId: applicant.applicationId ?? null,
    onError: (message) => toast.error(message),
  })

  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
    }
    return role ? [role.toLowerCase()] : []
  }, [role, roles])

  return (
    <div>
      {expandedStage && applicant.stages[expandedStage]?.tasks?.length > 0 && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-lg font-bold capitalize text-gray-900">
              {expandedStage} Stage Tasks
            </h4>
            <div className="flex items-center space-x-2">
              <span className="rounded-full px-2 py-1 text-xs font-medium">
                {applicant.stages[expandedStage]?.progress || '0'}% Complete
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
            {applicant.stages[expandedStage].tasks.map((task, index) => {
              const action = mapTaskToAction({
                task,
                application: applicant,
                username,
                userRoles,
                delegated,
                taskRolesAll,
                disableForCompletedApplication: true,
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
                          {typeof roleObj === 'string' ? roleObj : roleObj.taskRole}
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

                    {task.status?.toLowerCase() === 'pending' && task.activeStartDate && (
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                          task.status || ''
                        )}`}
                      >
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

                    {(() => {
                      const guiDisplayResult = getGUIDisplayResult((task as any)?.ResultData)
                      if (!guiDisplayResult) return null

                      return (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          {guiDisplayResult}
                        </span>
                      )
                    })()}

                    <div className="ml-auto flex items-center gap-1">
                      {(() => {
                        const taskId = getTaskInstanceId(task)
                        const contextKey = taskId
                        const noteCounts = taskNotes.getCounts(contextKey)
                        const receivedCount =
                          noteCounts.private ||
                          toSafeCount(task.IsPrivateNotes ?? (task as any)?.isPrivateNotes)
                        const sentCount =
                          noteCounts.public ||
                          toSafeCount(task.IsGlobalNotes ?? (task as any)?.isGlobalNotes)
                        const isReceivedLoading = taskNotes.isLoading(contextKey, 'private')
                        const isSentLoading = taskNotes.isLoading(contextKey, 'public')

                        return (
                          <>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!taskId) {
                                  toast.error('Task instance id not found')
                                  return
                                }

                                await taskNotes.openDrawer({
                                  contextKey,
                                  taskId,
                                  taskName: task.name,
                                  tab: 'private',
                                })
                              }}
                              className="group relative rounded p-1 text-blue-600 hover:bg-blue-50"
                              aria-label="Private notes"
                              title={
                                isReceivedLoading
                                  ? 'Loading private notes...'
                                  : `Private notes (${receivedCount})`
                              }
                            >
                              <Inbox className="h-4 w-4" />
                              {isReceivedLoading && (
                                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-600" />
                              )}
                              {receivedCount > 0 && (
                                <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1 text-[10px] text-white">
                                  {receivedCount}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!taskId) {
                                  toast.error('Task instance id not found')
                                  return
                                }

                                await taskNotes.openDrawer({
                                  contextKey,
                                  taskId,
                                  taskName: task.name,
                                  tab: 'public',
                                })
                              }}
                              className="group relative rounded p-1 text-emerald-600 hover:bg-emerald-50"
                              aria-label="Public notes"
                              title={
                                isSentLoading
                                  ? 'Loading public notes...'
                                  : `Public notes (${sentCount})`
                              }
                            >
                              <SendHorizontal className="h-4 w-4" />
                              {isSentLoading && (
                                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-600" />
                              )}
                              {sentCount > 0 && (
                                <span className="absolute -right-1 -top-1 rounded-full bg-emerald-600 px-1 text-[10px] text-white">
                                  {sentCount}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!taskId) {
                                  toast.error('Task instance id not found')
                                  return
                                }

                                await taskNotes.openDrawer({
                                  contextKey,
                                  taskId,
                                  taskName: task.name,
                                  tab: 'public',
                                })
                              }}
                              className="rounded p-1 text-indigo-600 hover:bg-indigo-50"
                              aria-label="Create note"
                              title="Create note"
                            >
                              <MessageSquarePlus className="h-4 w-4" />
                            </button>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <TaskNotesDrawer
        open={Boolean(taskNotes.drawer)}
        applicantCompany={applicant.company}
        applicationId={applicant.applicationId ?? null}
        contextType="task"
        taskName={taskNotes.drawer?.taskName ?? ''}
        activeTab={taskNotes.drawer?.activeTab ?? 'public'}
        privateNotes={taskNotes.activeNotes.private}
        publicNotes={taskNotes.activeNotes.public}
        toMeNotes={taskNotes.activeNotes.toMe}
        loadingPrivate={taskNotes.activeLoading.private}
        loadingPublic={taskNotes.activeLoading.public}
        loadingToMe={taskNotes.activeLoading.toMe}
        composeText={taskNotes.composeText}
        composeToUserId={taskNotes.composeToUserId}
        composePrivate={taskNotes.composePrivate}
        isSubmitting={taskNotes.isSubmitting}
        error={taskNotes.error}
        onClose={taskNotes.closeDrawer}
        onTabChange={taskNotes.setActiveTab}
        onComposeTextChange={taskNotes.setComposeText}
        onComposeToUserChange={taskNotes.setComposeToUserId}
        onComposePrivateChange={taskNotes.setComposePrivate}
        onSubmit={taskNotes.submitNote}
        onReplySubmit={taskNotes.submitReply}
      />
    </div>
  )
}
