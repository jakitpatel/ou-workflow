import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useUser } from '@/context/UserContext'
import {
  getExternalVisitScheduleType,
  getInspectionVisitId,
} from '@/features/applications/lib/externalVisitSchedule'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { scheduleVisit } from '@/features/tasks/api/scheduleVisit'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import type { Applicant, Task } from '@/types/application'

type Props = { task: Task; stage: string | null; applicant: Applicant; onClose: () => void }

export function ExternalVisitWaitDialog({ task, stage, applicant, onClose }: Props) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const dateId = useId()
  const sectionId = useId()
  const [showMore, setShowMore] = useState(false)
  const [date, setDate] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const visitType = getExternalVisitScheduleType(stage, task)
  const canSchedule =
    (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'staging') &&
    visitType !== null
  // Only use assignment data from the same Inspection stage as a fallback.
  const scheduleTask = stage
    ? applicant.stages[stage]?.tasks.find(
        (item) => getExternalVisitScheduleType(stage, item) === 'SCHEDULE',
      )
    : undefined
  const visitId =
    getInspectionVisitId(task) || (scheduleTask ? getInspectionVisitId(scheduleTask) : '')

  const submit = async () => {
    if (!canSchedule || !visitType || submitting.current) return
    if (!date || !visitId) {
      setError(
        !visitId
          ? 'Visit ID not found. Refresh the application and try again.'
          : 'Choose a visit date.',
      )
      return
    }
    submitting.current = true
    setPending(true)
    setError('')
    try {
      await scheduleVisit({ visitType, visitId, visitDate: date, token })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Failed to schedule visit. Please try again.',
      )
      submitting.current = false
      setPending(false)
      return
    }
    toast.success(visitType === 'ACTUAL' ? 'Actual visit date recorded' : 'Visit scheduled')
    // External events own task completion; refresh instead of completing the task locally.
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.detail(String(applicant.applicationId ?? applicant.id)),
      }),
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
    ]).catch(() => toast.error('Date saved, but refreshing failed. Refresh the dashboard.'))
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting.current) onClose()
      }}
    >
      <DialogContent>
        <DialogTitle className="text-lg font-semibold">Waiting for external event</DialogTitle>
        <DialogDescription className="text-sm text-gray-600">
          Waiting for external "{task.name}" event.
        </DialogDescription>
        {canSchedule && (
          <div className="space-y-3">
            <button
              type="button"
              aria-expanded={showMore}
              aria-controls={sectionId}
              disabled={pending}
              onClick={() => setShowMore((value) => !value)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              More
            </button>
            {showMore && (
              <div
                id={sectionId}
                className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3"
              >
                <p className="text-sm text-gray-600">Visit ID: {visitId || 'Not available'}</p>
                <label htmlFor={dateId} className="block text-sm font-medium text-gray-700">
                  {visitType === 'ACTUAL' ? 'Actual visit date' : 'Scheduled visit date'}
                </label>
                <input
                  id={dateId}
                  type="date"
                  required
                  value={date}
                  disabled={pending}
                  onChange={(event) => {
                    setDate(event.target.value)
                    setError('')
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                {!visitId && (
                  <p role="alert" className="text-sm text-red-700">
                    Visit ID not found. Refresh the application and try again.
                  </p>
                )}
                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void submit()
                  }}
                  disabled={pending || !date || !visitId}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {pending ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
