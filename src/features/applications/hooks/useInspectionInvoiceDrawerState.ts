import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useUser } from '@/context/UserContext'
import {
  createApplicationMessage,
  fetchApplicationDetail,
  generateInspectionInvoice,
  uploadApplicationFile,
} from '@/features/applications/api'
import { refreshApplicationInListCaches } from '@/features/applications/cache/applicationListCache'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import {
  buildInspectionStatusDetails,
  getInspectionStatusSavedState,
} from '@/features/applications/utils/inspectionStatusDetails'
import { confirmTask, patchTaskGuiDisplayResult, patchTaskResult } from '@/features/tasks/api'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { assertValidEmailRecipients } from '@/shared/email/addressValidation'
import {
  assertEmailAttachmentSize,
  assertKnownEmailAttachmentSize,
} from '@/shared/email/attachmentSizeValidation'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { Applicant, CompanyContact, CompanyContactGroups } from '@/types/application'

export type InspectionInvoiceStage =
  'setup' | 'configured' | 'generated' | 'outlook-opened' | 'sent-captured' | 'paid'

export const INSPECTION_LETTER_TEMPLATE = 'initial-inspection'
export const APPLICATION_FEE_LETTER_TEMPLATE = 'application-fee'
export const APPLICATION_FEE_DESCRIPTION =
  'Non-refundable fee to initiate OU Kosher certification review'
export const INITIAL_INSPECTION_FEE_DESCRIPTION =
  'Professional services - kosher certification initial inspection'

export type InspectionInvoiceEmailAttachment = {
  fileName: string
  fileUrl: string
  sizeBytes: number
}

const getUploadString = (response: unknown, keys: string[]) => {
  const root = response && typeof response === 'object' ? (response as Record<string, unknown>) : {}
  const data =
    root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root
  const attributes =
    data.attributes && typeof data.attributes === 'object'
      ? (data.attributes as Record<string, unknown>)
      : {}
  const source = { ...data, ...attributes }
  for (const key of keys) {
    const value = source[key]
    if (value != null && String(value).trim()) return String(value).trim()
  }
  return ''
}

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

export type InspectionInvoiceCustomer = {
  administrativeAssistantEmail: string
  administrativeAssistantName: string
  addressLines: string[]
  billingAddress: string
  billingCityStateZip: string
  billingContactName: string
  billingContactEmail: string
  cityStatePostalCountry: string
  coordinatorName: string
  coordinatorEmail: string
  coordinatorPhone: string
  streetAddress: string
}

export type PendingCompanyIntroLetterValues = {
  accountNumber: string
  administrativeAssistantEmail: string
  administrativeAssistantName: string
  cityStatePostalCountry: string
  companyName: string
  contactName: string
  coordinatorEmail: string
  coordinatorName: string
  coordinatorPhone: string
  plantLocation: string
  streetAddress: string
}

export const buildPendingCompanyIntroEmailBody = ({
  accountNumber,
  administrativeAssistantEmail,
  administrativeAssistantName,
  cityStatePostalCountry,
  companyName,
  contactName,
  coordinatorEmail,
  coordinatorName,
  coordinatorPhone,
  plantLocation,
  streetAddress,
}: PendingCompanyIntroLetterValues) => `Company Name: ${companyName || '-'}
Account Number: ${accountNumber || '-'}

${companyName || '-'} – ${plantLocation || '-'}
${streetAddress || '-'}
${cityStatePostalCountry || '-'}

Dear ${contactName || 'Customer'},

Thank you for applying for OU Kosher certification. We're glad to begin this partnership with you, and look forward to working together to help bring your products to more customers around the world.

What Happens Next

1. Set Up Your OU Direct Account. You’ll be receiving an email with the subject line “Welcome to OU Direct” with instructions on how to set up your account with a temporary password.

OU Direct is your online account with OU Kosher, and you can start using it to pay your invoice and search our millions of ingredient listings. Once you're certified, OU Direct is where you'll manage your kosher program. To receive your login, please reply to this letter or email your Account Manager below.

2. Pay your initial evaluation invoice. Your invoice for the initial evaluation is enclosed. The easiest and safest way to pay is online at oudirect.org (U.S. bank accounts only). You can also pay by wire transfer or ACH; our bank details are on the invoice. Please don't send a check by mail.

3. Schedule your inspection. Once we receive your payment, we'll contact you to arrange a date. An OU representative will visit your facility to carry out an Initial Inspection. If your company has more than one facility, each one needs its own visit.

4. We review your ingredients. Our Ingredients Department has already started reviewing your raw materials. Please make sure you have sent a Kosher Letter of Certification (LOC), or other required documents, for every ingredient. If anything is missing, we'll contact you and tell you exactly what we need.

Set Up Your OU Direct Account

We're Here to Help

The people below are your partners throughout this process. Please contact them at any time. No question is too small.

${coordinatorName || 'Rabbinic Coordinator'} — Rabbinic Coordinator / Account Manager
${[coordinatorEmail, coordinatorPhone].filter(Boolean).join(' | ') || '-'}

${administrativeAssistantName || 'Administrative Assistant'} — Administrative Assistant
${administrativeAssistantEmail || '-'}`

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

