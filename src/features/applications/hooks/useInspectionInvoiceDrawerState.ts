import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { generateInspectionInvoice, createApplicationMessage } from '@/features/applications/api'
import { useUser } from '@/context/UserContext'
import type { Applicant } from '@/types/application'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { confirmTask } from '@/features/tasks/api'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'

export type InspectionInvoiceStage =
  | 'setup'
  | 'configured'
  | 'generated'
  | 'outlook-opened'
  | 'sent-captured'
  | 'paid'

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
  String(applicant?.externalReferenceId ?? applicant?.applicationId ?? '').trim()

const normalizeRfrText = (value: unknown) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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

  const rfrs = useMemo(() => rfrLookupList.map(mapLookupRfr), [rfrLookupList])
  const [inspectionNeeded, setInspectionNeeded] = useState<boolean | null>(true)
  const [feeRequired, setFeeRequired] = useState<boolean | null>(true)
  const [awaitPayment, setAwaitPayment] = useState(true)
  const [selectedRfrId, setSelectedRfrId] = useState<string | null>(null)
  const [rfrSearch, setRfrSearch] = useState('')
  const [feeAmount, setFeeAmount] = useState('600.00')
  const [expenseAmount, setExpenseAmount] = useState('333.00')
  const [invoiceDate, setInvoiceDate] = useState(todayYmd())
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [invoiceDownloadLink, setInvoiceDownloadLink] = useState<string | null>(null)
  const [internalNotes, setInternalNotes] = useState('')
  const [noInspectionReason, setNoInspectionReason] = useState('')
  const [noFeeReason, setNoFeeReason] = useState('')
  const [recipient, setRecipient] = useState('')
  const [letterTemplate, setLetterTemplate] = useState('Initial Inspection Fee - New Plant')
  const [stage, setStage] = useState<InspectionInvoiceStage>('setup')
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [paidAt, setPaidAt] = useState<string | null>(null)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)

  const selectedRfr = useMemo(
    () => rfrs.find((rfr) => rfr.lookupKey === selectedRfrId || rfr.id === selectedRfrId) ?? null,
    [rfrs, selectedRfrId],
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

  const fee = Number(feeAmount) || 0
  const expenses = Number(expenseAmount) || 0
  const subtotal = fee + expenses
  const isLocked = ['generated', 'outlook-opened', 'sent-captured', 'paid'].includes(stage)
  const isApplicationFeeOnly = feeRequired === false
  const canGenerate =
    inspectionNeeded !== null &&
    (inspectionNeeded === false || Boolean(selectedRfrId)) &&
    feeRequired !== null &&
    fee > 0 &&
    Boolean(invoiceDate) &&
    (inspectionNeeded !== false || Boolean(noInspectionReason)) &&
    (feeRequired !== false || Boolean(noFeeReason))

  const updateSetupStage = (nextCanGenerate = canGenerate) => {
    if (isLocked) return
    setStage(nextCanGenerate ? 'configured' : 'setup')
  }

  const setInspection = (value: boolean) => {
    setInspectionNeeded(value)
    if (!value) {
      setSelectedRfrId(null)
    }
    updateSetupStage()
  }

  const setFeeRequiredValue = (value: boolean) => {
    setFeeRequired(value)
    if (!value) {
      setFeeAmount('300.00')
      setExpenseAmount('0.00')
      setAwaitPayment(false)
    }
    updateSetupStage()
  }

  const pickRfr = (rfr: InspectionInvoiceRfr) => {
    setSelectedRfrId(rfr.lookupKey)
    const rule = RFR_FEE_RULES[rfr.region]
    if (rule && feeRequired !== false) {
      setFeeAmount(rule.fee.toFixed(2))
      setExpenseAmount(rule.expenses.toFixed(2))
    }
    updateSetupStage(true)
  }

  const changeRfr = () => {
    if (isLocked) return
    setSelectedRfrId(null)
    setRfrSearch('')
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
          recipient,
          letterTemplate,
        },
      })
      setInvoiceId(result.invoiceId)
      setInvoiceDownloadLink(result.downloadLink || null)
      setStage('generated')

      const assignmentTaskId = findInspectionAssignmentTaskId(applicant)
      if (!assignmentTaskId) {
        throw new Error('Invoice generated, but the Inspection Assignment task was not found.')
      }

      const rfrResultValue =
        selectedRfr?.userName || selectedRfr?.name || selectedRfr?.id || selectedRfr?.lookupKey || ''

      await confirmTask({
        taskId: assignmentTaskId,
        overwrite: '1',
        ...(awaitPayment === false ? { status: 'PENDING' } : {}),
        result: `{RFR:${rfrResultValue}}`,
        includeCompletedBy: false,
        includeCompletionNotes: false,
        token,
      })
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
      await createApplicationMessage({
        payload: {
          MessageID: null,
          ApplicationID: applicationId ?? applicant?.applicationId ?? null,
          FromUser: username ?? null,
          ToUser: toUser,
          Subject: subject,
          MessageText: messageText,
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
      setSentAt(new Date().toLocaleString())
      setStage('sent-captured')
      setShowEmailPreview(false)
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
      setPaidAt(new Date().toLocaleString())
      setStage('paid')
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
    setSentAt(null)
    setPaidAt(null)
    setStage(canGenerate ? 'configured' : 'setup')
  }

  return {
    awaitPayment,
    canGenerate,
    expenseAmount,
    expenses,
    fee,
    feeAmount,
    feeRequired,
    filteredRfrs,
    inspectionNeeded,
    internalNotes,
    invoiceDate,
    invoiceDownloadLink,
    invoiceId,
    isApplicationFeeOnly,
    isLocked,
    isGeneratingInvoice,
    isMarkingPaid,
    isSendingEmail,
    isRfrListError,
    isRfrListLoading,
    letterTemplate,
    noFeeReason,
    noInspectionReason,
    paidAt,
    recipient,
    rfrSearch,
    selectedRfr,
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
    setFeeAmount,
    setFeeRequiredValue,
    setInspection,
    setInternalNotes,
    setInvoiceDate,
    setLetterTemplate,
    setNoFeeReason,
    setNoInspectionReason,
    setRecipient,
    setRfrSearch,
    setShowEmailPreview,
    unlockForEdit,
  }
}
