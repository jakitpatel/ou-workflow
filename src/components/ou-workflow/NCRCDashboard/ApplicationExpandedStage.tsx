import React, { useCallback, useMemo, useState } from 'react'
import {
  Inbox,
  MessageSquarePlus,
  SendHorizontal,
  UserCog,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Applicant, TaskNote } from '@/types/application'
import { useUser } from '@/context/UserContext'
import { fetchTaskNotes } from '@/features/tasks/api'
import { useFetchTaskRoles } from '@/features/tasks/hooks/useTaskQueries'
import { useCreateTaskNoteMutation } from '@/features/tasks/hooks/useTaskMutations'
import {
  TaskNotesDrawer,
  type NoteTab,
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

type DrawerState = {
  taskId: string
  taskName: string
  activeTab: NoteTab
}

const getTaskInstanceId = (task: Task): string =>
  String((task as any)?.TaskInstanceId ?? (task as any)?.taskInstanceId ?? '')

export function ApplicationExpandedStage({
  expandedStage,
  setExpandedStage,
  applicant,
  handleTaskAction,
}: Props) {
  const { username, role, roles, delegated, token } = useUser()
  const { data: taskRolesAll = [] } = useFetchTaskRoles()
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [notesByTask, setNotesByTask] = useState<
    Record<string, { private: TaskNote[]; public: TaskNote[] }>
  >({})
  const [composeText, setComposeText] = useState('')
  const [composePrivate, setComposePrivate] = useState(false)
  const [createNoteError, setCreateNoteError] = useState('')
  const [noteCountsByTask, setNoteCountsByTask] = useState<
    Record<string, { received: number; sent: number }>
  >({})
  const [notesLoadingByKey, setNotesLoadingByKey] = useState<Record<string, boolean>>({})

  const createTaskNoteMutation = useCreateTaskNoteMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => setCreateNoteError(message),
  })

  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
    }
    return role ? [role.toLowerCase()] : []
  }, [role, roles])

  const fetchNotesByVisibility = useCallback(
    async (taskId: string, tab: NoteTab) => {
      const key = `${taskId}:${tab}`
      setNotesLoadingByKey(prev => ({ ...prev, [key]: true }))

      try {
        const notes = await fetchTaskNotes({
          taskId,
          applicationId: applicant.applicationId ?? null,
          isPrivate: tab === 'private',
          token: token ?? undefined,
        })

        setNotesByTask(prev => ({
          ...prev,
          [taskId]: {
            private: tab === 'private' ? (notes as TaskNote[]) : prev[taskId]?.private ?? [],
            public: tab === 'public' ? (notes as TaskNote[]) : prev[taskId]?.public ?? [],
          },
        }))

        setNoteCountsByTask(prev => ({
          ...prev,
          [taskId]: {
            received: tab === 'private' ? notes.length : prev[taskId]?.received ?? 0,
            sent: tab === 'public' ? notes.length : prev[taskId]?.sent ?? 0,
          },
        }))
      } catch (err: any) {
        const message =
          err?.details?.status ||
          err?.details?.message ||
          err?.message ||
          'Failed to fetch notes'
        toast.error(message)
      } finally {
        setNotesLoadingByKey(prev => ({ ...prev, [key]: false }))
      }
    },
    [applicant.applicationId, token],
  )

  const openNotesDrawer = useCallback(
    async (e: React.MouseEvent, task: Task, tab: NoteTab) => {
      e.stopPropagation()
      const taskId = getTaskInstanceId(task)
      if (!taskId) {
        toast.error('Task instance id not found')
        return
      }

      setDrawer({
        taskId,
        taskName: task.name,
        activeTab: tab,
      })

      setCreateNoteError('')
      setComposePrivate(tab === 'private')

      await Promise.allSettled([
        fetchNotesByVisibility(taskId, 'private'),
        fetchNotesByVisibility(taskId, 'public'),
      ])
    },
    [fetchNotesByVisibility],
  )

  const handleCreateNoteSubmit = useCallback(async () => {
    if (!drawer) return

    const trimmedText = composeText.trim()
    if (!trimmedText) {
      setCreateNoteError('Note text is required')
      return
    }

    await createTaskNoteMutation.mutateAsync({
      taskId: drawer.taskId,
      applicationId: applicant.applicationId ?? null,
      note: trimmedText,
      isPrivate: composePrivate,
      priority: 'NORMAL',
      fromUser: username ?? undefined,
      token: token ?? undefined,
    })

    setCreateNoteError('')
    setComposeText('')

    const postedTab: NoteTab = composePrivate ? 'private' : 'public'
    await fetchNotesByVisibility(drawer.taskId, postedTab)

    setDrawer(prev =>
      prev
        ? {
            ...prev,
            activeTab: postedTab,
          }
        : prev,
    )
  }, [
    applicant.applicationId,
    composePrivate,
    composeText,
    createTaskNoteMutation,
    drawer,
    fetchNotesByVisibility,
    token,
    username,
  ])

  const handleReplySubmit = useCallback(
    async ({ parentMessageId, text }: { parentMessageId: string; text: string }) => {
      if (!drawer) return

      const trimmedText = text.trim()
      if (!trimmedText) {
        setCreateNoteError('Reply text is required')
        return
      }

      await createTaskNoteMutation.mutateAsync({
        taskId: drawer.taskId,
        applicationId: applicant.applicationId ?? null,
        note: trimmedText,
        isPrivate: false,
        fromUser: username ?? undefined,
        parentMessageId,
        token: token ?? undefined,
      })

      setCreateNoteError('')
      await fetchNotesByVisibility(drawer.taskId, 'public')
    },
    [
      applicant.applicationId,
      createTaskNoteMutation,
      drawer,
      fetchNotesByVisibility,
      token,
      username,
    ],
  )

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

                    <div className="ml-auto flex items-center gap-1">
                      {(() => {
                        const taskId = getTaskInstanceId(task)
                        const receivedCount = noteCountsByTask[taskId]?.received ?? 0
                        const sentCount = noteCountsByTask[taskId]?.sent ?? 0
                        const isReceivedLoading = Boolean(notesLoadingByKey[`${taskId}:private`])
                        const isSentLoading = Boolean(notesLoadingByKey[`${taskId}:public`])

                        return (
                          <>
                            <button
                              type="button"
                              onClick={(e) => openNotesDrawer(e, task, 'private')}
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
                              onClick={(e) => openNotesDrawer(e, task, 'public')}
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
                              onClick={(e) => openNotesDrawer(e, task, 'public')}
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
        open={Boolean(drawer)}
        applicantCompany={applicant.company}
        applicationId={applicant.applicationId ?? null}
        taskName={drawer?.taskName ?? ''}
        activeTab={drawer?.activeTab ?? 'public'}
        privateNotes={drawer ? notesByTask[drawer.taskId]?.private ?? [] : []}
        publicNotes={drawer ? notesByTask[drawer.taskId]?.public ?? [] : []}
        loadingPrivate={drawer ? Boolean(notesLoadingByKey[`${drawer.taskId}:private`]) : false}
        loadingPublic={drawer ? Boolean(notesLoadingByKey[`${drawer.taskId}:public`]) : false}
        composeText={composeText}
        composePrivate={composePrivate}
        isSubmitting={createTaskNoteMutation.isPending}
        error={createNoteError}
        onClose={() => {
          if (createTaskNoteMutation.isPending) return
          setDrawer(null)
          setCreateNoteError('')
          setComposeText('')
        }}
        onTabChange={(tab) => {
          setDrawer(prev => (prev ? { ...prev, activeTab: tab } : prev))
          setComposePrivate(tab === 'private')
        }}
        onComposeTextChange={(text) => {
          setComposeText(text)
          if (createNoteError) {
            setCreateNoteError('')
          }
        }}
        onComposePrivateChange={setComposePrivate}
        onSubmit={handleCreateNoteSubmit}
        onReplySubmit={handleReplySubmit}
      />
    </div>
  )
}
