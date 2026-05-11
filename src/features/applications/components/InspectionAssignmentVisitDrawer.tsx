import { useMemo, useState } from 'react'
import type React from 'react'
import {
  CalendarDays,
  Check,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Mail,
  MapPin,
  RotateCw,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { useAssignTaskMutation } from '@/features/tasks/hooks/useTaskMutations'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { detectRole } from '@/lib/utils/taskHelpers'
import type { Applicant, Task } from '@/types/application'

type Props = {
  open: boolean
  applicant?: Applicant
  task?: Task
  onClose: () => void
}

type AssignmentStage = 'select' | 'assigned' | 'date-set' | 'report-submitted'
type ViewMode = 'ncrc' | 'rfr'

type RfrOption = {
  id: string
  lookupKey: string
  assigneeValue: string
  name: string
  email: string
  region: string
  coverage: string
  state: string
  status: 'available' | 'inactive'
}

type ActivityItem = {
  id: string
  tone: 'system' | 'success' | 'info'
  text: string
  time: string
}

const todayYmd = () => new Date().toISOString().slice(0, 10)

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const mapLookupRfr = (item: any): RfrOption => {
  const name = normalizeText(item.rfr ?? item.fullName ?? item.name ?? item.userName ?? item.id)
  const userName = normalizeText(item.userName ?? item.id)
  const email = normalizeText(item.email)
  const lookupKey = normalizeText(item.lookupKey ?? item.id ?? userName ?? name)
  const assigneeValue = normalizeText(item.assigneeValue ?? userName ?? item.id ?? lookupKey)

  return {
    id: assigneeValue || lookupKey,
    lookupKey,
    assigneeValue,
    name,
    email,
    region: normalizeText(item.userRole),
    coverage: normalizeText(item.fullName && item.fullName !== name ? item.fullName : ''),
    state: normalizeText(item.state),
    status: item.isActive === false ? 'inactive' : 'available',
  }
}

const addDaysToYmd = (ymd: string, days: number) => {
  if (!ymd) return ''
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const formatDate = (ymd?: string, mode: 'short' | 'long' = 'short') => {
  if (!ymd) return '-'
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: mode === 'short' ? 'short' : 'long',
    day: 'numeric',
    year: mode === 'long' ? 'numeric' : undefined,
  })
}

const nowLabel = () =>
  new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const getAccountNumber = (applicant?: Applicant) =>
  String(applicant?.externalReferenceId ?? applicant?.applicationId ?? '').trim()

function StatusChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red'
}) {
  const classes = {
    neutral: 'border-gray-200 bg-white text-gray-600',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[tone]}`}>
      {children}
    </span>
  )
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

function ProgressStrip({ stage }: { stage: AssignmentStage }) {
  const steps = [
    { id: 'assign', label: 'Assign RFR' },
    { id: 'notify', label: 'Notify RFR' },
    { id: 'date', label: 'Visit Date' },
    { id: 'report', label: 'Report Submitted' },
  ]
  const statusByStage: Record<AssignmentStage, Record<string, 'complete' | 'current'>> = {
    select: { assign: 'current' },
    assigned: { assign: 'complete', notify: 'complete', date: 'current' },
    'date-set': { assign: 'complete', notify: 'complete', date: 'complete', report: 'current' },
    'report-submitted': {
      assign: 'complete',
      notify: 'complete',
      date: 'complete',
      report: 'complete',
    },
  }

  return (
    <div className="grid grid-cols-4 border-b bg-white">
      {steps.map((step, index) => {
        const stepStatus = statusByStage[stage][step.id]
        const isComplete = stepStatus === 'complete'
        const isCurrent = stepStatus === 'current'
        return (
          <div
            key={step.id}
            className={`flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold ${
              isComplete ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-400'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                isComplete
                  ? 'bg-green-600 text-white'
                  : isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {isComplete ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function InspectionAssignmentVisitDrawer({ open, applicant, task, onClose }: Props) {
  const { token, username } = useUser()
  const { data: rfrLookupList = [], isError, isLoading } = useUserListByRole('api/vSelectRFR', {
    enabled: open,
  })
  const assignTaskMutation = useAssignTaskMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => toast.error(message),
  })

  const rfrs = useMemo(() => rfrLookupList.map(mapLookupRfr), [rfrLookupList])
  const [view, setView] = useState<ViewMode>('ncrc')
  const [stage, setStage] = useState<AssignmentStage>('select')
  const [selectedRfrId, setSelectedRfrId] = useState('')
  const [rfrSearch, setRfrSearch] = useState('')
  const [assignmentId, setAssignmentId] = useState<string | null>(null)
  const [visitId, setVisitId] = useState<string | null>(null)
  const [assignmentCreatedAt, setAssignmentCreatedAt] = useState<string | null>(null)
  const [rfrOpenedAt, setRfrOpenedAt] = useState<string | null>(null)
  const [plannedVisitDate, setPlannedVisitDate] = useState(addDaysToYmd(todayYmd(), 14))
  const [rfrNote, setRfrNote] = useState('')
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  const accountNumber = getAccountNumber(applicant)
  const selectedRfr = useMemo(
    () => rfrs.find((rfr) => rfr.lookupKey === selectedRfrId || rfr.id === selectedRfrId) ?? null,
    [rfrs, selectedRfrId],
  )
  const filteredRfrs = useMemo(() => {
    const query = rfrSearch.trim().toLowerCase()
    if (!query) return rfrs
    return rfrs.filter((rfr) =>
      [rfr.name, rfr.email, rfr.region, rfr.coverage, rfr.state].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [rfrSearch, rfrs])

  if (!open) return null

  const assignmentStartDate = todayYmd()
  const assignmentEndDate = addDaysToYmd(assignmentStartDate, 90)
  const reportDueDate = addDaysToYmd(plannedVisitDate, 7)
  const isAssigned = stage !== 'select'
  const subject =
    stage === 'date-set' || stage === 'report-submitted'
      ? `Visit Confirmed - ${applicant?.plant || 'Plant'} [${accountNumber || 'Application'}] on ${formatDate(plannedVisitDate)}`
      : `OU Kosher - Inspection Assignment for ${applicant?.plant || 'Plant'} [${accountNumber || 'Application'}]`

  const addActivity = (tone: ActivityItem['tone'], text: string) => {
    setActivity((items) => [
      { id: `${Date.now()}-${items.length}`, tone, text, time: nowLabel() },
      ...items,
    ])
  }

  const createAssignment = async () => {
    if (!selectedRfr || !task) {
      toast.error('Select an RFR before creating the assignment')
      return
    }

    const taskId = String((task as any)?.TaskInstanceId ?? (task as any)?.taskInstanceId ?? '')
    if (!taskId) {
      toast.error('Task instance id not found')
      return
    }

    await assignTaskMutation.mutateAsync({
      appId: applicant?.applicationId ?? null,
      taskId,
      role: detectRole(task.PreScript),
      assignee: selectedRfr.assigneeValue || selectedRfr.id,
      token: token ?? undefined,
      capacity: (task as any)?.capacity ?? undefined,
    })

    const nextAssignmentId = `ASGN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    const nextVisitId = String(Math.floor(2900000 + Math.random() * 9000000))
    const createdAt = nowLabel()
    setAssignmentId(nextAssignmentId)
    setVisitId(nextVisitId)
    setAssignmentCreatedAt(createdAt)
    setStage('assigned')
    addActivity('success', `Assignment ${nextAssignmentId} created for ${selectedRfr.name}`)
    addActivity('info', `Visit ticket ${nextVisitId} created`)
    addActivity('info', `Notification email sent to ${selectedRfr.email || selectedRfr.name}`)
    toast.success(`Assigned ${selectedRfr.name}`)
  }

  const resendNotification = () => {
    if (!selectedRfr) return
    addActivity('info', `Notification email resent to ${selectedRfr.email || selectedRfr.name}`)
    toast.success('Notification resent')
  }

  const markRfrOpened = () => {
    if (stage !== 'assigned' || !selectedRfr) return
    const openedAt = nowLabel()
    setRfrOpenedAt(openedAt)
    setView('rfr')
    addActivity('info', `${selectedRfr.name} opened the application link`)
    toast.success('RFR view opened')
  }

  const confirmVisitDate = () => {
    if (!selectedRfr || !plannedVisitDate) {
      toast.error('Choose a visit date first')
      return
    }
    setStage('date-set')
    setRfrOpenedAt((value) => value ?? nowLabel())
    addActivity('success', `${selectedRfr.name} selected visit date ${formatDate(plannedVisitDate)}`)
    if (rfrNote.trim()) {
      addActivity('info', `RFR note: ${rfrNote.trim()}`)
    }
    addActivity('info', `Confirmation email sent. EIR due ${formatDate(reportDueDate)}`)
    toast.success(`Visit scheduled ${formatDate(plannedVisitDate)}`)
  }

  const markReportSubmitted = () => {
    if (stage !== 'date-set' || !selectedRfr) return
    const submitted = todayYmd()
    setSubmittedAt(submitted)
    setStage('report-submitted')
    addActivity('success', `${selectedRfr.name} submitted EIR via OU Direct`)
    toast.success('EIR submitted')
  }

  const primaryAction = async () => {
    if (stage === 'select') {
      await createAssignment()
      return
    }
    if (stage === 'assigned') {
      resendNotification()
      return
    }
    if (stage === 'date-set') {
      setShowEmailPreview(true)
      return
    }
    onClose()
  }

  const emailBody =
    stage === 'date-set' || stage === 'report-submitted'
      ? [
          `To ${selectedRfr?.name || 'RFR'},`,
          'Your planned visit is confirmed. Thank you.',
          `Plant: ${applicant?.plant || '-'}`,
          `Planned visit date: ${formatDate(plannedVisitDate, 'long')}`,
          `EIR report due: ${formatDate(reportDueDate, 'long')}`,
          'Please submit your Establishment Inspection Report through OU Direct within 7 days of your visit.',
          rfrNote.trim() ? `Your note to NCRC: ${rfrNote.trim()}` : '',
        ].filter(Boolean)
      : [
          `To ${selectedRfr?.name || 'RFR'},`,
          `You've been assigned an initial inspection by ${username || 'NCRC'}. Please review the plant and set your planned visit date.`,
          `Plant: ${applicant?.plant || '-'}`,
          `Company: ${applicant?.company || '-'}`,
          `Account #: ${accountNumber || '-'}`,
          `Date range: ${formatDate(assignmentStartDate, 'long')} - ${formatDate(assignmentEndDate, 'long')}`,
          `Assignment ID: ${assignmentId || '-'}`,
          `Visit ID: ${visitId || '-'}`,
        ]

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-[98vw] flex-col overflow-hidden bg-white shadow-2xl xl:max-w-[82vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b bg-gray-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-sky-300" />
                <h3 className="text-lg font-semibold">
                  {view === 'rfr' ? 'Plant Application - RFR View' : 'Inspection Assignment & Visit'}
                </h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                <span className="rounded-full bg-white/10 px-2.5 py-1">{applicant?.company || 'Application'}</span>
                {accountNumber ? <span className="rounded-full bg-white/10 px-2.5 py-1">App #{accountNumber}</span> : null}
                {applicant?.plant ? <span className="rounded-full bg-white/10 px-2.5 py-1">Plant: {applicant.plant}</span> : null}
                {task?.name ? <span className="rounded-full bg-white/10 px-2.5 py-1">{task.name}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
              aria-label="Close inspection assignment drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {view === 'rfr' ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">
            Viewing as <strong>{selectedRfr?.name || 'RFR'}</strong>. RFR can set a visit date and leave notes; other fields are read-only.
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-b bg-white px-5 py-3">
          <div className="inline-flex overflow-hidden rounded border border-gray-300">
            <button
              type="button"
              onClick={() => setView('ncrc')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold ${view === 'ncrc' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <ClipboardList className="h-4 w-4" />
              NCRC View
            </button>
            <button
              type="button"
              onClick={() => setView('rfr')}
              className={`inline-flex items-center gap-2 border-l border-gray-300 px-3 py-1.5 text-sm font-semibold ${view === 'rfr' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <UserRound className="h-4 w-4" />
              RFR View
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {view === 'rfr' ? 'What the RFR sees after opening the assignment link' : `What ${username || 'NCRC'} sees in the workflow`}
          </div>
        </div>

        <ProgressStrip stage={stage} />

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
          <div className="min-h-0 space-y-4 overflow-y-auto bg-gray-50 p-5">
            {view === 'ncrc' ? (
              <>
                <Section
                  title={
                    <div className="flex items-center justify-between gap-3">
                      <span>1. Assignment</span>
                      {stage === 'assigned' ? (
                        <button
                          type="button"
                          onClick={() => setStage('select')}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold normal-case tracking-normal text-blue-700 hover:bg-blue-50"
                        >
                          <RotateCw className="h-3 w-3" />
                          Change RFR
                        </button>
                      ) : null}
                    </div>
                  }
                >
                  {!isAssigned ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          value={rfrSearch}
                          onChange={(event) => setRfrSearch(event.target.value)}
                          placeholder="Search RFR by name, region, or state..."
                          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                        {isLoading ? (
                          <div className="rounded border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500">
                            Loading RFR list...
                          </div>
                        ) : isError ? (
                          <div className="rounded border border-red-200 bg-red-50 px-3 py-6 text-center text-sm text-red-700">
                            Unable to load RFR list.
                          </div>
                        ) : filteredRfrs.length === 0 ? (
                          <div className="rounded border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500">
                            No RFR matches found.
                          </div>
                        ) : (
                          filteredRfrs.map((rfr) => {
                            const isSelected = selectedRfr?.lookupKey === rfr.lookupKey
                            return (
                              <button
                                key={rfr.lookupKey}
                                type="button"
                                onClick={() => setSelectedRfrId(rfr.lookupKey)}
                                className={`w-full rounded border p-3 text-left ${
                                  isSelected
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-gray-900">{rfr.name}</div>
                                    <div className="mt-1 text-xs text-gray-500">
                                      {[rfr.email, rfr.region, rfr.state].filter(Boolean).join(' - ') || '-'}
                                    </div>
                                  </div>
                                  <StatusChip tone={rfr.status === 'available' ? 'green' : 'red'}>
                                    {rfr.status === 'available' ? 'Active' : 'Inactive'}
                                  </StatusChip>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded border border-gray-200 bg-gray-50 p-3">
                      <InfoRow label="RFR" value={selectedRfr?.name || '-'} strong />
                      <InfoRow label="Date range" value={`${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`} />
                      <InfoRow label="Assignment ID" value={assignmentId || '-'} strong />
                      <InfoRow label="Visit ID" value={visitId || '-'} strong />
                      <InfoRow label="Created by" value={username || 'NCRC'} />
                    </div>
                  )}
                </Section>

                {isAssigned ? (
                  <>
                    <Section title="2. Notify RFR">
                      <div className="flex flex-wrap gap-2">
                        <StatusChip tone="green">Email sent {assignmentCreatedAt ? `- ${assignmentCreatedAt}` : ''}</StatusChip>
                        {rfrOpenedAt ? <StatusChip tone="blue">RFR opened - {rfrOpenedAt}</StatusChip> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEmailPreview(true)}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                      >
                        <Mail className="h-4 w-4" />
                        View email
                      </button>
                    </Section>

                    <Section title="3. RFR Visit Date">
                      {stage === 'assigned' ? (
                        <div className="flex flex-wrap gap-2">
                          <StatusChip tone="amber">Awaiting RFR</StatusChip>
                          <StatusChip>0 days elapsed</StatusChip>
                        </div>
                      ) : (
                        <div className="rounded border border-gray-200 bg-gray-50 p-3">
                          <div className="mb-2">
                            <StatusChip tone="green">Visit scheduled - {formatDate(plannedVisitDate)}</StatusChip>
                          </div>
                          <InfoRow label="Planned visit date" value={formatDate(plannedVisitDate, 'long')} />
                          <InfoRow label="Report due" value={formatDate(reportDueDate, 'long')} />
                          {rfrNote.trim() ? <InfoRow label="RFR note" value={`"${rfrNote.trim()}"`} /> : null}
                        </div>
                      )}
                    </Section>

                    {stage === 'date-set' || stage === 'report-submitted' ? (
                      <Section title="4. Inspection Report (EIR)">
                        {stage === 'date-set' ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <StatusChip tone="amber">Awaiting report</StatusChip>
                              <StatusChip>Due {formatDate(reportDueDate)}</StatusChip>
                            </div>
                            <button
                              type="button"
                              onClick={markReportSubmitted}
                              className="inline-flex items-center gap-2 rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                              <FileCheck2 className="h-4 w-4" />
                              Mark EIR Submitted
                            </button>
                          </div>
                        ) : (
                          <div className="rounded border border-green-200 bg-green-50 p-3">
                            <StatusChip tone="green">EIR submitted {submittedAt ? `- ${formatDate(submittedAt)}` : ''}</StatusChip>
                            <div className="mt-3 rounded border border-green-200 bg-white p-3">
                              <InfoRow label="Submitted via" value="OU Direct" />
                              <InfoRow label="File" value={`EIR_${accountNumber || 'application'}_${submittedAt || todayYmd()}.pdf`} strong />
                            </div>
                          </div>
                        )}
                      </Section>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Section title="Plant Assignment">
                  <div className="rounded border border-blue-200 bg-blue-50 p-4">
                    <div className="text-base font-semibold text-blue-950">{applicant?.plant || 'Plant'}</div>
                    <div className="mt-1 text-sm text-blue-800">{applicant?.company || 'Application'}</div>
                  </div>
                  <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
                    <InfoRow label="Assigned by" value={username || 'NCRC'} />
                    <InfoRow label="Date range" value={`${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`} />
                    <InfoRow label="Contact at plant" value="Primary contact" />
                  </div>
                </Section>

                <Section title="Your Visit Date">
                  {stage === 'date-set' || stage === 'report-submitted' ? (
                    <div className="rounded border border-green-200 bg-green-50 p-3">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
                        <Check className="h-4 w-4" />
                        Visit date confirmed
                      </div>
                      <InfoRow label="Your visit" value={formatDate(plannedVisitDate, 'long')} />
                      <InfoRow label="Report due by" value={formatDate(reportDueDate, 'long')} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!rfrOpenedAt && stage === 'assigned' ? (
                        <button
                          type="button"
                          onClick={markRfrOpened}
                          className="inline-flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Simulate RFR Opening Link
                        </button>
                      ) : null}
                      <label className="block text-sm">
                        <span className="text-xs font-semibold uppercase text-gray-500">Planned visit date</span>
                        <input
                          type="date"
                          min={assignmentStartDate}
                          max={assignmentEndDate}
                          value={plannedVisitDate}
                          disabled={stage !== 'assigned'}
                          onChange={(event) => setPlannedVisitDate(event.target.value)}
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold uppercase text-gray-500">Note to NCRC</span>
                        <textarea
                          value={rfrNote}
                          disabled={stage !== 'assigned'}
                          onChange={(event) => setRfrNote(event.target.value)}
                          rows={4}
                          placeholder="Scheduling constraints, plant contact notes, or questions..."
                          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={confirmVisitDate}
                        disabled={stage !== 'assigned'}
                        className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Confirm Visit Date
                      </button>
                    </div>
                  )}
                </Section>

                <Section title="Application Reference">
                  <div className="divide-y divide-gray-100 rounded border border-gray-200 bg-white">
                    <button type="button" className="flex w-full items-center justify-between gap-4 p-3 text-left hover:bg-gray-50">
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">Application details</span>
                        <span className="text-xs text-gray-500">Plant info, contacts, products, history</span>
                      </span>
                      <ExternalLink className="h-4 w-4 text-blue-600" />
                    </button>
                    <button type="button" className="flex w-full items-center justify-between gap-4 p-3 text-left hover:bg-gray-50">
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">Schedule A - Ingredients</span>
                        <span className="text-xs text-gray-500">Ingredient status and inspection scope</span>
                      </span>
                      <ExternalLink className="h-4 w-4 text-blue-600" />
                    </button>
                  </div>
                </Section>
              </>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto bg-slate-100 p-5">
            {view === 'ncrc' ? (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    {stage === 'date-set' || stage === 'report-submitted' ? 'Confirmation email' : 'Notification email'} preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview(true)}
                    disabled={!selectedRfr}
                    className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    View full
                  </button>
                </div>
                <div className="divide-y divide-gray-100 px-4 text-sm">
                  <InfoRow
                    label="To"
                    value={selectedRfr ? `${selectedRfr.name}${selectedRfr.email ? ` <${selectedRfr.email}>` : ''}` : 'Select an RFR'}
                  />
                  <InfoRow label="Subject" value={selectedRfr ? subject : '-'} />
                </div>
                <div className="space-y-3 p-4 text-sm leading-6 text-gray-700">
                  {selectedRfr ? (
                    emailBody.map((line) => <p key={line}>{line}</p>)
                  ) : (
                    <p className="italic text-gray-500">The email preview will appear here once you select an RFR.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-base font-bold text-blue-950">
                      {applicant?.company || 'Application'} - {applicant?.plant || 'Plant'}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">Read-only plant reference</div>
                  </div>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <InfoRow label="Account #" value={accountNumber || '-'} />
                  <InfoRow label="Region" value={applicant?.region || '-'} />
                  <InfoRow label="Scope" value="Review plant details and Schedule A before visit" />
                  <InfoRow label="Plant status" value="New application - first inspection" />
                  <InfoRow label="Last visit" value="- (none on file)" />
                </div>
                <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                  <strong>Note from NCRC:</strong> Contact the plant before visiting to confirm production schedule and access requirements.
                </div>
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  <strong>Heads up:</strong> Review ingredients and pending LOC items before the visit.
                </div>
              </div>
            )}

            <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-600">Activity</div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{activity.length}</span>
              </div>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <div className="text-sm text-gray-500">No assignment activity yet.</div>
                ) : (
                  activity.map((item) => (
                    <div key={item.id} className="flex gap-3 border-b border-dashed border-gray-100 pb-3 last:border-b-0 last:pb-0">
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full ${
                          item.tone === 'success' ? 'bg-green-500' : item.tone === 'info' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                      />
                      <div>
                        <div className="text-sm text-gray-800">{item.text}</div>
                        <div className="mt-0.5 text-xs text-gray-400">{item.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t bg-white px-5 py-3">
          <div className="min-w-0 text-sm text-gray-600">
            {stage === 'select'
              ? selectedRfr
                ? `${selectedRfr.name} selected. Create the assignment and notify the RFR.`
                : 'Select an RFR to create the assignment.'
              : stage === 'assigned'
                ? `Waiting for ${selectedRfr?.name || 'RFR'} to set a visit date.`
                : stage === 'date-set'
                  ? `Visit scheduled for ${formatDate(plannedVisitDate)}. EIR due ${formatDate(reportDueDate)}.`
                  : 'Assignment and visit are complete.'}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={primaryAction}
              disabled={(stage === 'select' && !selectedRfr) || assignTaskMutation.isPending}
              className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${
                stage === 'report-submitted' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {assignTaskMutation.isPending ? 'Creating...' : stage === 'select' ? 'Create Assignment & Notify' : stage === 'assigned' ? 'Resend Notification' : stage === 'date-set' ? 'Message RFR' : 'Next Stage'}
            </button>
          </div>
        </div>

        {showEmailPreview ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl">
              <div className="border-b px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {stage === 'date-set' || stage === 'report-submitted' ? 'Confirmation email to RFR' : 'Notification email to RFR'}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">What the RFR will receive.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview(false)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100"
                    aria-label="Close email preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4 px-5 py-4">
                <div className="rounded border border-gray-200">
                  <InfoRow label="From" value="Project Flow <projectflow@ou.org>" />
                  <InfoRow
                    label="To"
                    value={selectedRfr ? `${selectedRfr.name}${selectedRfr.email ? ` <${selectedRfr.email}>` : ''}` : '-'}
                  />
                  <InfoRow label="Subject" value={subject} />
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {emailBody.map((line) => (
                    <p key={line} className="mb-3 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(false)}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
