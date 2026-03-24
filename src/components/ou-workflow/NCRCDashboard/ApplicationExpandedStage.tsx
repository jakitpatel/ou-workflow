import React, { useCallback, useMemo, useState } from 'react'
import {
  Inbox,
  MessageSquarePlus,
  SendHorizontal,
  UserCog,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Applicant, TaskNote } from '@/types/application'
import { useUser } from '@/context/UserContext'
import { fetchTaskNotes } from '@/features/tasks/api'
import { useFetchTaskRoles } from '@/features/tasks/hooks/useTaskQueries'
import { useCreateTaskNoteMutation } from '@/features/tasks/hooks/useTaskMutations'
import {
  CreateTaskNoteModal,
  type CreateTaskNotePayload,
} from '@/components/ou-workflow/modal/CreateTaskNoteModal'
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
  mode: 'received' | 'sent'
  taskName: string
  notes: TaskNote[]
}

const normalizeNoteValue = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const getNoteText = (note: TaskNote): string => {
  const directCandidates = [
    note.note,
    note.text,
    note.details,
    (note as any)?.message,
    (note as any)?.content,
    (note as any)?.note1,
  ]

  for (const item of directCandidates) {
    const value = normalizeNoteValue(item)
    if (value) return value
  }

  const dynamicNoteKey = Object.keys(note).find((key) => /^note\d*$/i.test(key))
  if (dynamicNoteKey) {
    const value = normalizeNoteValue((note as any)[dynamicNoteKey])
    if (value) return value
  }

  return '-'
}

const getMetaValue = (note: TaskNote, ...keys: string[]): string => {
  for (const key of keys) {
    const value = normalizeNoteValue((note as any)?.[key])
    if (value) return value
  }
  return '-'
}

const getTaskInstanceId = (task: Task): string =>
  String((task as any)?.TaskInstanceId ?? (task as any)?.taskInstanceId ?? '')

function NotesDrawer({
  drawer,
  onClose,
}: {
  drawer: DrawerState | null
  onClose: () => void
}) {
  if (!drawer) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {drawer.mode === 'received' ? 'Private Notes' : 'Public Notes'}
            </h3>
            <p className="text-xs text-gray-600">Task: {drawer.taskName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close notes drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {drawer.notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-5 text-center">
            <p className="text-sm text-gray-500">No notes found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {drawer.notes.map((note, idx) => (
              <article key={idx} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-slate-600">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">
                      From: {getMetaValue(note, 'fromUser', 'from_user')}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">
                      To: {getMetaValue(note, 'toUser', 'to_user')}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {getMetaValue(note, 'createdDate', 'created_date')}
                  </span>
                </div>

                <p className="mt-1 text-sm leading-5 text-slate-900">{getNoteText(note)}</p>

              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ApplicationExpandedStage({
  expandedStage,
  setExpandedStage,
  applicant,
  handleTaskAction,
}: Props) {
  const { username, role, roles, delegated, token } = useUser()
  const { data: taskRolesAll = [] } = useFetchTaskRoles()
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [taskForCreateNote, setTaskForCreateNote] = useState<Task | null>(null)
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

  const handleCreateNoteSubmit = async (payload: CreateTaskNotePayload) => {
    if (!taskForCreateNote) return

    await createTaskNoteMutation.mutateAsync({
      taskId: String(taskForCreateNote.TaskInstanceId),
      applicationId: applicant.applicationId ?? null,
      note: payload.text,
      isPrivate: payload.isPrivate,
      priority: payload.priority,
      fromUser: username ?? undefined,
      token: token ?? undefined,
    })

    setCreateNoteError('')
    setTaskForCreateNote(null)
  }

  const handleOpenNotes = useCallback(
    async (e: React.MouseEvent, task: Task, mode: 'received' | 'sent') => {
      e.stopPropagation()

      const taskId = getTaskInstanceId(task)
      if (!taskId) {
        toast.error('Task instance id not found')
        return
      }

      const key = `${taskId}:${mode}`
      setNotesLoadingByKey(prev => ({ ...prev, [key]: true }))

      try {
        const notes = await fetchTaskNotes({
          taskId,
          applicationId: applicant.applicationId ?? null,
          isPrivate: mode === 'received',
          token: token ?? undefined,
        })

        setNoteCountsByTask(prev => ({
          ...prev,
          [taskId]: {
            received: mode === 'received' ? notes.length : prev[taskId]?.received ?? 0,
            sent: mode === 'sent' ? notes.length : prev[taskId]?.sent ?? 0,
          },
        }))

        setDrawer({
          mode,
          taskName: task.name,
          notes: notes as TaskNote[],
        })
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
                        const isReceivedLoading = Boolean(notesLoadingByKey[`${taskId}:received`])
                        const isSentLoading = Boolean(notesLoadingByKey[`${taskId}:sent`])

                        return (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleOpenNotes(e, task, 'received')}
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
                              onClick={(e) => handleOpenNotes(e, task, 'sent')}
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
                              onClick={(e) => {
                                e.stopPropagation()
                                setCreateNoteError('')
                                setTaskForCreateNote(task)
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
      <NotesDrawer drawer={drawer} onClose={() => setDrawer(null)} />
      <CreateTaskNoteModal
        open={Boolean(taskForCreateNote)}
        taskName={taskForCreateNote?.name ?? ''}
        isSubmitting={createTaskNoteMutation.isPending}
        error={createNoteError}
        onClose={() => {
          if (createTaskNoteMutation.isPending) return
          setTaskForCreateNote(null)
          setCreateNoteError('')
        }}
        onSubmit={handleCreateNoteSubmit}
      />
    </div>
  )
}
