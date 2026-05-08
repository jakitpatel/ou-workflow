import { useMemo, useState } from 'react'
import type { Applicant } from '@/types/application'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'

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
    isActive: item.isActive !== false,
    status: item.isActive === false ? 'inactive' : 'available',
    pctOfTotalApps: Number(item.pct_of_total_apps) || 0,
    pctOfTotalAppsAtWork: Number(item.pct_of_total_apps_at_work) || 0,
  }
}

export function useInspectionInvoiceDrawerState({ enabled = true }: { enabled?: boolean } = {}) {
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
  const [internalNotes, setInternalNotes] = useState('')
  const [noInspectionReason, setNoInspectionReason] = useState('')
  const [noFeeReason, setNoFeeReason] = useState('')
  const [recipient, setRecipient] = useState('')
  const [letterTemplate, setLetterTemplate] = useState('Initial Inspection Fee - New Plant')
  const [stage, setStage] = useState<InspectionInvoiceStage>('setup')
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [paidAt, setPaidAt] = useState<string | null>(null)

  const selectedRfr = useMemo(
    () => rfrs.find((rfr) => rfr.lookupKey === selectedRfrId || rfr.id === selectedRfrId) ?? null,
    [rfrs, selectedRfrId],
  )

  const filteredRfrs = useMemo(() => {
    const query = rfrSearch.trim().toLowerCase()
    if (!query) return rfrs
    return rfrs.filter((rfr) =>
      [rfr.name, rfr.region, rfr.coverage, rfr.email, rfr.userName, rfr.fullName].some((value) =>
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

  const generateInvoice = () => {
    if (!canGenerate) return null
    const year = new Date().getFullYear()
    const nextId = `INV-${year}-${String(Math.floor(Date.now() / 1000) % 10000).padStart(4, '0')}`
    setInvoiceId(nextId)
    setStage('generated')
    return nextId
  }

  const openEmailPreview = () => {
    setShowEmailPreview(true)
    setStage('outlook-opened')
  }

  const markSent = () => {
    setSentAt(new Date().toLocaleString())
    setStage('sent-captured')
    setShowEmailPreview(false)
  }

  const markPaid = () => {
    setPaidAt(new Date().toLocaleString())
    setStage('paid')
  }

  const unlockForEdit = () => {
    setInvoiceId(null)
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
    invoiceId,
    isApplicationFeeOnly,
    isLocked,
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
