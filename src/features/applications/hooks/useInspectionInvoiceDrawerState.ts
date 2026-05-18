import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generateInspectionInvoice, createApplicationMessage, fetchApplicationDetail } from '@/features/applications/api'
import { useUser } from '@/context/UserContext'
import type { Applicant, CompanyContact } from '@/types/application'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { confirmTask, patchTaskResult } from '@/features/tasks/api'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
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

  const pickRfr = (rfr: InspectionInvoiceRfr) => {
    setSelectedRfrId(rfr.lookupKey)
    const rule = RFR_FEE_RULES[rfr.region]
    if (rule && letterTemplate !== APPLICATION_FEE_LETTER_TEMPLATE) {
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

      const assignmentTaskId = findInspectionAssignmentTaskId(applicant)
      if (!assignmentTaskId) {
        throw new Error('Invoice generated, but the Inspection Assignment task was not found.')
      }

      const rfrResultValue =
        selectedRfr?.userName || selectedRfr?.name || selectedRfr?.id || selectedRfr?.lookupKey || ''

      if (awaitPayment) {
        await patchTaskResult({
          taskId: assignmentTaskId,
          result: `{RFR:${rfrResultValue}}`,
          token,
        })
      } else {
        await confirmTask({
          taskId: assignmentTaskId,
          overwrite: '1',
          status: 'PENDING',
          result: `{RFR:${rfrResultValue}}`,
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
