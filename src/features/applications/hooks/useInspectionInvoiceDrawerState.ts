import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generateInspectionInvoice, createApplicationMessage, fetchApplicationDetail } from '@/features/applications/api'
import { useUser } from '@/context/UserContext'
import type { Applicant, CompanyContact } from '@/types/application'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { confirmTask, patchTaskGuiDisplayResult, patchTaskResult } from '@/features/tasks/api'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import {
  buildInspectionStatusDetails,
  getInspectionStatusSavedState,
} from '@/features/applications/utils/inspectionStatusDetails'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'

export type InspectionInvoiceStage =
  | 'setup'
  | 'configured'
  | 'generated'
  | 'outlook-opened'
  | 'sent-captured'
  | 'paid'

export const INSPECTION_LETTER_TEMPLATE = 'initial-inspection'
export const APPLICATION_FEE_LETTER_TEMPLATE = 'application-fee'
export const APPLICATION_FEE_DESCRIPTION =
  'Non-refundable fee to initiate OU Kosher certification review'
export const INITIAL_INSPECTION_FEE_DESCRIPTION =
  'Professional services - kosher certification initial inspection'

export type InspectionInvoiceRfr = {
  id: string
  name: string
  lookupKey: string
  assigneeValue: string
  region: string
  coverage: string
  email: string
  userName: string
  fullName: string
  state: string
  isActive: boolean
  status: 'available' | 'inactive'
  pctOfTotalApps: number
  pctOfTotalAppsAtWork: number
}

export type InspectionInvoiceRecipientOption = {
  value: string
  label: string
  name: string
  email: string
  type: string
}

type InspectionInvoiceSavedState = {
  version?: number
  stage?: InspectionInvoiceStage
  setup?: {
    inspectionNeeded?: boolean | null
    feeRequired?: boolean | null
    awaitPayment?: boolean
    selectedRfrId?: string | null
    rfr?: Partial<InspectionInvoiceRfr> | null
    feeAmount?: string
    expenseAmount?: string
    invoiceDate?: string
    internalNotes?: string
    noInspectionReason?: string
    noFeeReason?: string
    recipient?: string
    recipientEmail?: string
    extraRecipientEmail?: string
    letterTemplate?: string
  }
  generate?: {
    invoiceId?: string | null
    invoiceDownloadLink?: string | null
    invoicePdfUrl?: string | null
    generatedAt?: string
  }
  email?: {
    sent?: boolean
    sentAt?: string | null
    toUser?: string
    subject?: string
    attachments?: string
  }
  payment?: {
    paid?: boolean
    paidAt?: string | null
  }
}

const RFR_FEE_RULES: Record<string, { fee: number; expenses: number }> = {
  'NY/NJ': { fee: 600, expenses: 333 },
  'NJ/PA': { fee: 600, expenses: 450 },
  Mexico: { fee: 1200, expenses: 1850 },
  CA: { fee: 800, expenses: 920 },
}

const todayYmd = () => new Date().toISOString().slice(0, 10)

export const formatCurrency = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })

