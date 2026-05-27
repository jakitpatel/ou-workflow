import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Mail, Pencil, Search, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { createApplicationMessage } from '@/features/applications/api'
import { refreshApplicationInListCaches } from '@/features/applications/cache/applicationListCache'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import {
  buildInspectionStatusDetails,
  getInspectionStatusInputParam,
} from '@/features/applications/utils/inspectionStatusDetails'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { patchTaskGuiDisplayResult, patchTaskResult } from '@/features/tasks/api'
import { useAssignTaskMutation } from '@/features/tasks/hooks/useTaskMutations'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { detectRole } from '@/lib/utils/taskHelpers'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { Applicant, Task } from '@/types/application'

type Props = {
  open: boolean
  applicant?: Applicant
  task?: Task
  onClose: () => void
}

type RfrOption = {
  id: string
  lookupKey: string
  assigneeValue: string
  userName: string
  name: string
  email: string
  region: string
  state: string
  status: 'available' | 'inactive'
}

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const mapLookupRfr = (item: any): RfrOption => {
  const name = normalizeText(item.rfr ?? item.fullName ?? item.name ?? item.userName ?? item.id)
  const userName = normalizeText(item.userName ?? item.id)
  const lookupKey = normalizeText(item.lookupKey ?? item.id ?? userName ?? name)
  const assigneeValue = normalizeText(item.assigneeValue ?? userName ?? item.id ?? lookupKey)

  return {
    id: assigneeValue || lookupKey,
    lookupKey,
    assigneeValue,
    userName,
    name,
    email: normalizeText(item.email),
    region: normalizeText(item.userRole),
    state: normalizeText(item.state),
    status: item.isActive === false ? 'inactive' : 'available',
  }
}

const todayYmd = () => new Date().toISOString().slice(0, 10)

