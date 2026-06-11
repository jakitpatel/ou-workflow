import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Maximize2,
  MessageSquare,
  Minimize2,
  Plus,
  Send,
  X,
} from 'lucide-react'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import {
  CANNED_NOTES,
  mapApplicationIngredientRow,
  mapKashIngredientRow,
  type ScheduleAIngredientFilter,
  type ScheduleAIngredientRow,
  type ScheduleAIngredientSortKey,
  type ScheduleAIngredientView,
  type ScheduleAIngredientDraft,
  getAssignedRoleValue,
  useCreateScheduleAIngredient,
  useScheduleAIngredients,
  useScheduleAScratchpad,
  useSendScheduleACommunicationEmail,
} from '@/features/applications/hooks/useScheduleAIngredients'
import type { AssignedRole } from '@/types/application'

type Props = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  visitId?: string | number | null
  assignedRoles?: AssignedRole[]
  taskInstanceId?: string | number | null
  taskName?: string
  onClose: () => void
}

type DrawerTab = 'ingredients' | 'comm' | 'eir' | 'signoff'

const CUSTOM_NOTE_VALUE = '__custom__'

const EMPTY_ADD_ROW_DRAFT: ScheduleAIngredientDraft = {
  rmc: '',
  name: '',
  source: '',
  brand: '',
  group: '',
  certifier: '',
  plantStatus: '',
}