export const formatInvoiceDate = (value: string) => {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const getApplicantAccountNumber = (applicant?: Applicant) =>
  String(applicant?.companyId ?? '').trim()

const normalizeRfrText = (value: unknown) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeContactText = normalizeRfrText

const getContactBucket = (contact: CompanyContact): string | null => {
  const role = normalizeContactText(contact.role).toLowerCase()
  const type = normalizeContactText(contact.type).toLowerCase()
  const haystack = `${role} ${type}`

  if (type === 'primary contact' || role.includes('primary')) return 'Primary Contact'
  if (haystack.includes('billing') || haystack.includes('accounts payable')) return 'Billing Contact'
  if (haystack.includes('operation')) return 'Operation Contact'

  return null
}

const mapCompanyContactToRecipientOption = (
  contact: CompanyContact,
  index: number,
): InspectionInvoiceRecipientOption | null => {
  const name = normalizeContactText(contact.name)
  const email = normalizeContactText(contact.email)
  const bucket = getContactBucket(contact)

  if (!name || !email || !bucket) return null

  return {
    value: `contact:${index}:${email}`,
    label: `${name} - ${email} (${bucket})`,
    name,
    email,
    type: bucket,
  }
}

const mapLookupRfr = (item: any): InspectionInvoiceRfr => {
  const name = normalizeRfrText(item.rfr ?? item.fullName ?? item.name ?? item.userName ?? item.id)
  const userName = normalizeRfrText(item.userName ?? item.id)
  const email = normalizeRfrText(item.email)
  const lookupKey = normalizeRfrText(item.lookupKey ?? item.id ?? userName ?? name)
  const assigneeValue = normalizeRfrText(item.assigneeValue ?? userName ?? item.id ?? lookupKey)

  return {
    id: assigneeValue || lookupKey,
    name,
    lookupKey,
    assigneeValue,
    region: normalizeRfrText(item.userRole),
    coverage: normalizeRfrText(item.fullName && item.fullName !== name ? item.fullName : ''),
    email,
    userName,
    fullName: normalizeRfrText(item.fullName ?? name),
    state: normalizeRfrText(item.state),
    isActive: item.isActive !== false,
    status: item.isActive === false ? 'inactive' : 'available',
    pctOfTotalApps: Number(item.pct_of_total_apps) || 0,
    pctOfTotalAppsAtWork: Number(item.pct_of_total_apps_at_work) || 0,
  }
}

const normalizeTaskText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const getRawTaskInstanceId = (task: unknown): string => {
  const taskRecord = task && typeof task === 'object' ? (task as Record<string, unknown>) : {}
  return String(taskRecord.TaskInstanceId ?? taskRecord.taskInstanceId ?? taskRecord.id ?? '').trim()
}

const formatStatusCurrency = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })

const formatStatusInvoiceDate = (value: string) => {
  if (!value) return '-'
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }).toUpperCase()
}

const getInvoiceStatusRfrValue = (rfr: InspectionInvoiceRfr | null) =>
  normalizeRfrText(rfr?.userName || rfr?.name || rfr?.id || rfr?.lookupKey || '-')

const buildInvoiceGuiDisplayResult = ({
  invoiceDate,
  invoiceId,
  paid,
  rfr,
  subtotal,
}: {
  invoiceDate: string
  invoiceId?: string | null
  paid?: boolean
  rfr: InspectionInvoiceRfr | null
  subtotal: number
}) => {
  const values = [
    `RFR:${getInvoiceStatusRfrValue(rfr)}`,
    formatStatusCurrency(subtotal),
    formatStatusInvoiceDate(invoiceDate),
    invoiceId || 'Not generated',
  ]

  if (paid) {
    values.push('Paid')
  }

  return `{${values.join(', ')}}`
}