const addDaysToYmd = (ymd: string, days: number) => {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const formatDate = (ymd: string) => {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatDisplayDate = (ymd: string) => {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const formatSentDate = (date = new Date()) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const nowLabel = () =>
  new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const getAccountNumber = (applicant?: Applicant) =>
  String(applicant?.companyId ?? applicant?.externalReferenceId ?? applicant?.applicationId ?? '').trim()

const buildFilteredApplicationUrl = (applicationId: string) => {
  const params = new URLSearchParams({
    q: '',
    status: 'all',
    priority: 'all',
    page: '0',
    myOnly: 'true',
    applicationId,
  })
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const appPath = `${basePath && basePath !== '/' ? basePath : ''}/ou-workflow/ncrc-dashboard?${params.toString()}`

  return typeof window === 'undefined' ? appPath : new URL(appPath, window.location.origin).toString()
}

const normalizeMatchText = (value: unknown) => normalizeText(value).toLowerCase()

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const replaceApplicationLinkLabel = ({
  html,
  href,
  label,
}: {
  html: string
  href: string
  label: string
}) => {
  const escapedLabel = escapeHtml(label)
  const escapedText = `Application link: ${escapedLabel}`
  const linkedText = `Application link: <a href="${escapeHtml(href)}" style="color:#1d4ed8;text-decoration:underline;">${escapedLabel}</a>`

  return html.replace(escapedText, linkedText)
}

const getTaskInstanceId = (task?: Task): string =>
  String((task as any)?.TaskInstanceId ?? (task as any)?.taskInstanceId ?? '').trim()

const getRawTaskInstanceId = (value: unknown): string => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return String(record.TaskInstanceId ?? record.taskInstanceId ?? record.id ?? '').trim()
}

const withPatchedTaskGuiDisplayResult = (
  value: unknown,
  taskId: string,
  guiDisplayResult?: string,
  statusDetails?: unknown,
): unknown => {
  if (!value || typeof value !== 'object') return value

  if (Array.isArray(value)) {
    const nextValue = value.map((item) =>
      withPatchedTaskGuiDisplayResult(item, taskId, guiDisplayResult, statusDetails),
    )
    return nextValue.some((item, index) => item !== value[index]) ? nextValue : value
  }

  const record = value as Record<string, any>
  const recordTaskId = getRawTaskInstanceId(record)
  let changed = false
  let nextRecord = record

  if (recordTaskId && recordTaskId === taskId) {
    changed = true
    nextRecord = {
      ...nextRecord,
      ...(statusDetails ? { StatusDetails: statusDetails, statusDetails } : {}),
      ...(guiDisplayResult
        ? {
            GUIDisplayResult: guiDisplayResult,
            ResultData: {
              GUIDisplayResult: guiDisplayResult,
            },
          }
        : {}),
    }
  }

  if (Array.isArray(record.data)) {
    const nextData = record.data.map((item) =>
      withPatchedTaskGuiDisplayResult(item, taskId, guiDisplayResult, statusDetails),
    )
    if (nextData.some((item, index) => item !== record.data[index])) {
      changed = true
      nextRecord = { ...nextRecord, data: nextData }
    }
  }

  if (Array.isArray(record.pages)) {
    const nextPages = record.pages.map((page) =>
      withPatchedTaskGuiDisplayResult(page, taskId, guiDisplayResult, statusDetails),
    )
    if (nextPages.some((page, index) => page !== record.pages[index])) {
      changed = true
      nextRecord = { ...nextRecord, pages: nextPages }
    }
  }

  if (record.stages && typeof record.stages === 'object') {
    let stagesChanged = false
    const nextStages = Object.fromEntries(
      Object.entries(record.stages).map(([stageKey, stageValue]) => {
        if (!stageValue || typeof stageValue !== 'object') return [stageKey, stageValue]
        const stageRecord = stageValue as Record<string, any>
        if (!Array.isArray(stageRecord.tasks)) return [stageKey, stageValue]

        const nextTasks = stageRecord.tasks.map((stageTask) =>
          withPatchedTaskGuiDisplayResult(stageTask, taskId, guiDisplayResult, statusDetails),
        )
        if (!nextTasks.some((stageTask, index) => stageTask !== stageRecord.tasks[index])) {
          return [stageKey, stageValue]
        }

        stagesChanged = true
        return [stageKey, { ...stageRecord, tasks: nextTasks }]
      }),
    )

    if (stagesChanged) {
      changed = true
      nextRecord = { ...nextRecord, stages: nextStages }
    }
  }

  return changed ? nextRecord : value
}

const findVisitDateTaskId = (applicant?: Applicant): string => {
  const tasks = Object.values(applicant?.stages ?? {}).flatMap((stage) => stage.tasks ?? [])
  const visitDateTask = tasks.find((stageTask) => {
    const taskCategory = normalizeMatchText((stageTask as any)?.taskCategory ?? (stageTask as any)?.TaskCategory)
    const taskType = normalizeMatchText((stageTask as any)?.taskType ?? (stageTask as any)?.TaskType)
    const taskName = normalizeMatchText((stageTask as any)?.name ?? (stageTask as any)?.TaskName)

    return (
      taskCategory === TASK_CATEGORIES.VISIT &&
      taskType === TASK_TYPES.ACTION &&
      (!taskName || taskName.includes('visit date'))
    )
  }) ?? tasks.find((stageTask) => {
    const taskCategory = normalizeMatchText((stageTask as any)?.taskCategory ?? (stageTask as any)?.TaskCategory)
    const taskType = normalizeMatchText((stageTask as any)?.taskType ?? (stageTask as any)?.TaskType)

    return taskCategory === TASK_CATEGORIES.VISIT && taskType === TASK_TYPES.ACTION
  })

  return getTaskInstanceId(visitDateTask)
}

const extractRfrFromTaskResult = (task?: Task): string => {
  const rawResult = normalizeText(
    getInspectionStatusInputParam(
      (task as any)?.StatusDetails ?? (task as any)?.statusDetails ?? (task as any)?.Result ?? (task as any)?.result,
    ),
  )
  if (!rawResult) return ''

  const match = rawResult.match(/RFR\s*:\s*"?([^",}\s]+)"?/i)
  return normalizeText(match?.[1])
}

const extractVisitIdFromAssignResponse = (response: unknown): string => {
  if (!response || typeof response !== 'object') return ''

  const payload = response as {
    visitId?: unknown
    visit_id?: unknown
    result?: unknown
    data?: { visitId?: unknown; attributes?: { visitId?: unknown } }
    attributes?: { visitId?: unknown; visit_id?: unknown }
  }

  if (typeof payload.result === 'string' && payload.result.trim()) {
    try {
      const resultPayload = JSON.parse(payload.result) as { visit_id?: unknown; visitId?: unknown }
      const resultVisitId = normalizeText(resultPayload.visit_id ?? resultPayload.visitId)
      if (resultVisitId) return resultVisitId
    } catch {
      return ''
    }
  }

  return normalizeText(
    payload.visit_id ??
      payload.visitId ??
      payload.data?.visitId ??
      payload.data?.attributes?.visitId ??
      payload.attributes?.visit_id ??
      payload.attributes?.visitId,
  )
}

