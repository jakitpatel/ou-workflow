import { useMemo, useState } from 'react'
import type { Applicant } from '@/types/application'

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
  region: string
  coverage: string
  email: string
  status: 'available' | 'busy'
}

const RFRS: InspectionInvoiceRfr[] = [
  {
    id: 'rs',
    name: 'Rabbi Randall Stone',
    region: 'NY/NJ',
    coverage: 'Bay Ridge, Brooklyn, Staten Island',
    email: 'stoner@ou.org',
    status: 'available',
  },
  {
    id: 'rf',
    name: 'Rabbi Yaakov Friedman',
    region: 'NY/NJ',
    coverage: 'Manhattan, Queens, Long Island',
    email: 'friedmany@ou.org',
    status: 'available',
  },
  {
    id: 'rr',
    name: 'Rabbi David Reznikov',
    region: 'Mexico',
    coverage: 'Mexico City, Guanajuato, Monterrey',
    email: 'reznikovd@ou.org',
    status: 'available',
  },
  {
    id: 'rk',
    name: 'Rabbi Shmuel Kosher Max',
    region: 'NJ/PA',
    coverage: 'Northern NJ, Eastern PA',
    email: 'kosherm@ou.org',
    status: 'busy',
  },
  {
    id: 'rg',
    name: 'Rabbi Moshe Greenfield',
    region: 'NY/NJ',
    coverage: 'Westchester, Rockland, Hudson Valley',
    email: 'greenfieldm@ou.org',
    status: 'available',
  },
  {
    id: 'rh',
    name: 'Rabbi Chaim Herbsman',
    region: 'CA',
    coverage: 'Los Angeles, Bay Area',
    email: 'herbsmanc@ou.org',
    status: 'available',
  },
]

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

export function useInspectionInvoiceDrawerState() {
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
    () => RFRS.find((rfr) => rfr.id === selectedRfrId) ?? null,
    [selectedRfrId],
  )

  const filteredRfrs = useMemo(() => {
    const query = rfrSearch.trim().toLowerCase()
    if (!query) return RFRS
    return RFRS.filter((rfr) =>
      [rfr.name, rfr.region, rfr.coverage, rfr.email].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [rfrSearch])

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
    setSelectedRfrId(rfr.id)
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
