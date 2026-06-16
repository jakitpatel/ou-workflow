import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
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
  Upload,
  X,
} from 'lucide-react'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import {
  CANNED_NOTES,
  fetchScheduleBEirDocumentBlob,
  getDaysSinceVisit,
  getScheduleBCommunicationMessageBody,
  mapApplicationProductRow,
  mapKashProductRow,
  resolveScheduleBDocumentUrl,
  type ScheduleBProductFilter,
  type ScheduleBProductRow,
  type ScheduleBProductSortKey,
  type ScheduleBProductView,
  type ScheduleBProductDraft,
  getAssignedRoleValue,
  useCreateScheduleBProduct,
  useScheduleBCommunicationMessages,
  useScheduleBEirDocument,
  useScheduleBProducts,
  useScheduleBScratchpad,
  useSendScheduleBCommunicationEmail,
} from '@/features/applications/hooks/useScheduleBProducts'
import { useConfirmTaskMutation } from '@/features/tasks/hooks/useTaskMutations'
import type { ApplicantAppVars, ApplicationEmail, AssignedRole } from '@/types/application'

type Props = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  visitId?: string | number | null
  appVars?: ApplicantAppVars | null
  assignedRoles?: AssignedRole[]
  taskInstanceId?: string | number | null
  taskName?: string
  mode?: 'drawer' | 'embedded'
  readOnly?: boolean
  onClose: () => void
}

type DrawerTab = 'products' | 'comm' | 'eir'

const CUSTOM_NOTE_VALUE = '__custom__'

const EMPTY_ADD_ROW_DRAFT: ScheduleBProductDraft = {
  labelNo: '',
  labelName: '',
  brand: '',
  labelCo: '',
  excl: '',
  use: '',
  bulk: '',
  list: '',
  symbol: '',
  internal: '',
  passover: '',
  upc: '',
  artwork: '',
}

const EIR_PREVIEW_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827}.page{max-width:760px;margin:28px auto;background:white;min-height:920px;box-shadow:0 12px 30px rgba(15,23,42,.14);padding:52px}.meta{color:#6b7280;font-size:12px}.title{font-size:20px;font-weight:700;text-align:center;margin:18px 0 28px}.section{border-top:1px solid #d1d5db;padding-top:16px;margin-top:20px}.h{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#374151}.p{font-size:13px;line-height:1.55;color:#374151}.stamp{display:inline-block;border:1px solid #f59e0b;background:#fffbeb;color:#92400e;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:700}</style></head><body><div class="page"><p class="meta">OU Direct - Visit ID 14056484 - Apr 10, 2026</p><div class="title">Initial Inspection Report</div><p class="stamp">Sample EIR for demonstration</p><div class="section"><p class="h">Facility observations</p><p class="p">Line 1 was clean and no non-kosher equipment was observed. Dairy products are stored in a designated separate area.</p></div><div class="section"><p class="h">Product observations</p><p class="p">Palm Shortening, Rosemary Extract, and an unlabeled Dough Conditioner were observed on-site and were not present on the original Schedule B submission.</p></div><div class="section"><p class="h">Follow-up required</p><p class="p">Confirm LOCs and supplier details for missing or unclear products before Schedule B can proceed.</p></div></div></body></html>`

const textValue = (value: unknown) => String(value ?? '').trim()

const formatDisplayDate = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getDocumentFilename = (value?: string | null) => {
  const trimmed = textValue(value)
  if (!trimmed) return 'Inspection report'
  const normalized = trimmed.replace(/\\/g, '/')
  return normalized.split('/').pop() || 'Inspection report'
}

const isPreviewableDocument = (value?: string | null) => {
  const filename = getDocumentFilename(value).toLowerCase()
  return ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.html', '.htm', '.doc', '.docx', '.rtf'].some((extension) =>
    filename.endsWith(extension),
  )
}

type ScheduleBRoundMessageCard = {
  email: ApplicationEmail
  replies: ApplicationEmail[]
  roundNumber: number
  subject: string
}

const getEmailMessageId = (email: ApplicationEmail) => textValue(email.MessageID)

const getEmailParentMessageId = (email: ApplicationEmail) => textValue(email.parentMessageId)

const getEmailPreviewText = (email: ApplicationEmail) =>
  getScheduleBCommunicationMessageBody(email)

const getRoundNumberFromSubject = (subject: string) => Number(subject.match(/round\s+(\d+)/i)?.[1] ?? 0)