const resolveRfrSelectionId = (rfrs: RfrOption[], savedRfr: string): string => {
  const normalizedSavedRfr = normalizeMatchText(savedRfr)
  if (!normalizedSavedRfr) return ''

  const matchedRfr = rfrs.find((rfr) =>
    [rfr.lookupKey, rfr.id, rfr.assigneeValue, rfr.userName, rfr.name].some(
      (value) => normalizeMatchText(value) === normalizedSavedRfr,
    ),
  )

  return matchedRfr?.lookupKey ?? ''
}

const buildAssignmentGuiDisplayResult = ({
  rfr,
  visitId,
  startDate,
  endDate,
  sentDate,
}: {
  rfr: RfrOption
  visitId: string
  startDate: string
  endDate: string
  sentDate: Date
}) => {
  const rfrValue = rfr.userName || rfr.assigneeValue || rfr.id || rfr.lookupKey || rfr.name
  return `{RFR:${rfrValue}, Visit #${visitId}, ${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}, Sent ${formatSentDate(sentDate)}}`
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

function StatusChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'green' | 'blue' | 'red'
}) {
  const classes = {
    neutral: 'border-gray-200 bg-white text-gray-600',
    green: 'border-green-200 bg-green-50 text-green-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[tone]}`}>
      {children}
    </span>
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

export function InspectionAssignmentDrawer({ open, applicant, task, onClose }: Props) {
  const { token, username } = useUser()
  const queryClient = useQueryClient()
  const { data: rfrLookupList = [], isError, isLoading } = useUserListByRole('api/vSelectRFR', {
    enabled: open,
  })
  const assignTaskMutation = useAssignTaskMutation({
    includeApplicationLists: false,
    includePrelimLists: false,
    onError: (message) => toast.error(message),
  })

  const rfrs = useMemo(() => rfrLookupList.map(mapLookupRfr), [rfrLookupList])
  const [selectedRfrId, setSelectedRfrId] = useState('')
  const [rfrSearch, setRfrSearch] = useState('')
  const [showRfrPicker, setShowRfrPicker] = useState(false)
  const [assignmentCreatedAt, setAssignmentCreatedAt] = useState<string | null>(null)
  const [visitId, setVisitId] = useState<string | null>(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [isSendingAssignmentMessage, setIsSendingAssignmentMessage] = useState(false)

  const selectedRfr = useMemo(
    () => rfrs.find((rfr) => rfr.lookupKey === selectedRfrId || rfr.id === selectedRfrId) ?? null,
    [rfrs, selectedRfrId],
  )

  useEffect(() => {
    if (!open) return

    const savedRfr = extractRfrFromTaskResult(task)
    if (!savedRfr) {
      setSelectedRfrId('')
      setShowRfrPicker(true)
      return
    }

    const resolvedRfrId = resolveRfrSelectionId(rfrs, savedRfr)
    setSelectedRfrId(resolvedRfrId || savedRfr)
    setRfrSearch('')
    setShowRfrPicker(false)
  }, [open, rfrs, task])

  const filteredRfrs = useMemo(() => {
    const query = rfrSearch.trim().toLowerCase()
    if (!query) return rfrs
    return rfrs.filter((rfr) =>
      [rfr.name, rfr.email, rfr.region, rfr.state, rfr.userName].some((value) => value.toLowerCase().includes(query)),
    )
  }, [rfrSearch, rfrs])

  if (!open) return null

  const accountNumber = getAccountNumber(applicant)
  const accountApplicationUrl = accountNumber ? buildFilteredApplicationUrl(accountNumber) : ''
  const assignmentStartDate = todayYmd()
  const assignmentEndDate = addDaysToYmd(assignmentStartDate, 90)
  const isAssigned = Boolean(assignmentCreatedAt)
  const selectedRfrLabel = selectedRfr?.name || selectedRfrId || '-'
  const selectedRfrMeta =
    selectedRfr
      ? [selectedRfr.email, selectedRfr.region, selectedRfr.state].filter(Boolean).join(' - ') || selectedRfr.userName || '-'
      : selectedRfrId
        ? 'Selected on invoice'
        : '-'
  const emailPreviewLabel = isAssigned
    ? 'Notification email - sent'
    : selectedRfr
      ? 'Notification email - preview (not yet sent)'
      : 'Notification email - preview'
  const emailSubject = `OU Kosher - Inspection Assignment for ${applicant?.plant || 'Plant'} [${accountNumber || 'Application'}]`
  const applicationLinkLabel = applicant?.company || 'Application'
  const emailBody: Array<{ text: string; href?: string; linkText?: string }> = [
    { text: `To ${selectedRfr?.name || 'RFR'},` },
    {
      text: `You've been assigned an initial inspection by ${username || 'NCRC'}. Please review the plant and set your planned visit date.`,
    },
    { text: `Plant: ${applicant?.plant || '-'}` },
    { text: `Company: ${applicant?.company || '-'}` },
    { text: `Account #: ${accountNumber || '-'}` },
    ...(accountApplicationUrl
      ? [{ text: 'Application link: ', href: accountApplicationUrl, linkText: applicationLinkLabel }]
      : []),
    { text: `Date range: ${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}` },
    { text: `Visit ID: ${visitId || '-'}` },
  ]

  const updateCachedAssignmentTaskResult = (
    taskId: string,
    guiDisplayResult?: string,
    statusDetails?: unknown,
  ) => {
    queryClient.setQueriesData({ queryKey: applicationsQueryKeys.lists() }, (current) =>
      withPatchedTaskGuiDisplayResult(current, taskId, guiDisplayResult, statusDetails),
    )
    queryClient.setQueriesData({ queryKey: applicationsQueryKeys.details() }, (current) =>
      withPatchedTaskGuiDisplayResult(current, taskId, guiDisplayResult, statusDetails),
    )
    queryClient.setQueriesData({ queryKey: prelimQueryKeys.lists() }, (current) =>
      withPatchedTaskGuiDisplayResult(current, taskId, guiDisplayResult, statusDetails),
    )
    queryClient.setQueriesData({ queryKey: tasksQueryKeys.lists() }, (current) =>
      withPatchedTaskGuiDisplayResult(current, taskId, guiDisplayResult, statusDetails),
    )
  }

  const createAssignment = async () => {
    if (!selectedRfr || !task) {
      toast.error('Select an RFR before creating the assignment')
      return
    }

    const taskId = getTaskInstanceId(task)
    if (!taskId) {
      toast.error('Task instance id not found')
      return
    }
    const visitDateTaskId = findVisitDateTaskId(applicant)
    if (!visitDateTaskId) {
      toast.error('Visit Date task instance id not found')
      return
    }

    setIsSendingAssignmentMessage(true)
    try {
      const assignResponse = await assignTaskMutation.mutateAsync({
        appId: applicant?.applicationId ?? null,
        taskId,
        role: detectRole(task.PreScript),
        assignee: selectedRfr.assigneeValue || selectedRfr.id,
        token: token ?? undefined,
        capacity: (task as any)?.capacity ?? undefined,
        override: 1,
      })
      const nextVisitId = extractVisitIdFromAssignResponse(assignResponse)
      if (!nextVisitId) {
        throw new Error('Assignment response did not include visitId')
      }

      const notificationMessageText = [
        `To ${selectedRfr.name},`,
        '',
        `You've been assigned an initial inspection by ${username || 'NCRC'}. Please review the plant and set your planned visit date.`,
        '',
        `Plant: ${applicant?.plant || '-'}`,
        '',
        `Company: ${applicant?.company || '-'}`,
        '',
        `Account #: ${accountNumber || '-'}`,
        ...(accountApplicationUrl ? ['', `Application link: ${applicationLinkLabel}`] : []),
        '',
        `Date range: ${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`,
        '',
        `Visit ID: ${nextVisitId}`,
      ].join('\n')
      const notificationEmail = buildHtmlEmailFromPlainText(notificationMessageText, {
        preheader: `Inspection assignment for ${applicant?.plant || 'Plant'}`,
        title: 'Inspection Assignment',
      })
      if (accountApplicationUrl) {
        notificationEmail.html = replaceApplicationLinkLabel({
          html: notificationEmail.html,
          href: accountApplicationUrl,
          label: applicationLinkLabel,
        })
      }

      await createApplicationMessage({
        payload: {
          MessageID: null,
          ApplicationID: applicant?.applicationId ?? null,
          FromUser: 'projectflow@ou.org',
          ToUser: selectedRfr.email || selectedRfr.name,
          Subject: emailSubject,
          MessageText: notificationEmail.html,
          MessageTextPlain: notificationEmail.text,
          PlainText: notificationEmail.text,
          Text: notificationEmail.text,
          MessageType: 'Email',
          Priority: 'NORMAL',
          SentDate: new Date().toISOString(),
          TemplateName: null,
          TaskInstanceId: taskId,
          isPrivate: false,
          parentMessageId: null,
          toReply: null,
          isRead: false,
          tag: null,
          CCUser: null,
          BCCUser: 'productAutomation@ou.org',
          Attachments: null,
        },
        token,
      })

      const rfrResultValue =
        selectedRfr.userName || selectedRfr.assigneeValue || selectedRfr.id || selectedRfr.lookupKey || selectedRfr.name
      const dateRangeResultValue = `${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`
      const visitDateStatusDetails = buildInspectionStatusDetails(
        `{RFR:${rfrResultValue}, visitId:"${nextVisitId}", Daterange:"${dateRangeResultValue}"}`,
      )
      const assignmentSentDate = new Date()
      const assignmentGuiDisplayResult = buildAssignmentGuiDisplayResult({
        rfr: selectedRfr,
        visitId: nextVisitId,
        startDate: assignmentStartDate,
        endDate: assignmentEndDate,
        sentDate: assignmentSentDate,
      })

      await patchTaskGuiDisplayResult({
        taskId,
        result: assignmentGuiDisplayResult,
        token,
      })
      updateCachedAssignmentTaskResult(taskId, assignmentGuiDisplayResult)

      await patchTaskResult({
        taskId: visitDateTaskId,
        result: visitDateStatusDetails,
        token,
      })
      updateCachedAssignmentTaskResult(visitDateTaskId, undefined, visitDateStatusDetails)

      await Promise.all([
        refreshApplicationInListCaches({
          applicationId: applicant?.applicationId,
          queryClient,
          token,
        }).then((refreshed) =>
          refreshed
            ? undefined
            : queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
        ).catch(() => queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })),
        queryClient.invalidateQueries({ queryKey: prelimQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])

      setVisitId(nextVisitId)
      setAssignmentCreatedAt(nowLabel())
      toast.success(`Assigned ${selectedRfr.name} and sent notification`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create assignment notification'
      toast.error(message)
    } finally {
      setIsSendingAssignmentMessage(false)
    }
  }

  const resendNotification = () => {
    toast.success('Notification resent')
    setShowEmailPreview(true)
  }

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
                <h3 className="text-lg font-semibold">Inspection Assignment</h3>
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

        <div className="grid grid-cols-2 border-b bg-white">
          {[
            { label: 'Assign RFR', complete: isAssigned, current: !isAssigned },
            { label: 'Notify RFR', complete: isAssigned, current: false },
          ].map((step, index) => (
            <div
              key={step.label}
              className={`flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold ${
                step.complete ? 'text-green-700' : step.current ? 'text-blue-700' : 'text-gray-400'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  step.complete ? 'bg-green-600 text-white' : step.current ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.complete ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {step.label}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
          <div className="min-h-0 space-y-4 overflow-y-auto bg-gray-50 p-5">
            <Section title="1. Assignment">
              {!isAssigned ? (
                <>
                  {selectedRfrId && !showRfrPicker ? (
                    <div>
                      <div className="relative rounded border border-gray-200 bg-gray-50 p-3">
                        <button
                          type="button"
                          onClick={() => setShowRfrPicker(true)}
                          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <div className="pr-16">
                          <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
                            RFR (chosen at invoice)
                          </div>
                          <div className="mt-2 text-sm font-semibold text-gray-900">{selectedRfrLabel}</div>
                          <div className="mt-1 text-xs text-gray-500">{selectedRfrMeta}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Click <strong>Create Assignment & Notify</strong> below to register in Kashrus and notify the RFR.
                      </div>
                    </div>
                  ) : null}

                  {!selectedRfrId && !showRfrPicker ? (
                    <div className="rounded border border-amber-300 bg-amber-50 p-3">
                      <div className="font-semibold text-amber-950">No RFR selected</div>
                      <div className="mt-1 text-xs text-amber-800">
                        An RFR is normally picked on the invoice. Select one before creating the assignment.
                      </div>
                    </div>
                  ) : null}

                  {showRfrPicker ? (
                    <div className={selectedRfrId ? 'mt-3' : undefined}>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          value={rfrSearch}
                          onChange={(event) => setRfrSearch(event.target.value)}
                          placeholder="Search RFR by name, region, or state..."
                          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                        {isLoading ? (
                          <div className="rounded border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500">
                            Loading RFR list...
                          </div>
                        ) : isError ? (
                          <div className="rounded border border-red-200 bg-red-50 px-3 py-6 text-center text-sm text-red-700">
                            Unable to load RFR list.
                          </div>
                        ) : (
                          filteredRfrs.map((rfr) => {
                            const isSelected = selectedRfr?.lookupKey === rfr.lookupKey
                            return (
                              <button
                                key={rfr.lookupKey}
                                type="button"
                                onClick={() => {
                                  setSelectedRfrId(rfr.lookupKey)
                                  setRfrSearch('')
                                  setShowRfrPicker(false)
                                }}
                                className={`w-full rounded border p-3 text-left ${
                                  isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
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
                      <div className="mt-2 text-xs text-gray-500">
                        Pick a different RFR. The change applies before the assignment is created.
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <InfoRow label="RFR" value={selectedRfrLabel} strong />
                  <InfoRow label="Date range" value={`${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`} />
                  <InfoRow label="Visit ID" value={visitId || '-'} strong />
                  <InfoRow label="Created by" value={username || 'NCRC'} />
                </div>
              )}
            </Section>

            {isAssigned ? (
              <Section title="2. Notify RFR">
                <div className="flex flex-wrap gap-2">
                  <StatusChip tone="green">Email sent - {assignmentCreatedAt}</StatusChip>
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
            ) : null}
          </div>

          <div className="min-h-0 overflow-y-auto bg-slate-100 p-5">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                  {emailPreviewLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(true)}
                  disabled={!selectedRfr}
                  className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  View full -&gt;
                </button>
              </div>
              <div className="divide-y divide-gray-100 px-4 text-sm">
                <InfoRow
                  label="To"
                  value={selectedRfr ? `${selectedRfr.name}${selectedRfr.email ? ` <${selectedRfr.email}>` : ''}` : <span className="italic text-gray-400">Select an RFR to preview the email</span>}
                />
                <InfoRow label="Subject" value={selectedRfr ? emailSubject : <span className="text-gray-400">-</span>} />
              </div>
              <div className="space-y-3 px-5 py-5 text-sm leading-6 text-gray-700">
                {selectedRfr ? (
                  emailBody.map((line) => (
                    <p key={line.text}>
                      {line.href ? (
                        <>
                          {line.text}
                          <a className="font-semibold text-blue-700 underline hover:text-blue-800" href={line.href}>
                            {line.linkText ?? line.text}
                          </a>
                        </>
                      ) : (
                        line.text
                      )}
                    </p>
                  ))
                ) : (
                  <p className="italic text-gray-400">The email preview will appear here once you select an RFR and create the assignment.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t bg-white px-5 py-3">
          <div className="min-w-0 text-sm text-gray-600">
            {isAssigned
              ? `Assignment created. ${selectedRfr?.name || 'RFR'} has been notified and can set the visit date.`
              : selectedRfr
                ? `${selectedRfr.name} selected. Create the assignment and notify the RFR.`
                : 'Select an RFR to create the inspection assignment.'}
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
              onClick={isAssigned ? resendNotification : createAssignment}
              disabled={(!isAssigned && !selectedRfr) || assignTaskMutation.isPending || isSendingAssignmentMessage}
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {assignTaskMutation.isPending || isSendingAssignmentMessage
                ? 'Creating...'
                : isAssigned
                  ? 'Resend Notification'
                  : 'Create Assignment & Notify'}
            </button>
          </div>
        </div>

        {showEmailPreview ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl">
              <div className="border-b px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Notification email to RFR</h4>
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
                <div className="rounded border border-gray-200 px-3">
                  <InfoRow label="From" value="Project Flow <projectflow@ou.org>" />
                  <InfoRow
                    label="To"
                    value={selectedRfr ? `${selectedRfr.name}${selectedRfr.email ? ` <${selectedRfr.email}>` : ''}` : '-'}
                  />
                  <InfoRow label="Subject" value={emailSubject} />
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {emailBody.map((line) => (
                    <p key={line.text} className="mb-3 last:mb-0">
                      {line.href ? (
                        <>
                          {line.text}
                          <a className="font-semibold text-blue-700 underline hover:text-blue-800" href={line.href}>
                            {line.linkText ?? line.text}
                          </a>
                        </>
                      ) : (
                        line.text
                      )}
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