const withPatchedTaskGuiDisplayResult = (
  value: unknown,
  taskId: string,
  guiDisplayResult: string,
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
      GUIDisplayResult: guiDisplayResult,
      ResultData: {
        GUIDisplayResult: guiDisplayResult,
      },
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

        const nextTasks = stageRecord.tasks.map((task) =>
          withPatchedTaskGuiDisplayResult(task, taskId, guiDisplayResult, statusDetails),
        )
        if (!nextTasks.some((task, index) => task !== stageRecord.tasks[index])) {
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

const findInspectionAssignmentTaskId = (applicant?: Applicant): string => {
  const stages = applicant?.stages ?? {}
  const inspectionStage =
    stages.inspection ??
    Object.entries(stages).find(([stageName]) => normalizeTaskText(stageName) === 'inspection')?.[1] ??
    Object.entries(stages).find(([stageName]) => normalizeTaskText(stageName).includes('inspection'))?.[1]

  const assignmentTask = inspectionStage?.tasks?.find((task) => {
    const taskRecord = task as Record<string, unknown>
    const taskName = normalizeTaskText(taskRecord.name ?? taskRecord.taskName ?? taskRecord.TaskName)
    const taskCategory = normalizeTaskText(taskRecord.taskCategory ?? taskRecord.TaskCategory)
    const taskType = normalizeTaskText(taskRecord.taskType ?? taskRecord.TaskType)

    return (
      taskName === 'assignment' &&
      taskCategory === TASK_CATEGORIES.ASSIGNMENT1 &&
      taskType === TASK_TYPES.ACTION
    )
  })

  return getRawTaskInstanceId(assignmentTask)
}

const findTaskById = (applicant: Applicant | undefined, taskId: string) => {
  if (!taskId) return null

  const tasks = Object.values(applicant?.stages ?? {}).flatMap((stage) => stage.tasks ?? [])
  return tasks.find((task) => getRawTaskInstanceId(task) === taskId) ?? null
}

const toSavedRfr = (rfr: InspectionInvoiceRfr | null): Partial<InspectionInvoiceRfr> | null =>
  rfr
    ? {
        id: rfr.id,
        name: rfr.name,
        lookupKey: rfr.lookupKey,
        assigneeValue: rfr.assigneeValue,
        email: rfr.email,
        userName: rfr.userName,
        state: rfr.state,
        region: rfr.region,
        coverage: rfr.coverage,
        fullName: rfr.fullName,
        isActive: rfr.isActive,
        status: rfr.status,
        pctOfTotalApps: rfr.pctOfTotalApps,
        pctOfTotalAppsAtWork: rfr.pctOfTotalAppsAtWork,
      }
    : null

const toRestoredRfr = (rfr: Partial<InspectionInvoiceRfr> | null | undefined): InspectionInvoiceRfr | null => {
  if (!rfr) return null

  const name = normalizeRfrText(rfr.name ?? rfr.fullName ?? rfr.userName ?? rfr.id)
  const lookupKey = normalizeRfrText(rfr.lookupKey ?? rfr.id ?? rfr.userName ?? name)
  const id = normalizeRfrText(rfr.id ?? rfr.assigneeValue ?? lookupKey)
  if (!name && !lookupKey && !id) return null

  return {
    id,
    name: name || id || lookupKey,
    lookupKey: lookupKey || id,
    assigneeValue: normalizeRfrText(rfr.assigneeValue ?? id ?? lookupKey),
    region: normalizeRfrText(rfr.region),
    coverage: normalizeRfrText(rfr.coverage),
    email: normalizeRfrText(rfr.email),
    userName: normalizeRfrText(rfr.userName ?? id),
    fullName: normalizeRfrText(rfr.fullName ?? name),
    state: normalizeRfrText(rfr.state),
    isActive: rfr.isActive !== false,
    status: rfr.status === 'inactive' ? 'inactive' : 'available',
    pctOfTotalApps: Number(rfr.pctOfTotalApps) || 0,
    pctOfTotalAppsAtWork: Number(rfr.pctOfTotalAppsAtWork) || 0,
  }
}

const isInvoiceStage = (value: unknown): value is InspectionInvoiceStage =>
  value === 'setup' ||
  value === 'configured' ||
  value === 'generated' ||
  value === 'outlook-opened' ||
  value === 'sent-captured' ||
  value === 'paid'

const buildInspectionInvoiceStatusDetails = (savedState: InspectionInvoiceSavedState) => ({
  savedState,
})

export function useInspectionInvoiceDrawerState({
  applicant,
  applicationId,
  applicationName,
  enabled = true,
  taskInstanceId,
  taskName,
}: {
  applicant?: Applicant
  applicationId?: string | number
  applicationName?: string
  enabled?: boolean
  taskInstanceId?: string | number
  taskName?: string
} = {}) {
  const { token, username } = useUser()
  const queryClient = useQueryClient()
  const {
    data: rfrLookupList = [],
    isError: isRfrListError,
    isLoading: isRfrListLoading,
  } = useUserListByRole('api/vSelectRFR', { enabled })
  const resolvedApplicationId = String(applicationId ?? applicant?.applicationId ?? '').trim()
  const {
    data: applicationDetail,
    isError: isApplicationDetailError,
    isLoading: isApplicationDetailLoading,
  } = useQuery({
    queryKey: applicationsQueryKeys.detail(resolvedApplicationId),
    queryFn: () =>
      fetchApplicationDetail({
        applicationId: resolvedApplicationId,
        token,
      }),
    enabled: enabled && Boolean(token) && Boolean(resolvedApplicationId),
  })

  const rfrs = useMemo(() => rfrLookupList.map(mapLookupRfr), [rfrLookupList])
  const [inspectionNeeded, setInspectionNeeded] = useState<boolean | null>(true)
  const [feeRequired, setFeeRequired] = useState<boolean | null>(true)
  const [awaitPayment, setAwaitPayment] = useState(true)
  const [selectedRfrId, setSelectedRfrId] = useState<string | null>(null)
  const [restoredRfr, setRestoredRfr] = useState<InspectionInvoiceRfr | null>(null)
  const [rfrSearch, setRfrSearch] = useState('')
  const [feeAmount, setFeeAmount] = useState('600.00')
  const [expenseAmount, setExpenseAmount] = useState('333.00')
  const [invoiceDate, setInvoiceDate] = useState(todayYmd())
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [invoiceDownloadLink, setInvoiceDownloadLink] = useState<string | null>(null)
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null)
  const [internalNotes, setInternalNotes] = useState('')
  const [noInspectionReason, setNoInspectionReason] = useState('')
  const [noFeeReason, setNoFeeReason] = useState('')
  const [recipient, setRecipient] = useState('')
  const [extraRecipientEmail, setExtraRecipientEmail] = useState('')
  const [letterTemplate, setLetterTemplate] = useState(INSPECTION_LETTER_TEMPLATE)
  const [stage, setStage] = useState<InspectionInvoiceStage>('setup')
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [paidAt, setPaidAt] = useState<string | null>(null)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const restoredTaskKeyRef = useRef('')

  const selectedRfr = useMemo(
    () =>
      rfrs.find((rfr) => rfr.lookupKey === selectedRfrId || rfr.id === selectedRfrId) ??
      (restoredRfr && (restoredRfr.lookupKey === selectedRfrId || restoredRfr.id === selectedRfrId)
        ? restoredRfr
        : null),
    [restoredRfr, rfrs, selectedRfrId],
  )

  const filteredRfrs = useMemo(() => {
    const query = rfrSearch.trim().toLowerCase()
    if (!query) return rfrs
    return rfrs.filter((rfr) =>
      [rfr.name, rfr.region, rfr.coverage, rfr.email, rfr.userName, rfr.fullName, rfr.state].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [rfrSearch, rfrs])
  const recipientOptions = useMemo(
    () =>
      (applicationDetail?.companyContacts ?? [])
        .map(mapCompanyContactToRecipientOption)
        .filter((option): option is InspectionInvoiceRecipientOption => Boolean(option)),
    [applicationDetail?.companyContacts],
  )
  const selectedRecipient = useMemo(
    () => recipientOptions.find((option) => option.value === recipient) ?? null,
    [recipient, recipientOptions],
  )

  useEffect(() => {
    const invoiceTaskId = String(taskInstanceId ?? '').trim()
    const restoreKey = `${invoiceTaskId}:${enabled ? 'open' : 'closed'}`
    if (!enabled || !invoiceTaskId || restoredTaskKeyRef.current === restoreKey) return

    const currentTask = findTaskById(applicant, invoiceTaskId)
    const savedState = getInspectionStatusSavedState<InspectionInvoiceSavedState>(
      (currentTask as any)?.StatusDetails ??
        (currentTask as any)?.statusDetails ??
        (currentTask as any)?.Result ??
        (currentTask as any)?.result,
    )
    restoredTaskKeyRef.current = restoreKey
    if (!savedState) return

    const setup = savedState.setup ?? {}
    const generate = savedState.generate ?? {}
    const email = savedState.email ?? {}
    const payment = savedState.payment ?? {}
    const nextRestoredRfr = toRestoredRfr(setup.rfr)
    const nextSelectedRfrId = normalizeRfrText(
      setup.selectedRfrId ?? nextRestoredRfr?.lookupKey ?? nextRestoredRfr?.id ?? '',
    )

    setInspectionNeeded(setup.inspectionNeeded ?? true)
    setFeeRequired(setup.feeRequired ?? true)
    setAwaitPayment(setup.awaitPayment ?? true)
    setSelectedRfrId(nextSelectedRfrId || null)
    setRestoredRfr(nextRestoredRfr)
    setFeeAmount(setup.feeAmount ?? '600.00')
    setExpenseAmount(setup.expenseAmount ?? '333.00')
    setInvoiceDate(setup.invoiceDate ?? todayYmd())
    setInternalNotes(setup.internalNotes ?? '')
    setNoInspectionReason(setup.noInspectionReason ?? '')
    setNoFeeReason(setup.noFeeReason ?? '')
    setRecipient(setup.recipient ?? (setup.recipientEmail ? 'ADD_NEW' : ''))
    setExtraRecipientEmail(setup.extraRecipientEmail ?? setup.recipientEmail ?? '')
    setLetterTemplate(setup.letterTemplate ?? INSPECTION_LETTER_TEMPLATE)
    setInvoiceId(generate.invoiceId ?? null)
    setInvoiceDownloadLink(generate.invoiceDownloadLink ?? null)
    setInvoicePdfUrl(generate.invoicePdfUrl ?? null)
    setSentAt(email.sent ? email.sentAt ?? 'Sent' : null)
    setPaidAt(payment.paid ? payment.paidAt ?? 'Paid' : null)

    const restoredStage =
      isInvoiceStage(savedState.stage)
        ? savedState.stage
        : payment.paid
          ? 'paid'
          : email.sent
            ? 'sent-captured'
            : generate.invoiceId
              ? 'generated'
              : 'configured'
    setStage(restoredStage)
  }, [applicant, enabled, taskInstanceId])

  useEffect(() => {
    if (recipient || recipientOptions.length === 0) return

    const primaryContact =
      recipientOptions.find((option) => option.type === 'Primary Contact') ?? recipientOptions[0]
    setRecipient(primaryContact.value)
  }, [recipient, recipientOptions])

  const fee = Number(feeAmount) || 0
  const expenses = Number(expenseAmount) || 0
  const subtotal = fee + expenses
  const isLocked = ['generated', 'outlook-opened', 'sent-captured', 'paid'].includes(stage)
  const isApplicationFeeOnly = letterTemplate === APPLICATION_FEE_LETTER_TEMPLATE
  const canGenerate =
    inspectionNeeded !== null &&
    (inspectionNeeded === false || Boolean(selectedRfrId)) &&
    feeRequired !== null &&
    (feeRequired === true ? fee > 0 : fee >= 0) &&
    Boolean(invoiceDate) &&
    (inspectionNeeded !== false || Boolean(noInspectionReason)) &&
    (feeRequired !== false || Boolean(noFeeReason))

  const updateSetupStage = (nextCanGenerate = canGenerate) => {
    if (isLocked) return
    setStage(nextCanGenerate ? 'configured' : 'setup')
  }

  const updateCachedInvoiceTaskResult = (taskId: string, guiDisplayResult: string, statusDetails?: unknown) => {
    queryClient.setQueriesData({ queryKey: applicationsQueryKeys.lists() }, (current) =>
      withPatchedTaskGuiDisplayResult(current, taskId, guiDisplayResult, statusDetails),
    )
    queryClient.setQueriesData({ queryKey: tasksQueryKeys.lists() }, (current) =>
      withPatchedTaskGuiDisplayResult(current, taskId, guiDisplayResult, statusDetails),
    )
  }

  const buildSavedState = ({
    nextAttachments,
    nextInvoiceDownloadLink = invoiceDownloadLink,
    nextInvoiceId = invoiceId,
    nextInvoicePdfUrl = invoicePdfUrl,
    nextPaidAt = paidAt,
    nextRecipientEmail,
    nextSentAt = sentAt,
    nextStage = stage,
    nextSubject,
    nextToUser,
  }: {
    nextAttachments?: string
    nextInvoiceDownloadLink?: string | null
    nextInvoiceId?: string | null
    nextInvoicePdfUrl?: string | null
    nextPaidAt?: string | null
    nextRecipientEmail?: string
    nextSentAt?: string | null
    nextStage?: InspectionInvoiceStage
    nextSubject?: string
    nextToUser?: string
  } = {}): InspectionInvoiceSavedState => ({
    version: 1,
    stage: nextStage,
    setup: {
      inspectionNeeded,
      feeRequired,
      awaitPayment,
      selectedRfrId,
      rfr: toSavedRfr(selectedRfr),
      feeAmount,
      expenseAmount,
      invoiceDate,
      internalNotes,
      noInspectionReason,
      noFeeReason,
      recipient,
      recipientEmail:
        nextRecipientEmail ??
        selectedRecipient?.email ??
        (recipient === 'ADD_NEW' ? extraRecipientEmail : recipient),
      extraRecipientEmail,
      letterTemplate,
    },
    generate: {
      invoiceId: nextInvoiceId,
      invoiceDownloadLink: nextInvoiceDownloadLink,
      invoicePdfUrl: nextInvoicePdfUrl,
      generatedAt: nextInvoiceId ? new Date().toISOString() : undefined,
    },
    email: {
      sent: Boolean(nextSentAt),
      sentAt: nextSentAt,
      toUser: nextToUser,
      subject: nextSubject,
      attachments: nextAttachments,
    },
    payment: {
      paid: Boolean(nextPaidAt),
      paidAt: nextPaidAt,
    },
  })

  const saveInvoiceTaskState = async ({
    nextInvoiceDate = invoiceDate,
    nextInvoiceDownloadLink = invoiceDownloadLink,
    nextInvoiceId = invoiceId,
    nextInvoicePdfUrl = invoicePdfUrl,
    nextPaid = stage === 'paid',
    nextPaidAt = paidAt,
    nextRfr = selectedRfr,
    nextSentAt = sentAt,
    nextStage = stage,
    nextSubtotal = subtotal,
    ...savedStateOptions
  }: {
    nextAttachments?: string
    nextInvoiceDate?: string
    nextInvoiceDownloadLink?: string | null
    nextInvoiceId?: string | null
    nextInvoicePdfUrl?: string | null
    nextPaid?: boolean
    nextPaidAt?: string | null
    nextRecipientEmail?: string
    nextRfr?: InspectionInvoiceRfr | null
    nextSentAt?: string | null
    nextStage?: InspectionInvoiceStage
    nextSubject?: string
    nextSubtotal?: number
    nextToUser?: string
  } = {}) => {
    const invoiceTaskId = String(taskInstanceId ?? '').trim()
    if (!invoiceTaskId) return null

    const guiDisplayResult = buildInvoiceGuiDisplayResult({
      invoiceDate: nextInvoiceDate,
      invoiceId: nextInvoiceId,
      paid: nextPaid,
      rfr: nextRfr,
      subtotal: nextSubtotal,
    })
    const statusDetails = buildInspectionInvoiceStatusDetails(
      buildSavedState({
        ...savedStateOptions,
        nextInvoiceDownloadLink,
        nextInvoiceId,
        nextInvoicePdfUrl,
        nextPaidAt,
        nextSentAt,
        nextStage,
      }),
    )

    updateCachedInvoiceTaskResult(invoiceTaskId, guiDisplayResult, statusDetails)
    await patchTaskResult({
      taskId: invoiceTaskId,
      result: statusDetails,
      guiDisplayResult,
      token,
    })

    return guiDisplayResult
  }

  const patchInvoiceTaskGuiDisplayResult = async ({
    nextInvoiceDate = invoiceDate,
    nextInvoiceId = invoiceId,
    nextPaid = false,
    nextRfr = selectedRfr,
    nextSubtotal = subtotal,
  }: {
    nextInvoiceDate?: string
    nextInvoiceId?: string | null
    nextPaid?: boolean
    nextRfr?: InspectionInvoiceRfr | null
    nextSubtotal?: number
  } = {}) => {
    const invoiceTaskId = String(taskInstanceId ?? '').trim()
    if (!invoiceTaskId) return null

    const guiDisplayResult = buildInvoiceGuiDisplayResult({
      invoiceDate: nextInvoiceDate,
      invoiceId: nextInvoiceId,
      paid: nextPaid,
      rfr: nextRfr,
      subtotal: nextSubtotal,
    })

    updateCachedInvoiceTaskResult(invoiceTaskId, guiDisplayResult)
    await patchTaskGuiDisplayResult({
      taskId: invoiceTaskId,
      result: guiDisplayResult,
      token,
    })

    return guiDisplayResult
  }

  const setInspection = (value: boolean) => {
    setInspectionNeeded(value)
    if (!value) {
      setSelectedRfrId(null)
      setFeeAmount('300.00')
      setExpenseAmount('0.00')
      setLetterTemplate(APPLICATION_FEE_LETTER_TEMPLATE)
      setAwaitPayment(false)
    } else {
      setLetterTemplate(INSPECTION_LETTER_TEMPLATE)
    }
    updateSetupStage()
  }

  const setFeeRequiredValue = (value: boolean) => {
    setFeeRequired(value)
    if (!value) {
      setFeeAmount('300.00')
      setExpenseAmount('0.00')
      setLetterTemplate(APPLICATION_FEE_LETTER_TEMPLATE)
      setAwaitPayment(false)
    } else {
      const rule = selectedRfr ? RFR_FEE_RULES[selectedRfr.region] : null
      setFeeAmount((rule?.fee ?? 600).toFixed(2))
      setExpenseAmount((rule?.expenses ?? 333).toFixed(2))
      setLetterTemplate(INSPECTION_LETTER_TEMPLATE)
    }
    updateSetupStage()
  }

  const pickRfr = async (rfr: InspectionInvoiceRfr) => {
    setSelectedRfrId(rfr.lookupKey)
    const rule = RFR_FEE_RULES[rfr.region]
    let nextFee = fee
    let nextExpenses = expenses

    if (rule && letterTemplate !== APPLICATION_FEE_LETTER_TEMPLATE) {
      setFeeAmount(rule.fee.toFixed(2))
      setExpenseAmount(rule.expenses.toFixed(2))
      nextFee = rule.fee
      nextExpenses = rule.expenses
    }
    updateSetupStage(true)

    await patchInvoiceTaskGuiDisplayResult({
      nextInvoiceId: null,
      nextRfr: rfr,
      nextSubtotal: nextFee + nextExpenses,
    })
  }

  const changeRfr = () => {
    if (isLocked) return
    setSelectedRfrId(null)
    setRfrSearch('')
  }

  const setRecipientValue = (value: string) => {
    setRecipient(value)
    if (value !== 'ADD_NEW') {
      setExtraRecipientEmail('')
    }
  }

  const generateInvoice = async () => {
    if (!canGenerate) return null
    setIsGeneratingInvoice(true)
    try {
      const result = await generateInspectionInvoice({
        payload: {
          applicationId,
          applicationName,
          TaskInstanceId: taskInstanceId ?? null,
          taskName,
          applicant: applicant
            ? {
                id: applicant.id,
                applicationId: applicant.applicationId,
                companyId: applicant.companyId,
                company: applicant.company,
                externalReferenceId: applicant.externalReferenceId,
                plant: applicant.plant,
                plantId: applicant.plantId,
                region: applicant.region,
              }
            : undefined,
          inspectionNeeded,
          feeRequired,
          awaitPayment,
          rfr: selectedRfr
            ? {
                id: selectedRfr.id,
                name: selectedRfr.name,
                email: selectedRfr.email,
                userName: selectedRfr.userName,
                state: selectedRfr.state,
                region: selectedRfr.region,
              }
            : null,
          fee,
          expense: expenses,
          invoiceDate,
          internalNotes,
          noInspectionReason,
          noFeeReason,
          recipient: selectedRecipient?.email ?? (recipient === 'ADD_NEW' ? extraRecipientEmail : recipient),
          letterTemplate,
        },
      })
      setInvoiceId(result.invoiceId)
      setInvoiceDownloadLink(result.downloadLink || null)
      setInvoicePdfUrl(result.invoicePdfUrl || null)
      setStage('generated')
      await saveInvoiceTaskState({
        nextInvoiceId: result.invoiceId,
        nextInvoiceDownloadLink: result.downloadLink || null,
        nextInvoicePdfUrl: result.invoicePdfUrl || null,
        nextStage: 'generated',
      })

      const assignmentTaskId = findInspectionAssignmentTaskId(applicant)
      if (!assignmentTaskId) {
        throw new Error('Invoice generated, but the Inspection Assignment task was not found.')
      }

      const rfrResultValue =
        selectedRfr?.userName || selectedRfr?.name || selectedRfr?.id || selectedRfr?.lookupKey || ''
      const assignmentStatusDetails = buildInspectionStatusDetails(`{RFR:${rfrResultValue}}`)

      await patchTaskResult({
        taskId: assignmentTaskId,
        result: assignmentStatusDetails,
        token,
      })

      if (!awaitPayment) {
        await confirmTask({
          taskId: assignmentTaskId,
          overwrite: '1',
          status: 'PENDING',
          result: '',
          includeCompletedBy: false,
          includeCompletionNotes: false,
          token,
        })
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])

      return result.invoiceId
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const openEmailPreview = () => {
    setShowEmailPreview(true)
    setStage('outlook-opened')
  }

  const sendEmail = async ({
    attachments,
    messageText,
    subject,
    toUser,
  }: {
    attachments?: string
    messageText: string
    subject: string
    toUser: string
  }) => {
    setIsSendingEmail(true)
    try {
      const email = buildHtmlEmailFromPlainText(messageText, {
        preheader: subject,
        title: 'OU Kosher Invoice',
      })

      await createApplicationMessage({
        payload: {
          MessageID: null,
          ApplicationID: applicationId ?? applicant?.applicationId ?? null,
          FromUser: username ?? null,
          ToUser: toUser,
          Subject: subject,
          MessageText: email.html,
          MessageTextPlain: email.text,
          PlainText: email.text,
          Text: email.text,
          MessageType: 'Email',
          Priority: 'NORMAL',
          SentDate: new Date().toISOString(),
          TemplateName: letterTemplate,
          TaskInstanceId: taskInstanceId ?? null,
          isPrivate: false,
          parentMessageId: null,
          toReply: null,
          isRead: false,
          tag: null,
          CCUser: null,
          BCCUser: 'productAutomation@ou.org',
          Attachments: attachments ?? null,
        },
        token,
      })
      const nextSentAt = new Date().toLocaleString()
      setSentAt(nextSentAt)
      setStage('sent-captured')
      setShowEmailPreview(false)
      await saveInvoiceTaskState({
        nextAttachments: attachments,
        nextRecipientEmail: toUser,
        nextSentAt,
        nextStage: 'sent-captured',
        nextSubject: subject,
        nextToUser: toUser,
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const markSent = () => {
    setSentAt(new Date().toLocaleString())
    setStage('sent-captured')
    setShowEmailPreview(false)
  }

  const markPaid = async () => {
    const invoiceTaskId = String(taskInstanceId ?? '').trim()
    if (!invoiceTaskId) {
      throw new Error('Invoice task instance id not found')
    }

    setIsMarkingPaid(true)
    try {
      await confirmTask({
        taskId: invoiceTaskId,
        result: 'Mark Paid',
        capacity: 'DESIGNATED',
        includeCompletedBy: false,
        includeCompletionNotes: false,
        token,
      })
      const nextPaidAt = new Date().toLocaleString()
      setPaidAt(nextPaidAt)
      setStage('paid')
      await saveInvoiceTaskState({
        nextInvoiceId: invoiceId,
        nextPaid: true,
        nextPaidAt,
        nextStage: 'paid',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const unlockForEdit = () => {
    setInvoiceId(null)
    setInvoiceDownloadLink(null)
    setInvoicePdfUrl(null)
    setSentAt(null)
    setPaidAt(null)
    setStage(canGenerate ? 'configured' : 'setup')
  }

  return {
    awaitPayment,
    canGenerate,
    expenseAmount,
    expenses,
    extraRecipientEmail,
    fee,
    feeAmount,
    feeRequired,
    filteredRfrs,
    inspectionNeeded,
    internalNotes,
    invoiceDate,
    invoiceDownloadLink,
    invoiceId,
    invoicePdfUrl,
    isApplicationFeeOnly,
    isLocked,
    isGeneratingInvoice,
    isApplicationDetailError,
    isApplicationDetailLoading,
    isMarkingPaid,
    isSendingEmail,
    isRfrListError,
    isRfrListLoading,
    letterTemplate,
    noFeeReason,
    noInspectionReason,
    paidAt,
    recipient,
    recipientOptions,
    rfrSearch,
    selectedRfr,
    selectedRecipient,
    sentAt,
    showEmailPreview,
    stage,
    subtotal,
    changeRfr,
    generateInvoice,
    markPaid,
    markSent,
    sendEmail,
    openEmailPreview,
    pickRfr,
    setAwaitPayment,
    setExpenseAmount,
    setExtraRecipientEmail,
    setFeeAmount,
    setFeeRequiredValue,
    setInspection,
    setInternalNotes,
    setInvoiceDate,
    setLetterTemplate,
    setNoFeeReason,
    setNoInspectionReason,
    setRecipient: setRecipientValue,
    setRfrSearch,
    setShowEmailPreview,
    unlockForEdit,
  }
}