const getRefMessageIdFromSubject = (subject: string) => textValue(subject.match(/refMsgId:\s*#?(\d+)/i)?.[1])

const formatMessageDate = (date?: string | null) => {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString()
}

const buildScheduleBRoundMessageCards = (emails: ApplicationEmail[]): ScheduleBRoundMessageCard[] => {
  const childrenByParentId = new Map<string, ApplicationEmail[]>()

  emails.forEach((email) => {
    const parentMessageId = getEmailParentMessageId(email)
    if (!parentMessageId || parentMessageId === '0') return

    const children = childrenByParentId.get(parentMessageId) ?? []
    children.push(email)
    childrenByParentId.set(parentMessageId, children)
  })

  const sortByMessageId = (a: ApplicationEmail, b: ApplicationEmail) =>
    Number(a.MessageID ?? 0) - Number(b.MessageID ?? 0)

  const collectReplies = (parentIds: string[], visited = new Set<string>()): ApplicationEmail[] =>
    parentIds.flatMap((parentId) => {
      if (!parentId || visited.has(parentId)) return []
      visited.add(parentId)

      return (childrenByParentId.get(parentId) ?? [])
        .sort(sortByMessageId)
        .flatMap((reply) => [reply, ...collectReplies([getEmailMessageId(reply)], visited)])
    })

  return emails
    .map((email): ScheduleBRoundMessageCard | null => {
      const subject = textValue(email.Subject)
      const roundNumber = getRoundNumberFromSubject(subject)
      const parentMessageId = getEmailParentMessageId(email)
      const isRootMessage = !parentMessageId || parentMessageId === '0'

      if (!isRootMessage || roundNumber <= 0 || !/ou schedule b/i.test(subject)) return null

      const replyParentIds = Array.from(new Set([getEmailMessageId(email), getRefMessageIdFromSubject(subject)].filter(Boolean)))

      return {
        email,
        replies: collectReplies(replyParentIds),
        roundNumber,
        subject,
      }
    })
    .filter((round): round is ScheduleBRoundMessageCard => Boolean(round))
    .sort((a, b) => b.roundNumber - a.roundNumber || Number(b.email.MessageID ?? 0) - Number(a.email.MessageID ?? 0))
}

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

function SbMonogram() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current/40 bg-white/20 font-serif text-[11px] font-semibold leading-none">
      B
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

function sortRows(rows: ScheduleBProductRow[], sortKey: ScheduleBProductSortKey, direction: 'asc' | 'desc') {
  const getter = (row: ScheduleBProductRow) => row[sortKey] ?? ''
  return [...rows].sort((a, b) => {
    const result = String(getter(a)).localeCompare(String(getter(b)), undefined, { numeric: true, sensitivity: 'base' })
    return direction === 'asc' ? result : -result
  })
}

const IMPORT_HEADER_TO_FIELD: Record<string, keyof ScheduleBProductDraft> = {
  brand: 'brand',
  bulk: 'bulk',
  bulkshipped: 'bulk',
  consumerindustrial: 'use',
  excl: 'excl',
  exclusive: 'excl',
  exclusiveyn: 'excl',
  internal: 'internal',
  internaluse: 'internal',
  labelco: 'labelCo',
  labelcompany: 'labelCo',
  labelname: 'labelName',
  labelno: 'labelNo',
  labelnumber: 'labelNo',
  list: 'list',
  listyun: 'list',
  passover: 'passover',
  productname: 'labelName',
  symbol: 'symbol',
  upc: 'upc',
}

const normalizeImportHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const parseDelimitedText = (text: string) => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return [] as string[][]

  const delimiter = normalized.includes('\t') ? '\t' : ','
  const rows: string[][] = []
  let currentValue = ''
  let currentRow: string[] = []
  let insideQuotes = false

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]
    const nextCharacter = normalized[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (!insideQuotes && character === delimiter) {
      currentRow.push(currentValue.trim())
      currentValue = ''
      continue
    }

    if (!insideQuotes && character === '\n') {
      currentRow.push(currentValue.trim())
      rows.push(currentRow)
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += character
  }

  currentRow.push(currentValue.trim())
  rows.push(currentRow)

  return rows.filter((row) => row.some((cell) => cell.trim() !== ''))
}

const sanitizeFilenamePart = (value: string) =>
  value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'application'

const getImportDraftsFromText = (text: string): ScheduleBProductDraft[] => {
  const rows = parseDelimitedText(text)
  if (rows.length < 2) return []

  const header = rows[0].map((value) => IMPORT_HEADER_TO_FIELD[normalizeImportHeader(value)] ?? null)

  return rows
    .slice(1)
    .map((row) => {
      const draft: ScheduleBProductDraft = { ...EMPTY_ADD_ROW_DRAFT }
      row.forEach((value, index) => {
        const field = header[index]
        if (field) draft[field] = value
      })
      return draft
    })
    .filter((draft) => Object.values(draft).some((value) => value.trim() !== ''))
}

const APPLICATION_COLUMNS: Array<{ key: ScheduleBProductSortKey; label: string; widthClass?: string }> = [
  { key: 'labelNo', label: 'Label #' },
  { key: 'labelName', label: 'Label Name' },
  { key: 'brand', label: 'Brand' },
  { key: 'labelCo', label: 'Label Company' },
  { key: 'excl', label: 'Excl?' },
  { key: 'use', label: 'Cons/Ind' },
  { key: 'bulk', label: 'Bulk' },
  { key: 'list', label: 'List' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'internal', label: 'Internal' },
  { key: 'passover', label: 'Passover' },
  { key: 'upc', label: 'UPC' },
  { key: 'artwork', label: 'Artwork' },
]

const KASHRUS_COLUMNS: Array<{ key: ScheduleBProductSortKey; label: string; widthClass?: string }> = [
  { key: 'labelName', label: 'Label Name' },
  { key: 'brand', label: 'Brand' },
  { key: 'labelCo', label: 'Label Company' },
  { key: 'typeLabel', label: 'Type' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'productDisplayId', label: 'Product ID' },
  { key: 'status', label: 'Status' },
]

const YES_NO_OPTIONS = [
  { value: '', label: '-' },
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
] as const

const USE_OPTIONS = [
  { value: '', label: '-' },
  { value: 'Consumer', label: 'Consumer' },
  { value: 'Industrial', label: 'Industrial' },
] as const

const LIST_OPTIONS = [
  { value: '', label: '-' },
  { value: 'Y', label: 'Y' },
  { value: 'U', label: 'U' },
  { value: 'N', label: 'N' },
] as const

export function ScheduleBProductsDrawer({
  open,
  applicationId,
  applicationName,
  visitId,
  appVars,
  assignedRoles,
  taskInstanceId,
  taskName,
  mode = 'drawer',
  readOnly = false,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('products')
  const [ingView, setIngView] = useState<ScheduleBProductView>('application')
  const [filter, setFilter] = useState<ScheduleBProductFilter>('all')
  const [sortKey, setSortKey] = useState<ScheduleBProductSortKey>('labelNo')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expanded, setExpanded] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | number | null>(null)
  const [customNoteRows, setCustomNoteRows] = useState<Set<string>>(() => new Set())
  const [isAddingRow, setIsAddingRow] = useState(false)
  const [addRowDraft, setAddRowDraft] = useState<ScheduleBProductDraft>(EMPTY_ADD_ROW_DRAFT)
  const [addRowError, setAddRowError] = useState('')
  const [copied, setCopied] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [isEirDownloadPending, setIsEirDownloadPending] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importFilename, setImportFilename] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const productsHeaderRef = useRef<HTMLDivElement | null>(null)
  const productsTableRef = useRef<HTMLTableElement | null>(null)
  const isEmbedded = mode === 'embedded'
  const isActive = isEmbedded || open

  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { token, username } = useUser()
  const { data, isLoading, error } = useScheduleBProducts(isActive ? resolvedApplicationId : undefined)
  const createProductMutation = useCreateScheduleBProduct(resolvedApplicationId)
  const completeScheduleBTaskMutation = useConfirmTaskMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => toast.error(message),
  })
  const { data: applicationDetail } = useApplicationDetail(isActive ? resolvedApplicationId : undefined)
  const scratchpadApi = useScheduleBScratchpad(resolvedApplicationId)
  const { scratchpad, buildScheduleBExportRows } = scratchpadApi
  const assignedRfr = useMemo(() => getAssignedRoleValue(assignedRoles, 'RFR'), [assignedRoles])
  const eirSubmitterLabel = assignedRfr === 'Not yet Assigned' ? 'the assigned RFR' : assignedRfr
  const visitIdLabel = textValue(visitId ?? appVars?.visit_id)
  const actualVisitDate = formatDisplayDate(appVars?.actual_visit_date)
  const daysSinceVisit = getDaysSinceVisit(appVars?.actual_visit_date)
  const eirWorkflowFileId = textValue(appVars?.wf_file_id)
  const eirDisplayName = textValue(appVars?.filename) || getDocumentFilename(appVars?.rfr_file_url)
  const eirDocumentPath = textValue(appVars?.rfr_file_url)
  const eirDocumentUrl = resolveScheduleBDocumentUrl(appVars?.rfr_file_url)
  const eirDocumentFilename = eirDisplayName
  const canPreviewEirDocument = isPreviewableDocument(appVars?.rfr_file_url)
  const hasWorkflowEirDocument = Boolean(eirWorkflowFileId && eirDisplayName)
  const effectiveEirNotRequired = scratchpad.eirNotRequired && !hasWorkflowEirDocument
  const effectiveEirReceived = hasWorkflowEirDocument || scratchpad.eirReceived
  const sendRoundEmailMutation = useSendScheduleBCommunicationEmail()
  const {
    data: backendRoundEmails = [],
    isLoading: isRoundHistoryLoading,
    error: roundHistoryError,
    refetch: refetchRoundHistory,
  } = useScheduleBCommunicationMessages({
    applicationId: isActive ? resolvedApplicationId : undefined,
    taskInstanceId,
  })
  const {
    objectUrl: eirViewerUrl,
    previewHtml: eirPreviewHtml,
    isLoading: isEirViewerLoading,
    error: eirViewerError,
  } = useScheduleBEirDocument({
    wfFileId: hasWorkflowEirDocument ? eirWorkflowFileId : undefined,
    filename: eirDocumentFilename,
    enabled: isActive && activeTab === 'eir' && hasWorkflowEirDocument,
  })

  const contact = useMemo(
    () => primaryContact(applicationDetail?.companyContacts as Array<Record<string, unknown>> | undefined),
    [applicationDetail?.companyContacts],
  )

  const applicationRows = useMemo(
    () => (data?.scheduleProducts ?? []).map(mapApplicationProductRow),
    [data?.scheduleProducts],
  )
  const kashRows = useMemo(() => (data?.kashProducts ?? []).map(mapKashProductRow), [data?.kashProducts])
  const activeRows = ingView === 'application' ? applicationRows : kashRows
  const allRows = useMemo(() => [...applicationRows, ...kashRows], [applicationRows, kashRows])
  const latestRound = scratchpad.rounds.at(-1)
  const roundMessageCards = useMemo(
    () => buildScheduleBRoundMessageCards(backendRoundEmails),
    [backendRoundEmails],
  )
  const nextRoundNumber = roundMessageCards.length + scratchpad.rounds.length + 1

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

  const currentColumns = ingView === 'application' ? APPLICATION_COLUMNS : KASHRUS_COLUMNS
  const noteColSpan = currentColumns.length + 2

  useEffect(() => {
    if (!isActive || activeTab !== 'products') return

    const syncStickyTableHeader = () => {
      const headerHeight = productsHeaderRef.current?.offsetHeight ?? 76
      productsTableRef.current?.style.setProperty('--schedule-b-ing-header-height', `${headerHeight}px`)
    }

    syncStickyTableHeader()

    const headerElement = productsHeaderRef.current
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
  }, [activeTab, ingView, isActive])

  const renderApplicationValue = (value: string) => value || <span className="text-red-400 text-xs italic">-</span>

  const renderKashrusStatus = (value: string) => (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(value)}`}>{value || '-'}</span>
  )

  if (!isActive) return null

  const setSort = (key: ScheduleBProductSortKey) => {
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

  const updateAddRowDraft = (field: keyof ScheduleBProductDraft, value: string) => {
    setAddRowDraft((current) => ({ ...current, [field]: value }))
  }

  const renderAddRowSelect = (
    field: keyof ScheduleBProductDraft,
    options: ReadonlyArray<{ value: string; label: string }>,
    minWidthClass = 'min-w-[72px]',
  ) => (
    <select
      className={`${minWidthClass} w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
      value={addRowDraft[field]}
      onChange={(event) => updateAddRowDraft(field, event.target.value)}
    >
      {options.map((option) => (
        <option key={`${field}-${option.label}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

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
    if (!addRowDraft.labelName.trim()) {
      setAddRowError('Label name is required before saving.')
      return
    }

    setAddRowError('')
    try {
      await createProductMutation.mutateAsync(addRowDraft)
      setIsAddingRow(false)
      setAddRowDraft(EMPTY_ADD_ROW_DRAFT)
    } catch (mutationError) {
      const message =
        mutationError && typeof mutationError === 'object' && 'message' in mutationError
          ? String((mutationError as { message?: unknown }).message)
          : 'Failed to add Schedule B product.'
      setAddRowError(message)
    }
  }

  const generateRound = () => {
    if (readOnly) return
    const round = scratchpadApi.generateRound({
      rows: allRows,
      applicationName,
      recipientEmail: contact.email,
      recipientName: contact.name,
      roundNumber: nextRoundNumber,
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
      scratchpadApi.removeRound(latestRound.id)
      setSentMessage('Email sent and captured in application messages.')
      await refetchRoundHistory()
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send email.')
    }
  }

  const exportRows = buildScheduleBExportRows(visibleRows)

  const scheduleBFilenameBase = (() => {
    const namePart = sanitizeFilenamePart(applicationName ?? '')
    const applicationPart = sanitizeFilenamePart(String(resolvedApplicationId ?? 'application'))
    return `ScheduleB_${namePart}_${applicationPart}`
  })()

  const downloadScheduleBCsv = () => {
    const csv = [exportRows.header, ...exportRows.data]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    downloadTextFile(`${scheduleBFilenameBase}.csv`, csv, 'text/csv;charset=utf-8;')
  }

  const exportScheduleBExcel = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><tr>${exportRows.header
      .map((header) => `<th>${header}</th>`)
      .join('')}</tr>${exportRows.data
      .map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}</tr>`)
      .join('')}</table></body></html>`

    downloadTextFile(`${scheduleBFilenameBase}.xls`, html, 'application/vnd.ms-excel;charset=utf-8;')
  }

  const openImportModal = () => {
    setIngView('application')
    setFilter('all')
    setImportError('')
    setImportOpen(true)
  }

  const closeImportModal = () => {
    if (isImporting) return
    setImportOpen(false)
    setImportError('')
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setImportText(text)
      setImportFilename(file.name)
      setImportError('')
    } catch {
      setImportError('Failed to read the selected file.')
    } finally {
      event.target.value = ''
    }
  }

  const importPreviewRows = (() => {
    try {
      return getImportDraftsFromText(importText)
    } catch {
      return []
    }
  })()

  const importProducts = async () => {
    const drafts = getImportDraftsFromText(importText).filter((draft) => draft.labelName.trim())
    if (!drafts.length) {
      setImportError('Provide a CSV or tab-delimited file with at least one row containing a Label Name.')
      return
    }

    setImportError('')
    setIsImporting(true)
    try {
      for (const draft of drafts) {
        await createProductMutation.mutateAsync(draft)
      }
      setImportOpen(false)
      setImportText('')
      setImportFilename('')
      toast.success(`Imported ${drafts.length} Schedule B product${drafts.length === 1 ? '' : 's'}.`)
    } catch (mutationError) {
      const message =
        mutationError && typeof mutationError === 'object' && 'message' in mutationError
          ? String((mutationError as { message?: unknown }).message)
          : 'Failed to import Schedule B products.'
      setImportError(message)
    } finally {
      setIsImporting(false)
    }
  }

  const downloadEirDocument = () => {
    if (hasWorkflowEirDocument) {
      setIsEirDownloadPending(true)
      void (async () => {
        try {
          const blob = await fetchScheduleBEirDocumentBlob({
            wfFileId: eirWorkflowFileId,
            token: token ?? undefined,
            download: true,
          })
          const href = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = href
          link.download = eirDocumentFilename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.setTimeout(() => URL.revokeObjectURL(href), 1000)
        } catch (downloadError) {
          toast.error(downloadError instanceof Error ? downloadError.message : 'Failed to download EIR document.')
        } finally {
          setIsEirDownloadPending(false)
        }
      })()
      return
    }

    if (eirDocumentUrl) {
      const link = document.createElement('a')
      link.href = eirDocumentUrl
      link.download = eirDocumentFilename
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    downloadTextFile(`${eirDocumentFilename}.html`, EIR_PREVIEW_HTML, 'text/html;charset=utf-8;')
  }

  const openEirDocument = () => {
    if (hasWorkflowEirDocument) {
      if (eirPreviewHtml) {
        const previewWindow = window.open('', '_blank', 'noopener,noreferrer')
        if (!previewWindow) {
          toast.error('Unable to open the document preview in a new tab.')
          return
        }
        previewWindow.document.open()
        previewWindow.document.write(eirPreviewHtml)
        previewWindow.document.close()
      } else if (eirViewerUrl) {
        window.open(eirViewerUrl, '_blank', 'noopener,noreferrer')
      } else if (isEirViewerLoading) {
        toast.message('Loading EIR document...')
      } else if (eirViewerError) {
        toast.error(eirViewerError instanceof Error ? eirViewerError.message : 'Failed to load EIR document.')
      }
      return
    }

    if (eirDocumentUrl) {
      window.open(eirDocumentUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const blob = new Blob([EIR_PREVIEW_HTML], { type: 'text/html;charset=utf-8;' })
    const href = URL.createObjectURL(blob)
    window.open(href, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  const markScheduleBReady = async () => {
    if (readOnly) return
    if (counts.resolved < counts.all) {
      toast.warning('All application products items are not resolved')
      return
    }

    const resolvedTaskInstanceId =
      taskInstanceId === undefined || taskInstanceId === null ? '' : String(taskInstanceId).trim()

    if (!resolvedTaskInstanceId) {
      toast.error('Task instance id not found')
      return
    }

    try {
      await completeScheduleBTaskMutation.mutateAsync({
        taskId: resolvedTaskInstanceId,
        applicationId: resolvedApplicationId,
        token: token ?? undefined,
        username: username ?? undefined,
        capacity: 'DESIGNATED',
        completionNotes: 'Task completed successfully',
        result: 'YES',
      })
      scratchpadApi.markScheduleBReady(username ?? 'IAR')
      toast.success('Schedule B marked ready')
    } catch {
      // useConfirmTaskMutation shows the API error through its onError handler.
    }
  }

  const panelWidth = expanded ? 'lg:max-w-[96vw]' : 'lg:max-w-[72vw]'
  const stickyTableHeaderClass =
    'sticky z-10 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-600 shadow-[inset_0_-1px_0_#e5e7eb]'
  const stickyTableHeaderStyle = { top: 'var(--schedule-b-ing-header-height, 76px)' }
  const content = (
    <div className="min-h-0 flex-1 bg-gray-50">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {!isEmbedded ? (
                    <button
                      type="button"
                      onClick={() => setSelectedApplicationId(resolvedApplicationId ?? null)}
                      disabled={!resolvedApplicationId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Application
                    </button>
                  ) : null}
                </div>

                <nav className="mt-3 -mb-1 flex gap-1 overflow-x-auto text-sm" aria-label="Drawer sections">
                  <div className="inline-flex shrink-0 items-stretch divide-x divide-gray-300 overflow-hidden rounded-md border border-gray-300 bg-white text-sm">
                    {(['application', 'kashrus'] as ScheduleBProductView[]).map((view) => {
                      const active = activeTab === 'products' && ingView === view
                      return (
                        <button
                          key={view}
                          type="button"
                          onClick={() => {
                            setActiveTab('products')
                            setIngView(view)
                            setFilter('all')
                            if (view === 'kashrus') cancelAddRow()
                          }}
                          className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${
                            active ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <SbMonogram />
                          {view === 'application' ? 'Application' : 'Kashrus'}
                        </button>
                      )
                    })}
                  </div>
                  {[
                    { id: 'comm', label: 'Communication' },
                    { id: 'eir', label: 'EIR' },
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
                {activeTab === 'products' ? (
                  <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div ref={productsHeaderRef} className="sticky left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-b bg-gray-50 px-6 py-4 shadow-sm">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900">
                          {ingView === 'application' ? 'Schedule B - Application' : 'Schedule B - Kashrus'}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {activeRows.length} {activeRows.length === 1 ? 'product' : 'products'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {ingView === 'application' && !readOnly ? (
                          !scratchpad.scheduleBReady ? (
                            <button type="button" onClick={markScheduleBReady} disabled={completeScheduleBTaskMutation.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                              <Check className="h-3.5 w-3.5" />
                              {completeScheduleBTaskMutation.isPending ? 'Marking Ready...' : 'Mark Schedule B Ready'}
                            </button>
                          ) : (
                            <button type="button" onClick={scratchpadApi.reopenScheduleB} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                              <X className="h-3.5 w-3.5" />
                              Unmark
                            </button>
                          )
                        ) : null}
                        {ingView === 'application'
                          ? (['all', 'flagged', 'resolved', 'halacha'] as ScheduleBProductFilter[]).map((item) => (
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
                        {ingView === 'application' ? (
                          <>
                            <button
                              type="button"
                              onClick={downloadScheduleBCsv}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              title="Download the scratchpad as CSV"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download CSV
                            </button>
                            <button
                              type="button"
                              onClick={exportScheduleBExcel}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              title="Export all fields to Excel for the Kashrus bulk import"
                            >
                              <FileText className="h-3.5 w-3.5 text-green-600" />
                              Export to Excel
                            </button>
                            {!readOnly ? (
                              <>
                                <button
                                  type="button"
                                  onClick={openImportModal}
                                  disabled={createProductMutation.isPending || isImporting}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                  title="Import rows from CSV or tab-delimited text"
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                  Import
                                </button>
                                <button
                                  type="button"
                                  onClick={startAddRow}
                                  disabled={isAddingRow || createProductMutation.isPending}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Row
                                </button>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>

                    {isLoading ? <div className="p-6 text-sm text-gray-600">Loading products...</div> : null}
                    {error ? (
                      <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Failed to load products: {(error as Error).message}
                      </div>
                    ) : null}
                    {addRowError ? (
                      <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                        {addRowError}
                      </div>
                    ) : null}

                    <div className="overflow-visible">
                      <table ref={productsTableRef} className={`w-full min-w-[1400px] text-left text-sm ${ingView === 'kashrus' ? 'view-kashrus' : 'view-application'}`}>
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className={`w-8 ${stickyTableHeaderClass}`} style={stickyTableHeaderStyle}>#</th>
                            {currentColumns.map(({ key, label, widthClass }) => (
                              <th
                                key={key}
                                className={`${stickyTableHeaderClass} ${widthClass ?? ''}`}
                                style={stickyTableHeaderStyle}
                              >
                                <button type="button" onClick={() => setSort(key as ScheduleBProductSortKey)} className="inline-flex items-center gap-1 hover:text-blue-700">
                                  {label}
                                  <SortIcon active={sortKey === key} direction={sortDirection} />
                                </button>
                              </th>
                            ))}
                            {ingView === 'application' && !readOnly ? <th className={`w-28 ${stickyTableHeaderClass}`} style={stickyTableHeaderStyle}>Actions</th> : null}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ingView === 'application' && isAddingRow && !readOnly ? (
                            <tr className="border-b border-blue-100 border-l-4 border-l-blue-400 bg-blue-50/60">
                              <td className="w-8 px-2 py-2 text-xs text-blue-400">+</td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.labelNo}
                                  placeholder="Label #"
                                  onChange={(event) => updateAddRowDraft('labelNo', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.labelName}
                                  placeholder="Label Name *"
                                  onChange={(event) => updateAddRowDraft('labelName', event.target.value)}
                                  autoFocus
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
                                  value={addRowDraft.labelCo}
                                  placeholder="Label Company"
                                  onChange={(event) => updateAddRowDraft('labelCo', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                {renderAddRowSelect('excl', YES_NO_OPTIONS)}
                              </td>
                              <td className="px-3 py-2">
                                {renderAddRowSelect('use', USE_OPTIONS, 'min-w-[110px]')}
                              </td>
                              <td className="px-3 py-2">
                                {renderAddRowSelect('bulk', YES_NO_OPTIONS)}
                              </td>
                              <td className="px-3 py-2">
                                {renderAddRowSelect('list', LIST_OPTIONS)}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.symbol}
                                  placeholder="Symbol"
                                  onChange={(event) => updateAddRowDraft('symbol', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                {renderAddRowSelect('internal', YES_NO_OPTIONS)}
                              </td>
                              <td className="px-3 py-2">
                                {renderAddRowSelect('passover', YES_NO_OPTIONS)}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  value={addRowDraft.upc}
                                  placeholder="UPC"
                                  onChange={(event) => updateAddRowDraft('upc', event.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-400">-</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    title="Save row"
                                    aria-label="Save row"
                                    onClick={saveAddRow}
                                    disabled={createProductMutation.isPending}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Cancel"
                                    aria-label="Cancel"
                                    onClick={cancelAddRow}
                                    disabled={createProductMutation.isPending}
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
                                {ingView === 'application' ? (
                                  <>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.labelNo)}</td>
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-1.5 font-medium text-gray-900">
                                        <span className={halacha?.open && !resolved ? 'text-red-700' : ''}>{row.labelName || '-'}</span>
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
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.brand)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.labelCo)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.excl)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.use)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.bulk)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.list)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.symbol)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.internal)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.passover)}</td>
                                    <td className="px-3 py-3 font-mono text-xs text-gray-700">{renderApplicationValue(row.upc)}</td>
                                    <td className="px-3 py-3 text-gray-700">{renderApplicationValue(row.artwork)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-3 font-medium text-gray-900">{row.labelName || '-'}</td>
                                    <td className="px-3 py-3 text-gray-700">{row.brand || '-'}</td>
                                    <td className="px-3 py-3 text-gray-700">{row.labelCo || '-'}</td>
                                    <td className="px-3 py-3 text-gray-700">{row.typeLabel || '-'}</td>
                                    <td className="px-3 py-3 text-gray-700">{row.symbol || '-'}</td>
                                    <td className="px-3 py-3 font-mono text-xs text-gray-700">{row.productDisplayId || '-'}</td>
                                    <td className="px-3 py-3">{renderKashrusStatus(row.status)}</td>
                                  </>
                                )}
                                  {ingView === 'application' && !readOnly ? (
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
                                  </td>
                                ) : null}
                              </tr>
                                {ingView === 'application' && flagged && !resolved && !readOnly ? (
                                  <CannedNoteRow
                                  rowId={row.id}
                                  note={scratchpad.flags[row.id]?.note ?? ''}
                                  colSpan={noteColSpan}
                                  customSelected={customNoteRows.has(row.id)}
                                  onCustomSelectedChange={setCustomNoteSelected}
                                  onNoteChange={scratchpadApi.updateFlagNote}
                                />
                              ) : null}
                              {ingView === 'application' && halacha?.open && !resolved ? (
                                <tr className="border-b border-red-100 bg-red-50">
                                  <td colSpan={noteColSpan} className="px-4 py-2">
                                    <div className="flex items-start gap-2">
                                      <div className="mt-0.5 shrink-0 text-red-600">
                                        <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                      </div>
                                      <div className="flex-1">
                                        <div className="mb-1">
                                          <span className="text-xs font-semibold uppercase tracking-wide text-red-800">Halachic review - RC / Rabbinic</span>
                                        </div>
                                        <textarea
                                          rows={2}
                                          className="w-full rounded border border-red-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-red-400"
                                          value={halacha.note ?? ''}
                                          placeholder="Halachic note (question, sources, conclusion)..."
                                          onChange={(event) => scratchpadApi.updateHalachaNote(row.id, event.target.value)}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                              </Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t bg-gray-50 px-6 py-2 text-xs text-gray-400">
                      {ingView === 'application'
                        ? 'Export includes every template field, including blanks, so the products dept can fill in what the customer missed.'
                        : 'Products that have been added into Kashrus appear here as the source of truth.'}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'comm' ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b bg-gray-50 px-6 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-semibold text-gray-900">Company Communication</h2>
                          <p className="mt-0.5 text-sm text-gray-600">Resolve product info by requesting clarification, LOCs, or source details from the company.</p>
                        </div>
                        <button type="button" onClick={() => setActiveTab('products')} className="text-xs text-blue-600 hover:underline">
                          Back to Schedule B
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 border-b border-indigo-100 bg-indigo-50 px-6 py-2.5">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                      <p className="text-xs text-indigo-700">
                        <span className="font-semibold">Flag products first.</span> Mark items that need follow-up in Schedule B. They will be bundled into the next round email.
                      </p>
                    </div>
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Company Communication</h3>
                        <Pill tone={scratchpad.rounds.length ? 'blue' : 'gray'}>
                          {roundMessageCards.length ? `${roundMessageCards.length} round${roundMessageCards.length === 1 ? '' : 's'}` : 'No rounds yet'}
                        </Pill>
                      </div>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={generateRound}
                          disabled={!counts.flagged || Boolean(latestRound)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Generate Round {nextRoundNumber} Email
                        </button>
                      ) : null}
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
                              <input
                                type="email"
                                aria-label="Email To"
                                className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 font-mono text-blue-900 outline-none focus:ring-1 focus:ring-blue-400"
                                value={latestRound.email.to}
                                placeholder="No contact email found"
                                onChange={(event) => scratchpadApi.updateRoundEmailTo(latestRound.id, event.target.value)}
                                readOnly={readOnly}
                              />
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
                            readOnly={readOnly}
                          />
                          {sendError ? <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{sendError}</div> : null}
                          {sentMessage ? <div className="mt-2 rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">{sentMessage}</div> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button type="button" onClick={copyRoundEmail} className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">
                              <Copy className="h-3.5 w-3.5" />
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                            {!readOnly ? (
                              <button type="button" onClick={() => void sendRoundEmail()} disabled={sendRoundEmailMutation.isPending} className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
                                <Send className="h-3.5 w-3.5" />
                                {sendRoundEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="border-t px-6 py-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Round History</h3>
                      {isRoundHistoryLoading ? (
                        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                          Loading rounds...
                        </p>
                      ) : null}
                      {roundHistoryError ? (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          Failed to load rounds: {roundHistoryError instanceof Error ? roundHistoryError.message : 'Unknown error'}
                        </p>
                      ) : null}
                      {!isRoundHistoryLoading && !roundHistoryError && !roundMessageCards.length ? (
                        <p className="py-2 text-xs text-gray-400">No round messages found yet. Flag products with follow-up notes, generate an email, and send it to capture round history.</p>
                      ) : null}
                      {roundMessageCards.length ? (
                        <div className="space-y-3">
                          {roundMessageCards.map((round) => {
                            const messageText = getEmailPreviewText(round.email)
                            const sentDate = formatMessageDate(round.email.SentDate)
                            const hasResponses = round.replies.length > 0

                            return (
                              <div key={round.email.MessageID ?? round.subject} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-900">Round {round.roundNumber}</p>
                                    <Pill tone={hasResponses ? 'green' : 'amber'}>{hasResponses ? 'Responded' : 'Awaiting Response'}</Pill>
                                  </div>
                                  <span className="text-xs text-gray-400">{sentDate ? `Sent ${sentDate}` : 'Sent date unavailable'}</span>
                                </div>
                                <div className="space-y-3 px-4 py-3">
                                  <div className="grid gap-1 text-xs text-gray-600 md:grid-cols-[70px_1fr]">
                                    <span className="font-medium text-gray-500">To</span>
                                    <span>{round.email.ToUser || '-'}</span>
                                    <span className="font-medium text-gray-500">Subject</span>
                                    <span className="break-words text-gray-900">{round.subject}</span>
                                  </div>
                                  {messageText ? (
                                    <div className="whitespace-pre-wrap break-words rounded-md bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
                                      {messageText}
                                    </div>
                                  ) : null}
                                  {round.replies.length ? (
                                    <div className="space-y-2 border-t border-gray-100 pt-3">
                                      {round.replies.map((reply) => {
                                        const replyText = getEmailPreviewText(reply)
                                        const replyDate = formatMessageDate(reply.SentDate)

                                        return (
                                          <div key={reply.MessageID ?? `${round.email.MessageID}-${reply.SentDate}`} className="rounded-md border border-green-100 bg-green-50/60 px-3 py-2">
                                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <Pill tone="green">Response</Pill>
                                                <span className="text-xs font-medium text-gray-700">From {reply.FromUser || '-'}</span>
                                              </div>
                                              <span className="text-xs text-gray-400">{replyDate ? `Received ${replyDate}` : 'Received date unavailable'}</span>
                                            </div>
                                            <div className="mb-1 grid gap-1 text-xs text-gray-600 md:grid-cols-[70px_1fr]">
                                              <span className="font-medium text-gray-500">To</span>
                                              <span>{reply.ToUser || '-'}</span>
                                              {reply.Subject ? (
                                                <>
                                                  <span className="font-medium text-gray-500">Subject</span>
                                                  <span className="break-words text-gray-900">{reply.Subject}</span>
                                                </>
                                              ) : null}
                                            </div>
                                            {replyText ? (
                                              <div className="whitespace-pre-wrap break-words rounded-md bg-white/80 px-3 py-2 text-xs leading-5 text-gray-600">
                                                {replyText}
                                              </div>
                                            ) : null}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'eir' ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-2xl font-semibold text-gray-900">Inspection Report (EIR)</h2>

                    {!effectiveEirReceived && !effectiveEirNotRequired ? (
                      <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                        <p className="text-sm font-semibold text-red-800">Awaiting EIR Submission - NCRC will be notified on receipt to review and forward to the IA Manager</p>
                      </div>
                    ) : null}

                    {effectiveEirNotRequired ? (
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
                            effectiveEirNotRequired
                              ? 'border-gray-200 bg-gray-100 text-gray-700'
                              : scratchpad.eirReviewComplete
                                ? 'border-green-200 bg-green-100 text-green-800'
                                : effectiveEirReceived
                                  ? 'border-blue-200 bg-blue-100 text-blue-800'
                                  : 'border-yellow-200 bg-yellow-100 text-yellow-800'
                          }`}>
                            {effectiveEirNotRequired ? 'Not Required' : scratchpad.eirReviewComplete ? 'Review Complete' : effectiveEirReceived ? 'Report Received' : 'Awaiting Report'}
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
                          <span className="text-sm font-semibold text-gray-900">{actualVisitDate || '-'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2">
                          <span className="text-sm font-medium text-gray-600">Reported Actual Visit Date</span>
                          <span className="text-right text-sm font-semibold text-gray-900">{actualVisitDate || '-'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4 py-2">
                          <span className="text-sm font-medium text-gray-600">RFR File URL (Name)</span>
                          <span className="max-w-[26rem] break-all text-right text-xs font-medium text-gray-700">
                            {eirDisplayName || '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-100 py-2">
                          <span className="text-sm font-medium text-gray-600">Days Since Visit</span>
                          <span className={effectiveEirReceived || effectiveEirNotRequired ? 'text-sm font-semibold text-gray-900' : 'text-sm font-semibold text-red-600'}>
                            {daysSinceVisit === null ? '-' : `${daysSinceVisit} day${daysSinceVisit === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {effectiveEirReceived ? (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-8 w-8 shrink-0 text-red-400" strokeWidth={1.5} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{eirDocumentFilename}</p>
                              <p className="mt-0.5 text-xs text-gray-500">Submitted via OU Direct</p>
                              {eirDocumentPath ? (
                                <p className="mt-1 break-all text-[11px] text-gray-500">{eirDocumentPath}</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={openEirDocument} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open in new tab
                            </button>
                            <button type="button" onClick={downloadEirDocument} disabled={isEirDownloadPending} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
                              <Download className="h-3.5 w-3.5" />
                              {isEirDownloadPending ? 'Downloading...' : 'Download'}
                            </button>
                          </div>
                        </div>
                        {hasWorkflowEirDocument ? (
                          isEirViewerLoading ? (
                            <div className="rounded-b-lg border-x border-b border-gray-200 bg-gray-50 p-8 text-center">
                              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
                              <p className="text-sm text-gray-600">Loading EIR document...</p>
                            </div>
                          ) : eirViewerError ? (
                            <div className="rounded-b-lg border-x border-b border-gray-200 bg-red-50 p-8 text-center">
                              <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-300" strokeWidth={1.5} />
                              <p className="text-sm text-red-700">
                                {eirViewerError instanceof Error ? eirViewerError.message : 'Failed to load EIR document.'}
                              </p>
                            </div>
                          ) : eirPreviewHtml ? (
                            <iframe title="EIR document preview" className="h-[720px] w-full rounded-b-lg border-x border-b border-gray-200 bg-white" srcDoc={eirPreviewHtml} />
                          ) : eirViewerUrl ? (
                            <iframe title="EIR document" className="h-[720px] w-full rounded-b-lg border-x border-b border-gray-200 bg-gray-100" src={eirViewerUrl} />
                          ) : (
                            <div className="rounded-b-lg border-x border-b border-gray-200 bg-gray-50 p-8 text-center">
                              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
                              <p className="text-sm text-gray-600">EIR document is not ready to preview yet.</p>
                            </div>
                          )
                        ) : eirDocumentUrl && canPreviewEirDocument ? (
                          <iframe title="EIR document" className="h-[720px] w-full rounded-b-lg border-x border-b border-gray-200 bg-gray-100" src={eirDocumentUrl} />
                        ) : eirDocumentUrl ? (
                          <div className="rounded-b-lg border-x border-b border-gray-200 bg-gray-50 p-8 text-center">
                            <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
                            <p className="text-sm text-gray-600">This file type could not be rendered directly in the viewer. Use the document actions above to open or download it.</p>
                          </div>
                        ) : (
                          <iframe title="EIR preview" className="h-[720px] w-full rounded-b-lg border-x border-b border-gray-200 bg-gray-100" srcDoc={EIR_PREVIEW_HTML} />
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
                        <p className="text-sm text-gray-500">EIR document will appear here once {eirSubmitterLabel} submits via OU Direct</p>
                      </div>
                    )}

                    {effectiveEirReceived && !scratchpad.eirReviewComplete && !readOnly ? (
                      <div className="mt-5 rounded-lg border border-purple-200 bg-purple-50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-purple-300 text-[10px] font-semibold text-purple-600">IA</span>
                          <p className="text-sm font-semibold text-purple-900">IA Manager - EIR Review</p>
                        </div>
                        <p className="mb-3 text-xs text-purple-800">The IA Manager reads the EIR and directs the IAR to update Schedule B. IAR executes on direction.</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={scratchpadApi.requestEirProductEntry} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50">
                            <Plus className="h-3.5 w-3.5" />
                            Request IAR add product
                          </button>
                          <button type="button" onClick={scratchpadApi.markEirReviewComplete} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700">
                            <Check className="h-3.5 w-3.5" />
                            Mark EIR review complete
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                      {effectiveEirNotRequired && !readOnly ? (
                        <button type="button" onClick={scratchpadApi.clearEirNotRequired} className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Clear not required
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

              </div>
            </div>
          </div>
  )

  return (
    <>
      {isEmbedded ? (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="shrink-0 border-b bg-gray-800 px-4 py-3 text-white">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight">{applicationName || 'Schedule B'}</h3>
              <p className="text-xs text-gray-300">App #{resolvedApplicationId ?? '-'}</p>
            </div>
          </div>
          {content}
        </div>
      ) : (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
          <div
            className={`fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl ${panelWidth}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b bg-gray-800 px-4 py-3 text-white">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold leading-tight">{applicationName || 'Schedule B Products'}</h3>
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
                  aria-label="Close Schedule B drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {content}
          </div>
        </div>
      )}
      {!isEmbedded && importOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={closeImportModal}>
          <div
            className="w-full max-w-3xl rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Import products</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Upload CSV or tab-delimited rows using the Schedule B Application columns from the demo export.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isImporting}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close import modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/60 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700">
                    <Upload className="h-4 w-4" />
                    Choose File
                    <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleImportFile} />
                  </label>
                  <span className="text-xs text-violet-800">
                    {importFilename || 'Accepted formats: .csv, .tsv, .txt'}
                  </span>
                </div>
                <p className="mt-3 text-xs text-violet-800">
                  Supported headers: Label Number, Label Name, Brand, Label Company, Exclusive (Y/N), Consumer/Industrial,
                  Bulk Shipped, List (Y/U/N), Symbol, Internal Use, Passover, UPC.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Paste Rows
                </label>
                <textarea
                  value={importText}
                  onChange={(event) => {
                    setImportText(event.target.value)
                    setImportError('')
                  }}
                  placeholder="Paste CSV or tab-delimited rows here..."
                  className="h-56 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-600">
                  Preview: <span className="font-semibold text-gray-900">{importPreviewRows.length}</span>{' '}
                  {importPreviewRows.length === 1 ? 'row' : 'rows'} ready to import
                </p>
                <p className="text-xs text-gray-500">Rows without a Label Name will be skipped.</p>
              </div>

              {importError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {importError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isImporting}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={importProducts}
                disabled={isImporting || !importPreviewRows.length}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importing...' : `Import ${importPreviewRows.length || ''}`.trim()}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {!isEmbedded ? (
        <ApplicationDetailsDrawer
          open={selectedApplicationId !== null}
          applicationId={selectedApplicationId ?? undefined}
          onClose={() => setSelectedApplicationId(null)}
        />
      ) : null}
    </>
  )
}