const EIR_DOCUMENT_FILENAME = 'PIINSPECTN_14056484_Initial_Inspection_Aloha_Medicinals_001.pdf'
const EIR_PREVIEW_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827}.page{max-width:760px;margin:28px auto;background:white;min-height:920px;box-shadow:0 12px 30px rgba(15,23,42,.14);padding:52px}.meta{color:#6b7280;font-size:12px}.title{font-size:20px;font-weight:700;text-align:center;margin:18px 0 28px}.section{border-top:1px solid #d1d5db;padding-top:16px;margin-top:20px}.h{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#374151}.p{font-size:13px;line-height:1.55;color:#374151}.stamp{display:inline-block;border:1px solid #f59e0b;background:#fffbeb;color:#92400e;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:700}</style></head><body><div class="page"><p class="meta">OU Direct - Visit ID 14056484 - Apr 10, 2026</p><div class="title">Initial Inspection Report</div><p class="stamp">Sample EIR for demonstration</p><div class="section"><p class="h">Facility observations</p><p class="p">Line 1 was clean and no non-kosher equipment was observed. Dairy ingredients are stored in a designated separate area.</p></div><div class="section"><p class="h">Ingredient observations</p><p class="p">Palm Shortening, Rosemary Extract, and an unlabeled Dough Conditioner were observed on-site and were not present on the original Schedule A submission.</p></div><div class="section"><p class="h">Follow-up required</p><p class="p">Confirm LOCs and supplier details for missing or unclear ingredients before Schedule A can proceed.</p></div></div></body></html>`

const EIR_AI_FINDINGS = [
  '3 ingredients observed on-site were NOT listed on the original application: Palm Shortening, Rosemary Extract (Kemin Naturals), and an unlabeled Dough Conditioner - all must be added to Schedule A before certification can proceed.',
  'Whey Protein Concentrate drum had no visible kosher certification at time of inspection. Supplier and LOC must be confirmed.',
  'Natural Flavors: Givaudan drum identified on Line 1, but specific flavor code not confirmed. LOC cannot be verified without the code.',
  "Margarine listed generically as 'Cargill' on the application - RFR could not confirm the specific product. LOC required.",
  'Facility generally clean: no non-kosher equipment on Line 1, no recent switchovers, and dairy ingredients are stored in a designated separate area.',
]

const EIR_AI_INGREDIENTS = [
  { name: 'Wheat Flour', notes: 'Observed in production area', onScheduleA: true },
  { name: 'Canola Oil', notes: 'Matched to Schedule A', onScheduleA: true },
  { name: 'Margarine', notes: 'Cargill product observed - exact item unclear', onScheduleA: true },
  { name: 'Whey Protein Concentrate', notes: 'No visible certification on drum', onScheduleA: true },
  { name: 'Natural Flavors', notes: 'Givaudan drum observed - flavor code not confirmed', onScheduleA: true },
  { name: 'Palm Shortening', notes: 'Observed on Line 1 - NOT on original application', onScheduleA: false },
  { name: 'Rosemary Extract', notes: 'Kemin Naturals, used as antioxidant - NOT on original application', onScheduleA: false },
  { name: 'Dough Conditioner', notes: 'Unlabeled bag, origin unknown - NOT on original application', onScheduleA: false },
]

const EIR_AI_RECOMMENDATIONS = [
  'Add Palm Shortening to Schedule A - observed in production but missing from application. Supplier and kosher certification required.',
  'Add Rosemary Extract (Kemin Naturals) to Schedule A - antioxidant use observed on Line 1. Certification status unknown.',
  'Add Dough Conditioner to Schedule A - unlabeled bag of unknown origin observed. Company must identify supplier and obtain OU approval before continued use.',
  'Margarine: confirm specific Cargill product and obtain LOC before Schedule A can be finalized.',
  'Whey Protein Concentrate: confirm certified supplier and provide LOC - no certification was visible on drum during inspection.',
  'Natural Flavors: obtain Givaudan flavor code and verify LOC status.',
]

const textValue = (value: unknown) => String(value ?? '').trim()

const downloadTextFile = (filename: string, text: string, type = 'text/plain;charset=utf-8;') => {
  const blob = new Blob(['\uFEFF' + text], { type })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}

const primaryContact = (contacts?: Array<Record<string, unknown>>) => {
  const contact =
    contacts?.find((item) => textValue(item.type ?? item.Type).toLowerCase() === 'primary contact') ??
    contacts?.find((item) => textValue(item.IsPrimaryContact ?? item.isPrimaryContact).toLowerCase() === 'true') ??
    contacts?.[0]

  const first = textValue(contact?.FirstName ?? contact?.firstName ?? contact?.contactFirst)
  const last = textValue(contact?.LastName ?? contact?.lastName ?? contact?.contactLast)
  const name = textValue(contact?.name ?? contact?.Name) || [first, last].filter(Boolean).join(' ')
  const email = textValue(contact?.email ?? contact?.Email ?? contact?.EMail ?? contact?.contactEmail)

  return { name: name || 'Company Contact', email }
}

const statusClass = (status: string) => {
  const value = status.toLowerCase()
  if (value.includes('active') || value.includes('approved') || value.includes('submitted')) {
    return 'bg-green-100 text-green-700'
  }
  if (value.includes('hold') || value.includes('pending')) return 'bg-amber-100 text-amber-800'
  if (value.includes('reject') || value.includes('inactive')) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

const groupClass = (group: string) => {
  if (group === '1') return 'bg-green-100 text-green-700'
  if (group === '2') return 'bg-amber-100 text-amber-800'
  if (group === '3') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function ResolveButton({
  resolved,
  onClick,
}: {
  resolved: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={resolved ? 'Resolved - click to reopen' : 'Mark resolved / done'}
      aria-label={resolved ? 'Resolved - click to reopen' : 'Mark resolved / done'}
      onClick={onClick}
      className={
        resolved
          ? 'inline-flex h-7 w-7 items-center justify-center rounded bg-green-100 text-green-600 hover:bg-green-200'
          : 'inline-flex h-7 w-7 items-center justify-center rounded text-gray-300 hover:bg-green-50 hover:text-green-600'
      }
    >
      <Check className="h-4 w-4" strokeWidth={resolved ? 2.5 : 2} />
    </button>
  )
}

function FlagActionButton({
  flagged,
  onClick,
}: {
  flagged: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={flagged ? 'Unflag follow-up' : 'Flag for follow-up'}
      aria-label={flagged ? 'Unflag follow-up' : 'Flag for follow-up'}
      onClick={onClick}
      className={
        flagged
          ? 'inline-flex h-7 w-7 items-center justify-center rounded p-1 text-amber-500 hover:bg-amber-100'
          : 'inline-flex h-7 w-7 items-center justify-center rounded p-1 text-gray-300 hover:bg-amber-50 hover:text-amber-400'
      }
    >
      <Flag className="h-4 w-4" fill={flagged ? 'currentColor' : 'none'} />
    </button>
  )
}

function HalachaActionButton({
  open,
  onClick,
}: {
  open: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={open ? 'Open halachic review - click to resolve' : 'Flag for halachic review'}
      aria-label={open ? 'Open halachic review - click to resolve' : 'Flag for halachic review'}
      onClick={onClick}
      className={
        open
          ? 'ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-red-300 bg-red-100 text-red-600 hover:bg-red-200'
          : 'ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-transparent text-gray-300 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
      }
    >
      <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
    </button>
  )
}

function Pill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' }) {
  const classes = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[tone]}`}>{children}</span>
}

function SaMonogram() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current/40 bg-white/20 font-serif text-[11px] font-semibold leading-none">
      A
    </span>
  )
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc'
}) {
  const iconClass = 'h-3.5 w-3.5'
  if (!active) {
    return (
      <span title="Sort column" aria-label="Sort column" className="text-gray-400">
        <ArrowUpDown className={iconClass} aria-hidden="true" />
      </span>
    )
  }

  return (
    <span title={direction === 'asc' ? 'Sorted ascending' : 'Sorted descending'} aria-label={direction === 'asc' ? 'Sorted ascending' : 'Sorted descending'} className="text-blue-700">
      {direction === 'asc' ? <ArrowUp className={iconClass} aria-hidden="true" /> : <ArrowDown className={iconClass} aria-hidden="true" />}
    </span>
  )
}

const isCannedNote = (note: string) => CANNED_NOTES.includes(note as (typeof CANNED_NOTES)[number])

function CannedNoteRow({
  rowId,
  note,
  colSpan,
  customSelected,
  onCustomSelectedChange,
  onNoteChange,
}: {
  rowId: string
  note: string
  colSpan: number
  customSelected: boolean
  onCustomSelectedChange: (rowId: string, customSelected: boolean) => void
  onNoteChange: (rowId: string, note: string) => void
}) {
  const isCustom = customSelected || (note !== '' && !isCannedNote(note))
  const selectedValue = note === '' ? '' : isCustom ? CUSTOM_NOTE_VALUE : note

  const onCannedNoteChange = (value: string) => {
    if (value === CUSTOM_NOTE_VALUE) {
      onCustomSelectedChange(rowId, true)
      onNoteChange(rowId, isCannedNote(note) ? '' : note)
      return
    }

    onCustomSelectedChange(rowId, false)
    onNoteChange(rowId, value)
  }

  return (
    <tr className="border-b border-amber-100 bg-amber-50">
      <td colSpan={colSpan} className="px-4 pb-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <select
            className="rounded border border-amber-200 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-400"
            value={isCustom ? CUSTOM_NOTE_VALUE : selectedValue}
            onChange={(event) => onCannedNoteChange(event.target.value)}
          >
            <option value="" disabled>
              Select a request to the company...
            </option>
            {CANNED_NOTES.map((cannedNote) => (
              <option key={cannedNote} value={cannedNote}>
                {cannedNote}
              </option>
            ))}
            <option value={CUSTOM_NOTE_VALUE}>Custom...</option>
          </select>
          {isCustom ? (
            <input
              type="text"
              className="min-w-[200px] flex-1 rounded border border-amber-200 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-400"
              value={isCustom ? note : ''}
              placeholder="Type the custom request sent to the company..."
              onChange={(event) => onNoteChange(rowId, event.target.value)}
              autoFocus
            />
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function sortRows(rows: ScheduleAIngredientRow[], sortKey: ScheduleAIngredientSortKey, direction: 'asc' | 'desc') {
  const getter = (row: ScheduleAIngredientRow) => {
    if (sortKey === 'plantStatus') return row.status
    return row[sortKey] ?? ''
  }
  return [...rows].sort((a, b) => {
    const result = String(getter(a)).localeCompare(String(getter(b)), undefined, { numeric: true, sensitivity: 'base' })
    return direction === 'asc' ? result : -result
  })
}

function buildScheduleAHtml(rows: ScheduleAIngredientRow[], applicationName?: string, applicationId?: string | number) {
  const tableRows = rows
    .map(
      (row, index) =>
        `<tr><td>${index + 1}</td><td>${row.rmc}</td><td>${row.name}</td><td>${row.source}</td><td>${row.brand}</td><td>${row.group}</td><td>${row.certifier}</td><td>${row.status}</td></tr>`,
    )
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>Schedule A</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}.foot{margin-top:18px;color:#555}</style></head><body><h1>Schedule A Ingredients</h1><p>${applicationName ?? 'Application'} - App #${applicationId ?? ''}</p><table><thead><tr><th>#</th><th>RMC</th><th>Name</th><th>Source</th><th>Brand</th><th>Group</th><th>Certifier</th><th>Plant Status</th></tr></thead><tbody>${tableRows}</tbody></table><p class="foot">UKD IDs sourced from label data. Group 2 items require a certified source or LOC before Schedule A can be completed.</p></body></html>`
}

export function ScheduleAIngredientsDrawer({
  open,
  applicationId,
  applicationName,
  visitId,
  assignedRoles,
  taskInstanceId,
  taskName,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('ingredients')
  const [ingView, setIngView] = useState<ScheduleAIngredientView>('application')
  const [filter, setFilter] = useState<ScheduleAIngredientFilter>('all')
  const [sortKey, setSortKey] = useState<ScheduleAIngredientSortKey>('rmc')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expanded, setExpanded] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | number | null>(null)
  const [customNoteRows, setCustomNoteRows] = useState<Set<string>>(() => new Set())
  const [isAddingRow, setIsAddingRow] = useState(false)
  const [addRowDraft, setAddRowDraft] = useState<ScheduleAIngredientDraft>(EMPTY_ADD_ROW_DRAFT)
  const [addRowError, setAddRowError] = useState('')
  const [copied, setCopied] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [eirAiOpen, setEirAiOpen] = useState(true)
  const ingredientsHeaderRef = useRef<HTMLDivElement | null>(null)
  const ingredientsTableRef = useRef<HTMLTableElement | null>(null)

  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { data, isLoading, error } = useScheduleAIngredients(open ? resolvedApplicationId : undefined)
  const createIngredientMutation = useCreateScheduleAIngredient(resolvedApplicationId)
  const { data: applicationDetail } = useApplicationDetail(open ? resolvedApplicationId : undefined)
  const scratchpadApi = useScheduleAScratchpad(resolvedApplicationId)
  const { scratchpad } = scratchpadApi
  const assignedRfr = useMemo(() => getAssignedRoleValue(assignedRoles, 'RFR'), [assignedRoles])
  const eirSubmitterLabel = assignedRfr === 'Not yet Assigned' ? 'the assigned RFR' : assignedRfr
  const visitIdLabel = textValue(visitId)
  const sendRoundEmailMutation = useSendScheduleACommunicationEmail()

  const contact = useMemo(
    () => primaryContact(applicationDetail?.companyContacts as Array<Record<string, unknown>> | undefined),
    [applicationDetail?.companyContacts],
  )

  const applicationRows = useMemo(
    () => (data?.scheduleIngredients ?? []).map(mapApplicationIngredientRow),
    [data?.scheduleIngredients],
  )
  const kashRows = useMemo(() => (data?.kashIngredients ?? []).map(mapKashIngredientRow), [data?.kashIngredients])
  const activeRows = ingView === 'application' ? applicationRows : kashRows
  const allRows = useMemo(() => [...applicationRows, ...kashRows], [applicationRows, kashRows])
  const latestRound = scratchpad.rounds.at(-1)

  const counts = useMemo(() => {
    const resolvedIds = new Set(Object.keys(scratchpad.resolved).filter((id) => scratchpad.resolved[id]))
    scratchpad.rounds.forEach((round) => {
      round.items.forEach((item) => {
        if (item.resolved) resolvedIds.add(item.ingId)
      })
    })

    return activeRows.reduce(
      (acc, row) => {
        acc.all += 1
        if (scratchpad.flags[row.id]?.flagged) acc.flagged += 1
        if (resolvedIds.has(row.id)) acc.resolved += 1
        if (scratchpad.halacha[row.id]?.open) acc.halacha += 1
        return acc
      },
      { all: 0, flagged: 0, resolved: 0, halacha: 0 },
    )
  }, [activeRows, scratchpad])

  const visibleRows = useMemo(() => {
    const resolvedIds = new Set(Object.keys(scratchpad.resolved).filter((id) => scratchpad.resolved[id]))
    scratchpad.rounds.forEach((round) => {
      round.items.forEach((item) => {
        if (item.resolved) resolvedIds.add(item.ingId)
      })
    })

    const filtered = ingView === 'kashrus' ? activeRows : activeRows.filter((row) => {
      if (filter === 'flagged') return Boolean(scratchpad.flags[row.id]?.flagged)
      if (filter === 'resolved') return resolvedIds.has(row.id)
      if (filter === 'halacha') return Boolean(scratchpad.halacha[row.id]?.open)
      return true
    })

    return sortRows(filtered, sortKey, sortDirection)
  }, [activeRows, filter, ingView, scratchpad, sortDirection, sortKey])

  useEffect(() => {
    if (!open || activeTab !== 'ingredients') return

    const syncStickyTableHeader = () => {
      const headerHeight = ingredientsHeaderRef.current?.offsetHeight ?? 76
      ingredientsTableRef.current?.style.setProperty('--schedule-a-ing-header-height', `${headerHeight}px`)
    }

    syncStickyTableHeader()

    const headerElement = ingredientsHeaderRef.current
    const observer =
      typeof ResizeObserver === 'undefined' || !headerElement
        ? null
        : new ResizeObserver(syncStickyTableHeader)
    if (headerElement) observer?.observe(headerElement)
    window.addEventListener('resize', syncStickyTableHeader)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', syncStickyTableHeader)
    }
  }, [activeTab, ingView, open])

  if (!open) return null

  const setSort = (key: ScheduleAIngredientSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const setCustomNoteSelected = (rowId: string, selected: boolean) => {
    setCustomNoteRows((current) => {
      const next = new Set(current)
      if (selected) next.add(rowId)
      else next.delete(rowId)
      return next
    })
  }

  const updateAddRowDraft = (field: keyof ScheduleAIngredientDraft, value: string) => {
    setAddRowDraft((current) => ({ ...current, [field]: value }))
  }

  const startAddRow = () => {
    setIngView('application')
    setFilter('all')
    setIsAddingRow(true)
    setAddRowError('')
  }

  const cancelAddRow = () => {
    setIsAddingRow(false)
    setAddRowDraft(EMPTY_ADD_ROW_DRAFT)
    setAddRowError('')
  }

  const saveAddRow = async () => {
    if (!addRowDraft.name.trim()) {
      setAddRowError('Ingredient name is required before saving.')
      return
    }

    setAddRowError('')
    try {
      await createIngredientMutation.mutateAsync(addRowDraft)
      setIsAddingRow(false)
      setAddRowDraft(EMPTY_ADD_ROW_DRAFT)
    } catch (mutationError) {
      const message =
        mutationError && typeof mutationError === 'object' && 'message' in mutationError
          ? String((mutationError as { message?: unknown }).message)
          : 'Failed to add Schedule A ingredient.'
      setAddRowError(message)
    }
  }

  const generateRound = () => {
    const round = scratchpadApi.generateRound({
      rows: allRows,
      applicationName,
      recipientEmail: contact.email,
      recipientName: contact.name,
      taskInstanceId,
    })
    if (round) setActiveTab('comm')
  }

  const copyRoundEmail = async () => {
    if (!latestRound) return
    const text = `To: ${latestRound.email.to}\nSubject: ${latestRound.email.subject}\n\n${latestRound.email.body}`
    await navigator.clipboard?.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const sendRoundEmail = async () => {
    if (!latestRound) return

    const recipientEmail = textValue(latestRound.email.to || contact.email)
    if (!recipientEmail) {
      setSendError('Enter a recipient email before sending.')
      setSentMessage('')
      return
    }

    setSendError('')
    setSentMessage('')

    try {
      await sendRoundEmailMutation.mutateAsync({
        applicationId: resolvedApplicationId,
        taskInstanceId,
        recipientEmail,
        subject: latestRound.email.subject,
        body: latestRound.email.body,
      })
      scratchpadApi.updateRoundStatus(latestRound.id, 'awaiting')
      setSentMessage('Email sent and captured in application messages.')
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send email.')
    }
  }

  const downloadScheduleA = () => {
    const html = buildScheduleAHtml(kashRows, applicationName, resolvedApplicationId)
    const filename = `ScheduleA_${resolvedApplicationId ?? 'application'}.html`
    downloadTextFile(filename, html, 'text/html;charset=utf-8;')
  }

  const downloadEirDocument = () => {
    downloadTextFile(EIR_DOCUMENT_FILENAME.replace(/\.pdf$/i, '.html'), EIR_PREVIEW_HTML, 'text/html;charset=utf-8;')
  }

  const openEirDocument = () => {
    const blob = new Blob([EIR_PREVIEW_HTML], { type: 'text/html;charset=utf-8;' })
    const href = URL.createObjectURL(blob)
    window.open(href, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  const readyForSignoff = scratchpad.scheduleAReady && (scratchpad.eirReviewComplete || scratchpad.eirNotRequired)
  const panelWidth = expanded ? 'lg:max-w-[96vw]' : 'lg:max-w-[72vw]'
  const stickyTableHeaderClass =
    'sticky z-10 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-600 shadow-[inset_0_-1px_0_#e5e7eb]'
  const stickyTableHeaderStyle = { top: 'var(--schedule-a-ing-header-height, 76px)' }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
        <div
          className={`fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl ${panelWidth}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b bg-gray-800 px-4 py-3 text-white">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight">{applicationName || 'Schedule A Ingredients'}</h3>
              <p className="text-xs text-gray-300">
                App #{resolvedApplicationId ?? '-'} {taskName ? `- ${taskName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
                aria-label={expanded ? 'Collapse drawer' : 'Expand drawer'}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
                aria-label="Close Schedule A drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-gray-50">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedApplicationId(resolvedApplicationId ?? null)}
                    disabled={!resolvedApplicationId}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Application
                  </button>
                </div>

                <nav className="mt-3 -mb-1 flex gap-1 overflow-x-auto text-sm" aria-label="Drawer sections">
                  <div className="inline-flex shrink-0 items-stretch divide-x divide-gray-300 overflow-hidden rounded-md border border-gray-300 bg-white text-sm">
                    {(['application', 'kashrus'] as ScheduleAIngredientView[]).map((view) => {
                      const active = activeTab === 'ingredients' && ingView === view
                      return (
                        <button
                          key={view}
                          type="button"
                          onClick={() => {
                            setActiveTab('ingredients')
                            setIngView(view)
                            setFilter('all')
                            if (view === 'kashrus') cancelAddRow()
                          }}
                          className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${
                            active ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <SaMonogram />
                          {view === 'application' ? 'Application' : 'Kashrus'}
                        </button>
                      )
                    })}
                  </div>
                  {[
                    { id: 'comm', label: 'Communication' },
                    { id: 'eir', label: 'EIR' },
                    { id: 'signoff', label: 'Sign-off' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as DrawerTab)}
                      className={`shrink-0 rounded-md px-3 py-1.5 font-medium ${
                        activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-4">
                {activeTab === 'ingredients' ? (
                  <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div ref={ingredientsHeaderRef} className="sticky left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-b bg-gray-50 px-6 py-4 shadow-sm">
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {ingView === 'application' ? 'Application Ingredients' : 'Kashrus Ingredients'}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {ingView === 'application'
                          ? (['all', 'flagged', 'resolved', 'halacha'] as ScheduleAIngredientFilter[]).map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setFilter(item)}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  filter === item ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 ring-1 ring-gray-200'
                                }`}
                              >
                                {item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)} {counts[item]}
                              </button>
                            ))
                          : null}
                        <button
                          type="button"
                          onClick={downloadScheduleA}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                        {ingView === 'application' ? (
                          <button
                            type="button"
                            onClick={startAddRow}
                            disabled={isAddingRow || createIngredientMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Row
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isLoading ? <div className="p-6 text-sm text-gray-600">Loading ingredients...</div> : null}
                    {error ? (
                      <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Failed to load ingredients: {(error as Error).message}
                      </div>
                    ) : null}
                    {addRowError ? (
                      <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                        {addRowError}
                      </div>
                    ) : null}

                    <div className="overflow-visible">
                      <table ref={ingredientsTableRef} className={`w-full min-w-[980px] text-left text-sm ${ingView === 'kashrus' ? 'view-kashrus' : 'view-application'}`}>
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className={`w-8 ${stickyTableHeaderClass}`} style={stickyTableHeaderStyle}>#</th>
                            {[
                              ['rmc', 'RMC'],
                              ['name', 'Ingredient Name'],
                              ['source', 'Source'],
                              ['brand', 'Brand Name'],
                              ['group', 'Group'],
                              ['certifier', 'Certifier'],
                              ['plantStatus', 'Plant-Status'],
                            ].map(([key, label]) => (
                              <th
                                key={key}
                                className={`${stickyTableHeaderClass} ${
                                  key === 'plantStatus' && ingView === 'application' ? 'hidden' : ''
                                }`}
                                style={stickyTableHeaderStyle}
                              >
                                <button type="button" onClick={() => setSort(key as ScheduleAIngredientSortKey)} className="inline-flex items-center gap-1 hover:text-blue-700">
                                  {label}
                                  <SortIcon active={sortKey === key} direction={sortDirection} />
                                </button>
                              </th>
                            ))}
                            {ingView === 'application' ? <th className={`w-28 ${stickyTableHeaderClass}`} style={stickyTableHeaderStyle}>Actions</th> : null}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ingView === 'application' && isAddingRow ? (
                            <tr className="border-b border-blue-100 border-l-4 border-l-blue-400 bg-blue-50/60">
                              <td className="w-8 px-2 py-2 text-xs text-blue-400">+</td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.rmc}
                                  placeholder="RMC"
                                  onChange={(event) => updateAddRowDraft('rmc', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.name}
                                  placeholder="Ingredient name *"
                                  onChange={(event) => updateAddRowDraft('name', event.target.value)}
                                  autoFocus
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.source}
                                  placeholder="Source"
                                  onChange={(event) => updateAddRowDraft('source', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.brand}
                                  placeholder="Brand"
                                  onChange={(event) => updateAddRowDraft('brand', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.group}
                                  placeholder="Group"
                                  onChange={(event) => updateAddRowDraft('group', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.certifier}
                                  placeholder="Certifier"
                                  onChange={(event) => updateAddRowDraft('certifier', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    title="Save row"
                                    aria-label="Save row"
                                    onClick={saveAddRow}
                                    disabled={createIngredientMutation.isPending}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Cancel"
                                    aria-label="Cancel"
                                    onClick={cancelAddRow}
                                    disabled={createIngredientMutation.isPending}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                          {visibleRows.map((row, index) => {
                            const flagged = Boolean(scratchpad.flags[row.id]?.flagged)
                            const resolved = Boolean(scratchpad.resolved[row.id])
                            const halacha = scratchpad.halacha[row.id]
                            return (
                              <Fragment key={row.id}>
                              <tr
                                className={
                                  resolved
                                    ? 'bg-green-50 hover:bg-green-100'
                                    : halacha?.open
                                      ? 'bg-red-50 hover:bg-red-100'
                                      : flagged
                                        ? 'bg-amber-50/60 hover:bg-amber-100'
                                        : 'hover:bg-gray-50'
                                }
                              >
                                <td className="px-3 py-3 text-xs text-gray-500">{index + 1}</td>
                                <td className="px-3 py-3 font-mono text-xs text-gray-700">{row.rmc || '-'}</td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1.5 font-medium text-gray-900">
                                    <span className={halacha?.open && !resolved ? 'text-red-700' : ''}>{row.name || '-'}</span>
                                    {resolved ? (
                                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-700" title="Resolved">
                                        <Check className="h-3 w-3" strokeWidth={2.5} />
                                      </span>
                                    ) : null}
                                  </div>
                                  {halacha?.open && !resolved ? (
                                    <div className="mt-1 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                      <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                      <span>Halachic review</span>
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-3 py-3 text-gray-700">{row.source || '-'}</td>
                                <td className="px-3 py-3 text-gray-700">{row.brand || '-'}</td>
                                <td className="px-3 py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${groupClass(row.group)}`}>{row.group || '-'}</span>
                                </td>
                                <td className="px-3 py-3 text-gray-700">{row.certifier || row.ukd || '-'}</td>
                                {ingView === 'kashrus' ? (
                                  <td className="px-3 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}>{row.status || '-'}</span>
                                  </td>
                                ) : null}
                                {ingView === 'application' ? (
                                  <td className="px-3 py-3">
                                    <div className="flex flex-nowrap items-center gap-1">
                                      {resolved ? null : (
                                        <>
                                          <FlagActionButton flagged={flagged} onClick={() => scratchpadApi.toggleFlag(row.id)} />
                                          <HalachaActionButton open={Boolean(halacha?.open)} onClick={() => scratchpadApi.toggleHalacha(row.id)} />
                                        </>
                                      )}
                                      <ResolveButton resolved={resolved} onClick={() => scratchpadApi.toggleResolved(row.id)} />
                                    </div>
                                    {halacha?.open && !resolved ? (
                                      <input
                                        className="mt-2 h-8 w-full rounded border border-red-200 bg-white px-2 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-red-400"
                                        value={halacha.note ?? ''}
                                        placeholder="Halachic note (question, sources, conclusion)..."
                                        onChange={(event) => scratchpadApi.updateHalachaNote(row.id, event.target.value)}
                                      />
                                    ) : null}
                                  </td>
                                ) : null}
                              </tr>
                              {ingView === 'application' && flagged && !resolved ? (
                                <CannedNoteRow
                                  rowId={row.id}
                                  note={scratchpad.flags[row.id]?.note ?? ''}
                                  colSpan={8}
                                  customSelected={customNoteRows.has(row.id)}
                                  onCustomSelectedChange={setCustomNoteSelected}
                                  onNoteChange={scratchpadApi.updateFlagNote}
                                />
                              ) : null}
                              </Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t bg-gray-50 px-6 py-2 text-xs text-gray-400">
                      UKD IDs sourced from label data. Group 2 items require a certified source or LOC before Schedule A can be completed.
                    </div>
                  </div>
                ) : null}

                {activeTab === 'comm' ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b bg-gray-50 px-6 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-semibold text-gray-900">Company Communication</h2>
                          <p className="mt-0.5 text-sm text-gray-600">Resolve ingredient info by requesting clarification, LOCs, or source details from the company.</p>
                        </div>
                        <button type="button" onClick={() => setActiveTab('ingredients')} className="text-xs text-blue-600 hover:underline">
                          Back to Schedule A
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 border-b border-indigo-100 bg-indigo-50 px-6 py-2.5">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                      <p className="text-xs text-indigo-700">
                        <span className="font-semibold">Flag ingredients first.</span> Mark items that need follow-up in Schedule A. They will be bundled into the next round email.
                      </p>
                    </div>
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Company Communication</h3>
                        <Pill tone={scratchpad.rounds.length ? 'blue' : 'gray'}>
                          {scratchpad.rounds.length ? `${scratchpad.rounds.length} round${scratchpad.rounds.length === 1 ? '' : 's'}` : 'No rounds yet'}
                        </Pill>
                      </div>
                      <button
                        type="button"
                        onClick={generateRound}
                        disabled={!counts.flagged}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Generate Round {scratchpad.rounds.length + 1} Email
                      </button>
                    </div>

                    {latestRound ? (
                      <div className="px-6 pb-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-blue-800">Round {latestRound.roundNumber} email drafted</p>
                            <span className="text-xs text-blue-600">{latestRound.items.length} item{latestRound.items.length === 1 ? '' : 's'}</span>
                          </div>
                          <div className="mb-2 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-12 shrink-0 font-medium text-blue-500">To</span>
                              <span className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 font-mono text-blue-900">{latestRound.email.to || 'No contact email found'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-12 shrink-0 font-medium text-blue-500">Subject</span>
                              <span className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-blue-900">{latestRound.email.subject}</span>
                            </div>
                          </div>
                          <textarea
                            rows={8}
                            aria-label="Email draft body"
                            className="w-full resize-y rounded border border-blue-200 bg-white px-2 py-1.5 font-mono text-xs text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={latestRound.email.body}
                            onChange={(event) => scratchpadApi.updateRoundEmailBody(latestRound.id, event.target.value)}
                          />
                          {sendError ? <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{sendError}</div> : null}
                          {sentMessage ? <div className="mt-2 rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">{sentMessage}</div> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button type="button" onClick={copyRoundEmail} className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">
                              <Copy className="h-3.5 w-3.5" />
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                            <button type="button" onClick={() => void sendRoundEmail()} disabled={sendRoundEmailMutation.isPending} className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
                              <Send className="h-3.5 w-3.5" />
                              {sendRoundEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="border-t px-6 py-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Round History</h3>
                      {!scratchpad.rounds.length ? (
                        <p className="py-2 text-xs text-gray-400">No rounds generated yet. Flag ingredients with follow-up notes, then generate an email to the company.</p>
                      ) : (
                        <div className="space-y-3">
                          {[...scratchpad.rounds].reverse().map((round) => (
                            <div key={round.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">Round {round.roundNumber}</p>
                                  <p className="text-xs text-gray-500">{round.generatedDate}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Pill tone={round.status === 'reviewed' ? 'green' : round.status === 'responded' ? 'blue' : round.status === 'awaiting' ? 'amber' : 'gray'}>{round.status}</Pill>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {round.items.map((item) => (
                                  <div key={item.ingId} className="rounded border border-gray-100 bg-gray-50 p-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-600">{item.question}</p>
                                        {item.response ? <p className="mt-1 text-xs text-green-700">{item.response}</p> : null}
                                      </div>
                                      <div className="flex gap-1">
                                        <button type="button" onClick={() => scratchpadApi.resolveRoundItem(round.id, item.ingId)} className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">
                                          Resolve
                                        </button>
                                        <button type="button" onClick={() => scratchpadApi.requestRoundFollowup(round.id, item.ingId)} className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50">
                                          Another Round
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'eir' ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-2xl font-semibold text-gray-900">Inspection Report (EIR)</h2>

                    {!scratchpad.eirReceived && !scratchpad.eirNotRequired ? (
                      <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                        <p className="text-sm font-semibold text-red-800">Awaiting EIR Submission - NCRC will be notified on receipt to review and forward to the IA Manager</p>
                      </div>
                    ) : null}

                    {scratchpad.eirNotRequired ? (
                      <div className="mb-6 flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
                        <FileText className="h-5 w-5 shrink-0 text-gray-500" />
                        <p className="text-sm font-semibold text-gray-800">EIR marked not required for this application.</p>
                      </div>
                    ) : null}

                    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                          <span className="text-sm font-medium text-gray-600">Inspection Status</span>
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                            scratchpad.eirNotRequired
                              ? 'border-gray-200 bg-gray-100 text-gray-700'
                              : scratchpad.eirReviewComplete
                                ? 'border-green-200 bg-green-100 text-green-800'
                                : scratchpad.eirReceived
                                  ? 'border-blue-200 bg-blue-100 text-blue-800'
                                  : 'border-yellow-200 bg-yellow-100 text-yellow-800'
                          }`}>
                            {scratchpad.eirNotRequired ? 'Not Required' : scratchpad.eirReviewComplete ? 'Review Complete' : scratchpad.eirReceived ? 'Report Received' : 'Awaiting Report'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                          <span className="text-sm font-medium text-gray-600">RFR Assigned</span>
                          <span className="text-sm font-semibold text-gray-900">{assignedRfr}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                          <span className="text-sm font-medium text-gray-600">Visit ID</span>
                          <span className="font-mono text-sm font-semibold text-gray-900">{visitIdLabel}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 py-2">
                          <span className="text-sm font-medium text-gray-600">Inspection Date</span>
                          <span className="text-sm font-semibold text-gray-900">Apr 10, 2026</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium text-gray-600">Days Since Visit</span>
                          <span className={scratchpad.eirReceived || scratchpad.eirNotRequired ? 'text-sm font-semibold text-gray-900' : 'text-sm font-semibold text-red-600'}>
                            {scratchpad.eirReceived || scratchpad.eirNotRequired ? 'Report accounted for' : '6 days - overdue'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {scratchpad.eirReceived ? (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-8 w-8 shrink-0 text-red-400" strokeWidth={1.5} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{EIR_DOCUMENT_FILENAME}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                446 KB - Submitted via OU Direct - <span className="font-medium text-amber-700">Sample EIR for demonstration - actual submitted report would appear here</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={openEirDocument} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open in new tab
                            </button>
                            <button type="button" onClick={downloadEirDocument} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                          </div>
                        </div>
                        <iframe title="EIR PDF" className="h-[720px] w-full rounded-b-lg border-x border-b border-gray-200 bg-gray-100" srcDoc={EIR_PREVIEW_HTML} />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
                        <p className="text-sm text-gray-500">EIR document will appear here once {eirSubmitterLabel} submits via OU Direct</p>
                      </div>
                    )}

                    {scratchpad.eirReceived ? (
                      <div className="mt-5 overflow-hidden rounded-lg border border-violet-200 bg-violet-50/60">
                        <div className="flex items-center justify-between border-b border-violet-200 bg-violet-100/70 px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-violet-700">Claude - EIR summary</span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                              {EIR_AI_INGREDIENTS.filter((ingredient) => !ingredient.onScheduleA).length} not on Schedule A
                            </span>
                          </div>
                          <button type="button" onClick={() => setEirAiOpen((current) => !current)} className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900">
                            {eirAiOpen ? 'Collapse' : 'Expand'}
                            <ArrowUp className={`h-3.5 w-3.5 transition-transform ${eirAiOpen ? '' : 'rotate-180'}`} />
                          </button>
                        </div>
                        {eirAiOpen ? (
                          <div className="space-y-4 p-4">
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700">Key findings</p>
                              <ul className="space-y-1 text-sm text-gray-700">
                                {EIR_AI_FINDINGS.map((finding) => (
                                  <li key={finding} className="flex items-start gap-1.5">
                                    <span className="mt-0.5 shrink-0 text-amber-500">&gt;</span>
                                    <span>{finding}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700">Ingredients observed vs. Schedule A</p>
                              <div className="overflow-hidden rounded-lg border border-violet-200 bg-white">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-violet-50 text-left text-xs font-semibold text-violet-700">
                                      <th className="px-3 py-1.5">Ingredient</th>
                                      <th className="px-3 py-1.5">Notes</th>
                                      <th className="px-3 py-1.5">On Schedule A</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {EIR_AI_INGREDIENTS.map((ingredient) => (
                                      <tr key={ingredient.name} className={`border-b border-amber-100 last:border-0 ${ingredient.onScheduleA ? '' : 'bg-amber-50'}`}>
                                        <td className="px-3 py-1.5 font-medium text-gray-900">{ingredient.name}</td>
                                        <td className="px-3 py-1.5 text-gray-600">{ingredient.notes}</td>
                                        <td className="px-3 py-1.5">
                                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                            ingredient.onScheduleA
                                              ? 'border-green-200 bg-green-100 text-green-800'
                                              : 'border-red-200 bg-red-100 text-red-800'
                                          }`}>
                                            {ingredient.onScheduleA ? 'Yes' : 'No'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">Recommended actions</p>
                              <ul className="space-y-1 text-sm text-gray-700">
                                {EIR_AI_RECOMMENDATIONS.map((recommendation) => (
                                  <li key={recommendation} className="flex items-start gap-1.5">
                                    <span className="mt-0.5 shrink-0 text-red-500">&gt;</span>
                                    <span>{recommendation}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <p className="border-t border-violet-200 pt-1 text-[11px] text-violet-600/80">AI-generated from the inspection report. Review and confirm before acting - nothing here changes Schedule A automatically.</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {scratchpad.eirReceived && !scratchpad.eirReviewComplete ? (
                      <div className="mt-5 rounded-lg border border-purple-200 bg-purple-50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-purple-300 text-[10px] font-semibold text-purple-600">IA</span>
                          <p className="text-sm font-semibold text-purple-900">IA Manager - EIR Review</p>
                        </div>
                        <p className="mb-3 text-xs text-purple-800">The IA Manager reads the EIR and directs the IAR to update Schedule A. IAR executes on direction.</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={scratchpadApi.requestEirIngredientEntry} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50">
                            <Plus className="h-3.5 w-3.5" />
                            Request IAR add ingredient
                          </button>
                          <button type="button" onClick={scratchpadApi.markEirReviewComplete} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700">
                            <Check className="h-3.5 w-3.5" />
                            Mark EIR review complete
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                      {!scratchpad.eirReceived && !scratchpad.eirNotRequired ? (
                        <button type="button" onClick={scratchpadApi.markEirReceived} className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Simulate EIR received
                        </button>
                      ) : null}
                      {!scratchpad.eirReceived ? (
                        <button type="button" onClick={scratchpadApi.markEirNotRequired} className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Mark EIR not required
                        </button>
                      ) : null}
                      {scratchpad.eirNotRequired ? (
                        <button type="button" onClick={scratchpadApi.clearEirNotRequired} className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Clear not required
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'signoff' ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-gray-50 px-5 py-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Ingredients Sign-off</h2>
                        <p className="mt-1 text-sm text-gray-600">Schedule A is the deliverable for the Contract stage. Track readiness before it moves forward.</p>
                      </div>
                      <Pill tone={readyForSignoff ? 'blue' : 'amber'}>
                        {readyForSignoff ? 'Ready' : 'Not ready'}
                      </Pill>
                    </div>
                    <div className="space-y-5 p-5">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Schedule A readiness</p>
                            <p className="mt-1 text-xs text-gray-600">
                              {scratchpad.scheduleAReady
                                ? `Schedule A marked ready ${scratchpad.scheduleAReadyDate ?? ''} by ${scratchpad.scheduleAReadyBy ?? 'IAR'}.`
                                : 'IAR decides when the ingredient list is clean enough to hand to the IA Manager.'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!scratchpad.scheduleAReady ? (
                              <button type="button" onClick={() => scratchpadApi.markScheduleAReady('IAR')} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                                Mark Schedule A Ready
                              </button>
                            ) : (
                              <button type="button" onClick={scratchpadApi.reopenScheduleA} className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                Unmark
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {[
                          {
                            ok: scratchpad.scheduleAReady,
                            title: 'Schedule A marked ready by IAR',
                            detail: scratchpad.scheduleAReady ? `Marked ready ${scratchpad.scheduleAReadyDate ?? ''}` : 'Awaiting IAR readiness',
                          },
                          {
                            ok: scratchpad.eirReviewComplete || scratchpad.eirNotRequired,
                            title: 'EIR reviewed or marked not required',
                            detail: scratchpad.eirNotRequired
                              ? 'No EIR required'
                              : scratchpad.eirReviewComplete
                                ? 'EIR reviewed and reflected in Schedule A'
                                : 'Awaiting EIR review',
                          },
                        ].map((row) => (
                          <div key={row.title} className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 last:border-b-0">
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${row.ok ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Check className="h-3 w-3" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{row.title}</p>
                                <p className="text-xs text-gray-500">{row.detail}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Schedule A</p>
                          <p className="mt-1 text-xl font-semibold text-gray-900">{counts.all} <span className="text-xs font-normal text-gray-500">ingredients</span></p>
                          <p className="mt-0.5 text-xs text-gray-500">{counts.flagged} flagged</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">EIR</p>
                          <p className="mt-1 text-xl font-semibold text-gray-900">{scratchpad.eirNotRequired ? 'Not required' : scratchpad.eirReviewComplete ? 'Reviewed' : scratchpad.eirReceived ? 'In review' : 'Awaiting'}</p>
                          <p className="mt-0.5 text-xs text-gray-500">IA Manager review</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Communication</p>
                          <p className="mt-1 text-xl font-semibold text-gray-900">{scratchpad.rounds.length} <span className="text-xs font-normal text-gray-500">rounds</span></p>
                          <p className="mt-0.5 text-xs text-gray-500">{counts.flagged ? 'Open items remain' : 'All resolved'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ApplicationDetailsDrawer
        open={selectedApplicationId !== null}
        applicationId={selectedApplicationId ?? undefined}
        onClose={() => setSelectedApplicationId(null)}
      />
    </>
  )
}