const normalizeCompanyContacts = (
  contacts?: CompanyContact[] | CompanyContactGroups,
): CompanyContact[] => {
  if (!contacts) return []
  if (Array.isArray(contacts)) return contacts

  return [
    ...(contacts.primaryContact ?? contacts.PrimaryContact ?? []),
    ...(contacts.billingContact ?? contacts.BillingContact ?? []),
    ...(contacts.otherContact ?? contacts.OtherContact ?? []),
  ]
}

const getContactBucket = (contact: CompanyContact): string | null => {
  const role = normalizeContactText(contact.role).toLowerCase()
  const type = normalizeContactText(contact.type).toLowerCase()
  const haystack = `${role} ${type}`

  if (type === 'primary contact' || role.includes('primary')) return 'Primary Contact'
  if (haystack.includes('billing') || haystack.includes('accounts payable'))
    return 'Billing Contact'
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
  return String(
    taskRecord.TaskInstanceId ?? taskRecord.taskInstanceId ?? taskRecord.id ?? '',
  ).trim()
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
  return new Date(year, month - 1, day)
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase()
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
    Object.entries(stages).find(
      ([stageName]) => normalizeTaskText(stageName) === 'inspection',
    )?.[1] ??
    Object.entries(stages).find(([stageName]) =>
      normalizeTaskText(stageName).includes('inspection'),
    )?.[1]

  const assignmentTask = inspectionStage?.tasks?.find((task) => {
    const taskRecord = task as Record<string, unknown>
    const taskName = normalizeTaskText(
      taskRecord.name ?? taskRecord.taskName ?? taskRecord.TaskName,
    )
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

const toRestoredRfr = (
  rfr: Partial<InspectionInvoiceRfr> | null | undefined,
): InspectionInvoiceRfr | null => {
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
  taskStatusDetails,
}: {
  applicant?: Applicant
  applicationId?: string | number
  applicationName?: string
  enabled?: boolean
  taskInstanceId?: string | number
  taskName?: string
  taskStatusDetails?: unknown
} = {}) {
  const { email: userEmail, token } = useUser()
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
  const [feeAmount, setFeeAmount] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
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
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailBcc, setEmailBcc] = useState('productAutomation@ou.org')
  const [showEmailCopies, setShowEmailCopies] = useState(false)
  const [emailBody, setEmailBody] = useState('')
  const [emailAttachments, setEmailAttachments] = useState<InspectionInvoiceEmailAttachment[]>([])
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [paidAt, setPaidAt] = useState<string | null>(null)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isUploadingEmailAttachment, setIsUploadingEmailAttachment] = useState(false)
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [isCompletingWithoutInspection, setIsCompletingWithoutInspection] = useState(false)
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
      [rfr.name, rfr.region, rfr.coverage, rfr.email, rfr.userName, rfr.fullName, rfr.state].some(
        (value) => value.toLowerCase().includes(query),
      ),
    )
  }, [rfrSearch, rfrs])
  const recipientOptions = useMemo(
    () =>
      normalizeCompanyContacts(applicationDetail?.companyContacts)
        .map(mapCompanyContactToRecipientOption)
        .filter((option): option is InspectionInvoiceRecipientOption => Boolean(option)),
    [applicationDetail?.companyContacts],
  )
  const selectedRecipient = useMemo(
    () => recipientOptions.find((option) => option.value === recipient) ?? null,
    [recipient, recipientOptions],
  )
  const invoiceCustomer = useMemo<InspectionInvoiceCustomer>(() => {
    const contacts = normalizeCompanyContacts(applicationDetail?.companyContacts)
    const billingContact =
      contacts.find((contact) =>
        /billing|accounts payable/i.test(`${contact.type} ${contact.role ?? ''}`),
      ) ??
      contacts.find((contact) => /primary/i.test(contact.type)) ??
      contacts[0]
    const address =
      applicationDetail?.companyAddresses?.find((item) => /billing/i.test(item.type)) ??
      applicationDetail?.companyAddresses?.[0]
    const normalizeAddressPart = (value: unknown) =>
      normalizeContactText(value).replace(/,\s*$/, '')
    const street1 = normalizeAddressPart(address?.street)
    const street2 = normalizeAddressPart(address?.line2)
    const street3 = normalizeAddressPart((address as any)?.line3)
    const remainingStreetLines = [street2, street3].filter(Boolean).join(' ')
    const billingAddress = [street1, remainingStreetLines].filter(Boolean).join(', ')
    const billingCityStateZip = [address?.city, address?.state, address?.zip]
      .map(normalizeAddressPart)
      .filter(Boolean)
      .join(', ')
    const designatedNcrc = applicationDetail?.DesignatedNCRC
    const designatedAdminNcrc = applicationDetail?.DesignatedAdminNCRC
    const formatDesignatedName = (contact: typeof designatedNcrc) =>
      [contact?.PREFIX, contact?.FIRST, contact?.MIDDLE, contact?.LAST]
        .map(normalizeContactText)
        .filter(Boolean)
        .join(' ')

    return {
      administrativeAssistantEmail: normalizeContactText(designatedAdminNcrc?.BusinessEmail),
      administrativeAssistantName: formatDesignatedName(designatedAdminNcrc),
      addressLines: [billingAddress, billingCityStateZip, address?.country].filter(
        (line): line is string => Boolean(line?.trim()),
      ),
      billingAddress,
      billingCityStateZip,
      billingContactName: billingContact?.name ?? '',
      billingContactEmail: billingContact?.email ?? '',
      cityStatePostalCountry: [address?.city, address?.state, address?.zip, address?.country]
        .filter(Boolean)
        .join(', '),
      coordinatorName: formatDesignatedName(designatedNcrc),
      coordinatorEmail: normalizeContactText(designatedNcrc?.BusinessEmail),
      coordinatorPhone: normalizeContactText(designatedNcrc?.BusinessPhone),
      streetAddress: [address?.street, address?.line2].filter(Boolean).join(', '),
    }
  }, [applicationDetail])

  useEffect(() => {
    const invoiceTaskId = String(taskInstanceId ?? '').trim()
    const explicitStatusDetailsKey =
      typeof taskStatusDetails === 'string'
        ? taskStatusDetails
        : taskStatusDetails
          ? JSON.stringify(taskStatusDetails)
          : ''
    const restoreIdentity = invoiceTaskId || resolvedApplicationId
    const restoreKey = `${restoreIdentity}:${explicitStatusDetailsKey}:${enabled ? 'open' : 'closed'}`
    if (!enabled || !restoreIdentity || restoredTaskKeyRef.current === restoreKey) return

    const currentTask = findTaskById(applicant, invoiceTaskId)
    const savedState = getInspectionStatusSavedState<InspectionInvoiceSavedState>(
      taskStatusDetails ??
        (currentTask as any)?.StatusDetails ??
        (currentTask as any)?.statusDetails ??
        (currentTask as any)?.Result ??
        (currentTask as any)?.result,
    )
    if (!savedState) return
    restoredTaskKeyRef.current = restoreKey

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
    setFeeAmount(setup.feeAmount ?? '')
    setExpenseAmount(setup.expenseAmount ?? '')
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
    setSentAt(email.sent ? (email.sentAt ?? 'Sent') : null)
    setPaidAt(payment.paid ? (payment.paidAt ?? 'Paid') : null)

    const restoredStage = isInvoiceStage(savedState.stage)
      ? savedState.stage
      : payment.paid
        ? 'paid'
        : email.sent
          ? 'sent-captured'
          : generate.invoiceId
            ? 'generated'
            : 'configured'
    setStage(restoredStage)
  }, [applicant, enabled, resolvedApplicationId, taskInstanceId, taskStatusDetails])

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
  const skipInvoiceWorkflow = inspectionNeeded === false && feeRequired === false
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

  const updateCachedInvoiceTaskResult = (
    taskId: string,
    guiDisplayResult: string,
    statusDetails?: unknown,
  ) => {
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
    nextGuiDisplayResult,
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
    nextGuiDisplayResult?: string
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

    const guiDisplayResult =
      nextGuiDisplayResult ??
      buildInvoiceGuiDisplayResult({
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
      setFeeAmount('')
      setExpenseAmount('')
      setLetterTemplate(APPLICATION_FEE_LETTER_TEMPLATE)
      setAwaitPayment(false)
    } else {
      setFeeAmount('')
      setExpenseAmount('')
      setLetterTemplate(INSPECTION_LETTER_TEMPLATE)
    }
    updateSetupStage()
  }

  const setFeeRequiredValue = (value: boolean) => {
    setFeeRequired(value)
    if (!value) {
      setFeeAmount('')
      setExpenseAmount('')
      setLetterTemplate(APPLICATION_FEE_LETTER_TEMPLATE)
      setAwaitPayment(false)
    } else {
      setFeeAmount('')
      setExpenseAmount('')
      setLetterTemplate(INSPECTION_LETTER_TEMPLATE)
    }
    updateSetupStage()
  }

  const pickRfr = async (rfr: InspectionInvoiceRfr) => {
    setSelectedRfrId(rfr.lookupKey)
    updateSetupStage(true)

    await patchInvoiceTaskGuiDisplayResult({
      nextInvoiceId: null,
      nextRfr: rfr,
      nextSubtotal: subtotal,
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
    if (fee <= 0) {
      throw new Error('Enter a fee greater than $0 before generating the invoice.')
    }
    if (!canGenerate) return null
    setIsGeneratingInvoice(true)
    try {
      const result = await generateInspectionInvoice({
        payload: {
          applicationId,
          applicationName,
          NCRC: applicationDetail?.DesignatedNCRC ?? null,
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
          invoiceType: 'inspection',
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
          recipient:
            selectedRecipient?.email ?? (recipient === 'ADD_NEW' ? extraRecipientEmail : recipient),
          letterTemplate,
          billing_address: invoiceCustomer.billingAddress,
          billing_city_state_zip: invoiceCustomer.billingCityStateZip,
          primary_contact: invoiceCustomer.billingContactName || '',
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
        selectedRfr?.userName ||
        selectedRfr?.name ||
        selectedRfr?.id ||
        selectedRfr?.lookupKey ||
        ''
      const assignmentStatusDetails = buildInspectionStatusDetails(`{RFR:${rfrResultValue}}`)

      await patchTaskResult({
        taskId: assignmentTaskId,
        result: assignmentStatusDetails,
        token,
      })

      if (!awaitPayment) {
        await confirmTask({
          taskId: assignmentTaskId,
          applicationId: resolvedApplicationId,
          overwrite: '1',
          status: 'PENDING',
          result: '',
          includeCompletedBy: false,
          includeCompletionNotes: false,
          token,
        })
      }
      await Promise.all([
        refreshApplicationInListCaches({
          applicationId: resolvedApplicationId,
          queryClient,
          token,
        })
          .then((refreshed) =>
            refreshed
              ? undefined
              : queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
          )
          .catch(() => queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])

      return result.invoiceId
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const openEmailPreview = ({ messageText, toUser }: { messageText: string; toUser: string }) => {
    setEmailTo(toUser)
    setEmailBody(messageText)
    setShowEmailPreview(true)
  }

  const uploadEmailAttachments = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files).filter((file) => file.size > 0)
    if (!selectedFiles.length) return
    if (!resolvedApplicationId)
      throw new Error('Application id is required before uploading an attachment.')

    const existingSize = emailAttachments.reduce((total, file) => total + file.sizeBytes, 0)
    const selectedSize = selectedFiles.reduce((total, file) => total + file.size, 0)
    assertKnownEmailAttachmentSize(existingSize + selectedSize)

    setIsUploadingEmailAttachment(true)
    try {
      const uploaded = await Promise.all(
        selectedFiles.map(async (file) => {
          const response = await uploadApplicationFile({
            applicationId: resolvedApplicationId,
            description: 'Inspection invoice email attachment',
            file,
            taskInstanceID: taskInstanceId ?? null,
            token,
          })
          const fileUrl = getUploadString(response, [
            'file_path',
            'FilePath',
            'filePath',
            'file_url',
            'fileUrl',
            'url',
            'downloadUrl',
            'Location',
          ])
          if (!fileUrl)
            throw new Error(`Upload completed but no file URL was returned for ${file.name}.`)
          return {
            fileName:
              getUploadString(response, ['FileName', 'fileName', 'filename', 'name']) || file.name,
            fileUrl,
            sizeBytes: file.size,
          }
        }),
      )
      setEmailAttachments((current) => [...current, ...uploaded])
    } finally {
      setIsUploadingEmailAttachment(false)
    }
  }

  const removeEmailAttachment = (index: number) => {
    setEmailAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const sendEmail = async ({
    attachments,
    bccUser,
    ccUser,
    messageText,
    subject,
    toUser,
  }: {
    attachments?: string
    bccUser?: string
    ccUser?: string
    messageText: string
    subject: string
    toUser: string
  }) => {
    assertValidEmailRecipients({ to: toUser, cc: ccUser, bcc: bccUser })
    setIsSendingEmail(true)
    try {
      await assertEmailAttachmentSize(attachments)

      const email = buildHtmlEmailFromPlainText(messageText, {
        preheader: subject,
        title: 'OU Kosher Invoice',
      })

      await createApplicationMessage({
        payload: {
          MessageID: null,
          ApplicationID: applicationId ?? applicant?.applicationId ?? null,
          FromUser: userEmail ?? null,
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
          CCUser: ccUser?.trim() || null,
          BCCUser: bccUser?.trim() || null,
          Attachments: attachments ?? null,
        },
        token,
      })
      const nextSentAt = new Date().toLocaleString()
      const nextStage: InspectionInvoiceStage = paidAt ? 'paid' : 'sent-captured'
      setSentAt(nextSentAt)
      setStage(nextStage)
      setShowEmailPreview(false)
      await saveInvoiceTaskState({
        nextAttachments: attachments,
        nextRecipientEmail: toUser,
        nextSentAt,
        nextStage,
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
        applicationId: resolvedApplicationId,
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
        refreshApplicationInListCaches({
          applicationId: resolvedApplicationId,
          queryClient,
          token,
        })
          .then((refreshed) =>
            refreshed
              ? undefined
              : queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
          )
          .catch(() => queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const completeWithoutInspection = async () => {
    const invoiceTaskId = String(taskInstanceId ?? '').trim()
    if (!invoiceTaskId) {
      throw new Error('Invoice task instance id not found')
    }
    if (!skipInvoiceWorkflow) {
      throw new Error('Inspection and inspection fee must both be set to No')
    }

    setIsCompletingWithoutInspection(true)
    try {
      // Persist the setup choices before completing the task so they can be restored later.
      await saveInvoiceTaskState({
        nextGuiDisplayResult: '{Inspection:No, Fee:No}',
        nextStage: 'configured',
      })
      await confirmTask({
        taskId: invoiceTaskId,
        applicationId: resolvedApplicationId,
        result: 'Inspection not needed',
        capacity: 'DESIGNATED',
        includeCompletedBy: false,
        includeCompletionNotes: false,
        token,
      })
      await Promise.all([
        refreshApplicationInListCaches({
          applicationId: resolvedApplicationId,
          queryClient,
          token,
        })
          .then((refreshed) =>
            refreshed
              ? undefined
              : queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
          )
          .catch(() => queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])
    } finally {
      setIsCompletingWithoutInspection(false)
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
    emailBody,
    emailAttachments,
    emailBcc,
    emailCc,
    emailTo,
    extraRecipientEmail,
    fee,
    feeAmount,
    feeRequired,
    filteredRfrs,
    inspectionNeeded,
    internalNotes,
    invoiceCustomer,
    invoiceDate,
    invoiceDownloadLink,
    invoiceId,
    invoicePdfUrl,
    isApplicationFeeOnly,
    isLocked,
    isGeneratingInvoice,
    isApplicationDetailError,
    isApplicationDetailLoading,
    isCompletingWithoutInspection,
    isMarkingPaid,
    isSendingEmail,
    isUploadingEmailAttachment,
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
    showEmailCopies,
    skipInvoiceWorkflow,
    stage,
    subtotal,
    changeRfr,
    completeWithoutInspection,
    generateInvoice,
    markPaid,
    markSent,
    sendEmail,
    uploadEmailAttachments,
    removeEmailAttachment,
    openEmailPreview,
    pickRfr,
    setAwaitPayment,
    setExpenseAmount,
    setEmailBody,
    setEmailBcc,
    setEmailCc,
    setEmailTo,
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
    setShowEmailCopies,
    unlockForEdit,
  }
}
