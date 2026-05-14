import { useState } from 'react'
import type React from 'react'
import { CalendarDays, Check, ExternalLink, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { useConfirmTaskMutation } from '@/features/tasks/hooks/useTaskMutations'
import type { Applicant, Task } from '@/types/application'

type Props = {
  open: boolean
  applicant?: Applicant
  task?: Task
  onClose: () => void
}

const todayYmd = () => new Date().toISOString().slice(0, 10)

const addDaysToYmd = (ymd: string, days: number) => {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const formatDate = (ymd?: string) => {
  if (!ymd) return '-'
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const getAccountNumber = (applicant?: Applicant) =>
  String(applicant?.externalReferenceId ?? applicant?.applicationId ?? '').trim()

const parseAssignmentResult = (result: unknown): { rfr: string; dateRange: string } => {
  const text = String(result ?? '').trim()
  if (!text) return { rfr: '', dateRange: '' }

  const rfrMatch = text.match(/RFR\s*:\s*"?([^",}]+)"?/i)
  const dateRangeMatch = text.match(/Daterange\s*:\s*"?([^"}]+)"?/i)

  return {
    rfr: String(rfrMatch?.[1] ?? '').trim(),
    dateRange: String(dateRangeMatch?.[1] ?? '').trim(),
  }
}

function InfoRow({
  label,
  value,
  strong,
}: {
  label: string
  value: React.ReactNode
  strong?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`text-right text-sm ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-600">{title}</div>
      {children}
    </section>
  )
}

export function InspectionVisitDateDrawer({ open, applicant, task, onClose }: Props) {
  const { token, username } = useUser()
  const confirmTaskMutation = useConfirmTaskMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => toast.error(message),
  })

  const assignmentStartDate = todayYmd()
  const assignmentEndDate = addDaysToYmd(assignmentStartDate, 90)
  const [plannedVisitDate, setPlannedVisitDate] = useState(addDaysToYmd(assignmentStartDate, 14))
  const [rfrNote, setRfrNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (!open) return null

  const accountNumber = getAccountNumber(applicant)
  const reportDueDate = addDaysToYmd(plannedVisitDate, 7)
  const assignmentResult = parseAssignmentResult(
    (task as any)?.StatusDetails ?? (task as any)?.statusDetails ?? (task as any)?.Result ?? (task as any)?.result,
  )
  const rfrName =
    assignmentResult.rfr ||
    String((task as any)?.assignee ?? (task as any)?.assignedTo ?? 'Assigned RFR')
  const assignmentDateRange =
    assignmentResult.dateRange ||
    `${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`

  const confirmVisitDate = async () => {
    if (!task) {
      toast.error('Task not found')
      return
    }
    if (!plannedVisitDate) {
      toast.error('Choose a visit date first')
      return
    }

    const taskId = String((task as any)?.TaskInstanceId ?? (task as any)?.taskInstanceId ?? '')
    if (!taskId) {
      toast.error('Task instance id not found')
      return
    }

    await confirmTaskMutation.mutateAsync({
      taskId,
      token: token ?? undefined,
      username: username ?? undefined,
      result: 'completed',
      resultData: JSON.stringify({
        GUIDisplayResult: `Visit ${plannedVisitDate}`,
        plannedVisitDate,
        reportDueDate,
        rfrNote: rfrNote.trim(),
      }),
      completionNotes: rfrNote.trim() || `Visit scheduled for ${formatDate(plannedVisitDate)}`,
      capacity: (task as any)?.capacity ?? undefined,
    })

    setConfirmed(true)
    toast.success(`Visit scheduled ${formatDate(plannedVisitDate)}`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-[98vw] flex-col overflow-hidden bg-white shadow-2xl xl:max-w-[82vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b bg-blue-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-sky-200" />
                <h3 className="text-lg font-semibold">Visit Date</h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-blue-100">
                <span className="rounded-full bg-white/10 px-2.5 py-1">{applicant?.company || 'Application'}</span>
                {accountNumber ? <span className="rounded-full bg-white/10 px-2.5 py-1">App #{accountNumber}</span> : null}
                {applicant?.plant ? <span className="rounded-full bg-white/10 px-2.5 py-1">Plant: {applicant.plant}</span> : null}
                {task?.name ? <span className="rounded-full bg-white/10 px-2.5 py-1">{task.name}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-blue-100 hover:bg-white/10 hover:text-white"
              aria-label="Close visit date drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
          <div className="min-h-0 space-y-4 overflow-y-auto bg-gray-50 p-5">
            <Section title="1. Assignment Summary">
              <div className="rounded border border-blue-200 bg-blue-50 p-4">
                <div className="text-base font-semibold text-blue-950">{rfrName}</div>
                <div className="mt-1 text-sm text-blue-800">
                  {applicant?.plant || 'Plant'} - {applicant?.company || 'Application'}
                </div>
              </div>
              <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
                <InfoRow label="Date range" value={assignmentDateRange} />
                <InfoRow label="NCRC note" value="Contact the plant before visiting to confirm production schedule and access requirements." />
              </div>
            </Section>

            <Section title="2. Pick Visit Date">
              {confirmed ? (
                <div className="rounded border border-green-200 bg-green-50 p-3">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
                    <Check className="h-4 w-4" />
                    Visit scheduled
                  </div>
                  <InfoRow label="Planned visit" value={formatDate(plannedVisitDate)} strong />
                  <InfoRow label="Report due by" value={formatDate(reportDueDate)} />
                  {rfrNote.trim() ? <InfoRow label="RFR note" value={rfrNote.trim()} /> : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase text-gray-500">Planned visit date</span>
                    <input
                      type="date"
                      min={assignmentStartDate}
                      max={assignmentEndDate}
                      value={plannedVisitDate}
                      onChange={(event) => setPlannedVisitDate(event.target.value)}
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                    />
                    <span className="mt-1 block text-xs text-gray-500">
                      Must fall within the assignment range above.
                    </span>
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase text-gray-500">Note for NCRC</span>
                    <textarea
                      value={rfrNote}
                      onChange={(event) => setRfrNote(event.target.value)}
                      rows={4}
                      placeholder="Scheduling constraints, contact notes, or questions for the NCRC..."
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={confirmVisitDate}
                    disabled={confirmTaskMutation.isPending}
                    className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {confirmTaskMutation.isPending ? 'Confirming...' : 'Confirm Visit Date'}
                  </button>
                </div>
              )}
            </Section>
          </div>

          <div className="min-h-0 overflow-y-auto bg-slate-100 p-5">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-base font-bold text-blue-950">
                    {applicant?.company || 'Application'} - {applicant?.plant || 'Plant'}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">Plant info - read-only reference</div>
                </div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <InfoRow label="Account #" value={accountNumber || '-'} />
                <InfoRow label="Region" value={applicant?.region || '-'} />
                <InfoRow label="Scope" value="Review plant details and Schedule A before visit" />
                <InfoRow label="Plant status" value="New application - first inspection" />
              </div>
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                <strong>Heads up:</strong> Review ingredients and pending LOC items before the visit.
              </div>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4" />
                View application details
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t bg-white px-5 py-3">
          <div className="min-w-0 text-sm text-gray-600">
            {confirmed
              ? `Visit scheduled for ${formatDate(plannedVisitDate)}. Report due ${formatDate(reportDueDate)}.`
              : 'Pick a date within the assignment range and confirm to schedule the visit.'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
