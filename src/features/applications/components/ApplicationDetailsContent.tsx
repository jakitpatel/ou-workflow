import { useCallback, useEffect, useMemo, useState } from 'react'
import type React from 'react'
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Building,
  Users,
  Package,
  Beaker,
  Send,
  MessageSquare,
  AlertTriangle,
  Check,
  X,
  Shield,
  ClipboardList,
  Mail,
  Paperclip,
  Eye,
} from 'lucide-react'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { useTaskNotesDrawerState } from '@/features/tasks/notes/useTaskNotesDrawerState'
import Overview from '@/features/applications/components/application-management/Overview'
import CompanySection from '@/features/applications/components/application-management/CompanySection'
import ContactsSection from '@/features/applications/components/application-management/ContactsSection'
import PlantsSection from '@/features/applications/components/application-management/PlantsSection'
import ProductsTable from '@/features/applications/components/application-management/Products/ProductsTable'
import ActivityLog from '@/features/applications/components/application-management/ActivityLog'
import FilesList from '@/features/applications/components/application-management/FilesList'
import IngredientMgmt from '@/features/applications/components/application-management/Ingredients'
import RawApplicationPanel from '@/features/applications/components/application-management/RawApplicationPanel'
import QuoteInfo from '@/features/applications/components/application-management/QuoteInfo'
import TaskEventsPanel from '@/features/applications/components/application-management/TaskEventsPanel'
import { ScheduleAIngredientsDrawer } from '@/features/applications/components/ScheduleAIngredientsDrawer'
import { ScheduleBProductsDrawer } from '@/features/applications/components/ScheduleBProductsDrawer'
import { ContractStageDrawer } from '@/features/applications/components/ContractStageDrawer'
import type { ApplicationDetail, ApplicationEmail } from '@/types/application'

type CompletionStatus = 'incomplete' | 'complete' | 'dispatched'
type ActivityType = 'completion' | 'ingredient' | 'plant' | 'bulk' | 'company' | 'dispatch' | 'undo'
type ActivityStatus = 'approved' | 'pending' | 'completed'
type ApplicationDetailsMode = 'page' | 'drawer'

interface Activity {
  date: string
  action: string
  details: string
  user: string
  type: ActivityType
  status: ActivityStatus
}

interface Comment {
  id: number
  author: string
  date: string
  comment: string
  type: string
}

interface ValidationCheck {
  valid: boolean
  message: string
}

type Props = {
  application: ApplicationDetail
  mode?: ApplicationDetailsMode
  applicationId?: string | number
  showInterfaceLabel?: boolean
  dataSource?: 'application' | 'prelim'
}

const resolveApplicationId = (
  application: ApplicationDetail,
  applicationId?: string | number,
): number | null => {
  const candidates = [
    applicationId,
    application.applicationId,
    (application as any)?.ApplicationID,
    (application as any)?.ApplicationId,
    (application as any)?.appId,
    (application as any)?.id,
  ]

  for (const candidate of candidates) {
    const value = Number(candidate)
    if (Number.isFinite(value)) {
      return value
    }
  }

  return null
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'company', label: 'Company Details', icon: Building },
  { id: 'contacts', label: 'Company Contacts', icon: Users },
  { id: 'plants', label: 'Plants', icon: Building },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'ingredients', label: 'Ingredients', icon: Beaker },
  { id: 'raw-application', label: 'Raw Application', icon: FileText },
  { id: 'quote', label: 'Quote', icon: FileText },
  { id: 'activity', label: 'Recent Activity', icon: AlertCircle },
  { id: 'task-events', label: 'Task Events', icon: ClipboardList },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'files', label: 'File Management', icon: Upload },
  { id: 'notes', label: 'Messages', icon: MessageSquare },
] as const

const SCHEDULE_A_TAB = { id: 'schedule-a', label: 'Schedule A', icon: ClipboardList } as const
const SCHEDULE_B_TAB = { id: 'schedule-b', label: 'Schedule B', icon: Package } as const
const CONTRACT_TAB = { id: 'contract', label: 'Contract', icon: FileText } as const

const STATUS_BADGES: Record<string, string> = {
  'Not Started': 'bg-gray-100 text-gray-800',
  'Ready for Dispatch': 'bg-green-100 text-green-800',
  Dispatched: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-green-100 text-green-800',
  'Needs Review': 'bg-red-100 text-red-800',
}

const INITIAL_VALIDATION_CHECKS: Record<string, ValidationCheck> = {
  company: { valid: true, message: 'Company KC-2025-4829 verified in Kashrus DB' },
  plant: { valid: true, message: 'Plant PLT-KC-2025-4829-001 created and linked' },
  contacts: { valid: true, message: 'Primary contact John Mitchell designated for initial communication' },
  products: { valid: true, message: '4 products identified and categorized' },
  ingredients: { valid: true, message: '10 ingredients processed and validated' },
  quote: { valid: false, message: 'Quote not found - needs verification' },
  documentation: { valid: true, message: 'All required documents uploaded and processed' },
}

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 1,
    author: 'J. Mitchell',
    date: '2025-07-18 14:45',
    comment: 'Verified all ingredient certifications with suppliers. Coconut oil documentation updated.',
    type: 'internal',
  },
  {
    id: 2,
    author: 'G. Magder',
    date: '2025-07-18 13:20',
    comment: 'Plant contact information confirmed. John Mitchell will be primary for all communications.',
    type: 'internal',
  },
]

const INITIAL_ACTIVITY: Activity[] = [
  {
    date: '2025-07-18 14:30',
    action: 'Ingredient Added',
    details: 'Natural Vanilla Extract (Premium Flavor Co)',
    user: 'J. Mitchell',
    type: 'ingredient',
    status: 'approved',
  },
  {
    date: '2025-07-18 13:15',
    action: 'Ingredient Added',
    details: 'Organic Quinoa Flour (Andean Grains Ltd)',
    user: 'G. Magder',
    type: 'ingredient',
    status: 'pending',
  },
  {
    date: '2025-07-18 11:45',
    action: 'Supplier Sync',
    details: 'Coconut Oil (Refined) auto-added from supplier portal',
    user: 'Auto-Sync',
    type: 'ingredient',
    status: 'approved',
  },
  {
    date: '2025-07-18 09:20',
    action: 'Plant Updated',
    details: 'Manufacturing process description revised',
    user: 'J. Mitchell',
    type: 'plant',
    status: 'approved',
  },
  {
    date: '2025-07-17 16:45',
    action: 'Initial Import',
    details: '7 ingredients imported from application submission',
    user: 'System Import',
    type: 'bulk',
    status: 'approved',
  },
  {
    date: '2025-07-17 16:30',
    action: 'Company Created',
    details: 'Happy Cow Mills Inc. added to Kashrus DB (KC-2025-4829)',
    user: 'System',
    type: 'company',
    status: 'approved',
  },
]

const getStatusBadge = (status: string | number): string =>
  STATUS_BADGES[String(status)] || STATUS_BADGES['Not Started']

const getCurrentTimestamp = (): string => new Date().toISOString().slice(0, 16).replace('T', ' ')

const formatEmailDate = (value?: string | null) => {
  if (!value) return '-'
  const normalizedValue = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const isHtmlEmail = (value?: string | null) => /<\/?[a-z][\s\S]*>/i.test(value ?? '')

const getEmailTextFallback = (email: ApplicationEmail) =>
  email.MessageTextPlain?.trim() || email.PlainText?.trim() || email.Text?.trim() || ''

const getEmailStatusClasses = (status?: string | null) => {
  const normalizedStatus = String(status ?? '').toLowerCase()

  if (!normalizedStatus) return 'bg-gray-100 text-gray-700'
  if (normalizedStatus.includes('fail') || normalizedStatus.includes('error')) return 'bg-red-100 text-red-700'
  if (normalizedStatus.includes('sent') || normalizedStatus.includes('success')) return 'bg-green-100 text-green-700'
  return 'bg-amber-100 text-amber-700'
}

function EmailInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3 border-b border-gray-100 py-2 text-sm last:border-b-0">
      <span className="font-medium text-gray-500">{label}</span>
      <span className="min-w-0 break-words text-gray-900">{value || '-'}</span>
    </div>
  )
}

function EmailBodyPreview({ email }: { email: ApplicationEmail }) {
  const messageText = email.MessageText ?? ''
  const textFallback = getEmailTextFallback(email)
  const hasHtmlBody = isHtmlEmail(messageText)
  const bodyText = textFallback || messageText

  if (hasHtmlBody) {
    return (
      <iframe
        title={`Email body ${email.MessageID ?? email.Subject ?? 'preview'}`}
        sandbox=""
        srcDoc={messageText}
        className="h-[520px] w-full rounded border border-gray-200 bg-white"
      />
    )
  }

  return (
    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800">
      {bodyText || 'No message body.'}
    </pre>
  )
}

function EmailPreviewModal({
  email,
  onClose,
}: {
  email: ApplicationEmail | null
  onClose: () => void
}) {
  if (!email) return null

  const attachmentText = email.Attachments?.trim()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEmailStatusClasses(email.EmailStatus)}`}>
                  {email.EmailStatus || 'Status unknown'}
                </span>
                <span className="text-xs font-medium text-gray-500">{formatEmailDate(email.SentDate)}</span>
              </div>
              <h3 className="break-words text-lg font-semibold text-gray-900">{email.Subject || '(No subject)'}</h3>
              <div className="mt-1 text-xs text-gray-500">
                {email.MessageID ? `Message #${email.MessageID}` : 'Email message'}
                {email.TaskInstanceId ? ` - Task #${email.TaskInstanceId}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              aria-label="Close email preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4">
            <EmailInfoRow label="From" value={email.FromUser} />
            <EmailInfoRow label="To" value={email.ToUser} />
            <EmailInfoRow label="CC" value={email.CCUser} />
            <EmailInfoRow label="BCC" value={email.BCCUser} />
            <EmailInfoRow label="Priority" value={email.Priority} />
            {attachmentText ? (
              <EmailInfoRow
                label="Attachment"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    {attachmentText}
                  </span>
                }
              />
            ) : null}
          </div>

          <EmailBodyPreview email={email} />
        </div>
      </div>
    </div>
  )
}

function EmailsPanel({ emails }: { emails?: ApplicationEmail[] }) {
  const [previewEmail, setPreviewEmail] = useState<ApplicationEmail | null>(null)
  const sortedEmails = useMemo(() => {
    return [...(emails ?? [])].sort((a, b) => {
      const aTime = new Date(String(a.SentDate ?? '').replace(' ', 'T')).getTime()
      const bTime = new Date(String(b.SentDate ?? '').replace(' ', 'T')).getTime()
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    })
  }, [emails])

  if (sortedEmails.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        No emails are available for this application.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Emails</h2>
          <p className="text-sm text-gray-500">Sent and attempted email history for this application</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {sortedEmails.length} total
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[52px_minmax(160px,1fr)_minmax(180px,1.4fr)_minmax(96px,0.8fr)_110px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
          <div>View</div>
          <div>Recipient</div>
          <div>Subject</div>
          <div>Status</div>
          <div>Sent</div>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedEmails.map((email, index) => {
            const attachmentText = email.Attachments?.trim()
            const emailKey = String(email.MessageID ?? `${email.SentDate ?? 'email'}-${index}`)

            return (
              <div
                key={emailKey}
                className="grid grid-cols-[44px_1fr] gap-3 px-4 py-3 hover:bg-gray-50 md:grid-cols-[52px_minmax(160px,1fr)_minmax(180px,1.4fr)_minmax(96px,0.8fr)_110px]"
              >
                <div className="flex items-start">
                  <button
                    type="button"
                    onClick={() => setPreviewEmail(email)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    title="Preview email"
                    aria-label={`Preview email ${email.Subject || emailKey}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 md:hidden">Recipient</div>
                  <div className="truncate text-sm font-semibold text-gray-900" title={email.ToUser ?? undefined}>
                    {email.ToUser || '-'}
                  </div>
                  <div className="mt-1 truncate text-xs text-gray-500" title={email.FromUser ?? undefined}>
                    From: {email.FromUser || '-'}
                  </div>
                </div>

                <div className="col-span-2 min-w-0 md:col-span-1">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 md:hidden">Subject</div>
                  <div className="truncate text-sm font-medium text-gray-900" title={email.Subject ?? undefined}>
                    {email.Subject || '(No subject)'}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {email.MessageID ? <span>Message #{email.MessageID}</span> : null}
                    {email.TaskInstanceId ? <span>Task #{email.TaskInstanceId}</span> : null}
                    {attachmentText ? (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        Attachment
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="col-span-2 self-start md:col-span-1">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 md:hidden">Status</div>
                  <span className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${getEmailStatusClasses(email.EmailStatus)}`}>
                    <span className="truncate">{email.EmailStatus || 'Unknown'}</span>
                  </span>
                </div>

                <div className="col-span-2 text-sm text-gray-600 md:col-span-1">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 md:hidden">Sent</div>
                  {formatEmailDate(email.SentDate)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <EmailPreviewModal email={previewEmail} onClose={() => setPreviewEmail(null)} />
    </div>
  )
}

const Modal = ({
  isOpen,
  onClose,
  title,
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  submitLabel: string
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-32 w-full resize-none rounded-lg border p-3"
        />
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const ValidationCheckItem = ({ checkKey, check }: { checkKey: string; check: ValidationCheck }) => (
  <div
    className={`flex items-center justify-between rounded-lg border p-3 ${
      check.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    }`}
  >
    <div className="flex items-center space-x-3">
      {check.valid ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-red-600" />
      )}
      <div>
        <div className="font-medium capitalize text-gray-900">{checkKey.replace(/([A-Z])/g, ' $1')}</div>
        <div className={`text-sm ${check.valid ? 'text-green-700' : 'text-red-700'}`}>{check.message}</div>
      </div>
    </div>
    {check.valid ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-red-600" />}
  </div>
)

export function ApplicationDetailsContent({
  application,
  mode = 'page',
  applicationId,
  showInterfaceLabel = true,
  dataSource = 'application',
}: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [editMode] = useState(false)
  const [showRecentOnly, setShowRecentOnly] = useState(false)
  const [userRole] = useState('admin')
  const [showAdminView] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('incomplete')
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [validationChecks] = useState(INITIAL_VALIDATION_CHECKS)
  const [comments, setComments] = useState(INITIAL_COMMENTS)
  const [recentActivity, setRecentActivity] = useState(INITIAL_ACTIVITY)
  const resolvedApplicationId = useMemo(
    () => resolveApplicationId(application, applicationId),
    [application, applicationId],
  )
  const applicationNotesContextKey = `application-details:${String(applicationId ?? application.applicationId ?? 'unknown')}`
  const applicationDisplayName =
    application.company?.[0]?.name?.trim() || `Application ${application.applicationId}`
  const pageTitle =
    dataSource === 'prelim'
      ? 'Intake Application Review & Management'
      : 'Application Review & Management'
  const tabs = useMemo(
    () =>
      dataSource === 'application'
        ? [...TABS.slice(0, 6), SCHEDULE_A_TAB, SCHEDULE_B_TAB, CONTRACT_TAB, ...TABS.slice(6)]
        : TABS,
    [dataSource],
  )
  const applicationNotes = useTaskNotesDrawerState({
    applicationId: resolvedApplicationId,
  })

  const allValidationsPassed = useMemo(
    () => Object.values(validationChecks).every(check => check.valid),
    [validationChecks],
  )

  const addActivity = useCallback((action: string, details: string, type: ActivityType) => {
    const newActivity: Activity = {
      date: getCurrentTimestamp(),
      action,
      details,
      user: 'J. Mitchell',
      type,
      status: 'approved',
    }
    setRecentActivity(prev => [newActivity, ...prev])
  }, [])

  const handleCompleteApplication = useCallback(() => {
    setCompletionStatus('complete')
    addActivity('Application Marked Complete', 'Application verified and marked ready for dispatcher', 'completion')
  }, [addActivity])

  const handleDispatchApplication = useCallback(() => {
    setCompletionStatus('dispatched')
    addActivity('Application Dispatched', 'Application sent to dispatcher queue', 'dispatch')
  }, [addActivity])

  const handleUndoCompletion = useCallback(() => {
    setCompletionStatus('incomplete')
    addActivity('Completion Undone', 'Application moved back to preparation', 'undo')
  }, [addActivity])

  const addComment = useCallback(() => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: comments.length + 1,
      author: 'J. Mitchell',
      date: getCurrentTimestamp(),
      comment: newComment,
      type: 'internal',
    }
    setComments(prev => [...prev, comment])
    setNewComment('')
    setShowCommentsModal(false)
  }, [newComment, comments.length])

  const completionStatusInfo = useMemo(() => {
    const statusMap = {
      incomplete: {
        title: 'Ready to Complete Application',
        description: 'All validations must pass before completion',
      },
      complete: {
        title: 'Application Completed - Ready for Dispatch',
        description: 'Click dispatch to send to reviewer queue',
      },
      dispatched: {
        title: 'Application Dispatched',
        description: 'Application is now in dispatcher queue',
      },
    }
    return statusMap[completionStatus]
  }, [completionStatus])

  const sortedTaskEvents = useMemo(() => {
    return [...(application.taskEvents ?? [])].sort((a, b) => {
      const aTime = new Date(a.ActionDate ?? '').getTime()
      const bTime = new Date(b.ActionDate ?? '').getTime()
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    })
  }, [application.taskEvents])

  useEffect(() => {
    if (activeTab !== 'notes' || resolvedApplicationId === null) return
    if (applicationNotes.drawer?.contextKey === applicationNotesContextKey) return

    void applicationNotes.openDrawer({
      contextKey: applicationNotesContextKey,
      taskName: applicationDisplayName,
      tab: 'incoming',
    })
  }, [
    activeTab,
    applicationDisplayName,
    applicationNotes,
    applicationNotesContextKey,
    resolvedApplicationId,
  ])

  return (
    <div className={mode === 'page' ? 'min-h-screen bg-gray-50' : 'flex h-full min-h-0 flex-col bg-gray-50'}>
      <div className={mode === 'page' ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' : 'shrink-0 border-b bg-white px-4 py-3'}>
        <div className={mode === 'page' ? 'flex items-center justify-between py-4' : 'flex items-center justify-between'}>
          <div>
            <h1 className={mode === 'page' ? 'text-2xl font-bold text-gray-900' : 'text-xl font-bold text-gray-900'}>
              {pageTitle}
            </h1>
            {showInterfaceLabel ? (
              <p className="text-gray-600">NCRC Preprocessing Interface</p>
            ) : null}
          </div>
          <div className="flex items-center space-x-4">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusBadge(application.status)}`}>
              {application.status}
            </span>
          </div>
        </div>
      </div>

      {(userRole === 'admin' && showAdminView) && (
        <div className="border-b bg-blue-50">
          <div className={mode === 'page' ? 'mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8' : 'px-4 py-4'}>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="flex items-center text-lg font-semibold text-gray-900">
                    <Shield className="mr-2 h-5 w-5 text-blue-600" />
                    Admin Completion Workflow
                  </h3>
                  <p className="text-sm text-gray-600">Verify all required data before dispatching to review queue</p>
                </div>
                <button
                  onClick={() => setShowCommentsModal(true)}
                  className="flex items-center rounded-lg bg-gray-600 px-3 py-2 text-white transition-colors hover:bg-gray-700"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Add Comment
                </button>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(validationChecks).map(([key, check]) => (
                  <ValidationCheckItem key={key} checkKey={key} check={check} />
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <div className="flex items-center space-x-4">
                  <div className={`rounded-full p-2 ${allValidationsPassed ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {allValidationsPassed ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{completionStatusInfo.title}</div>
                    <div className="text-sm text-gray-600">{completionStatusInfo.description}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {completionStatus === 'incomplete' && (
                    <button
                      onClick={handleCompleteApplication}
                      disabled={!allValidationsPassed}
                      className={`flex items-center rounded-lg px-4 py-2 transition-colors ${
                        allValidationsPassed
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'cursor-not-allowed bg-gray-300 text-gray-500'
                      }`}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </button>
                  )}
                  {completionStatus === 'complete' && (
                    <>
                      <button
                        onClick={handleUndoCompletion}
                        className="flex items-center rounded-lg bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Undo
                      </button>
                      <button
                        onClick={handleDispatchApplication}
                        className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Dispatch to Queue
                      </button>
                    </>
                  )}
                  {completionStatus === 'dispatched' && (
                    <button
                      onClick={handleUndoCompletion}
                      className="flex items-center rounded-lg bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Recall from Queue
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={mode === 'page' ? 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8' : 'min-h-0 flex-1 p-3'}>
        <div className={mode === 'page' ? 'flex' : 'flex h-full min-h-0'}>
          <nav className={mode === 'page' ? 'mr-8 w-64 space-y-1' : 'mr-3 w-48 shrink-0 space-y-1 overflow-y-auto pr-1'}>
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className={mode === 'page' ? 'min-w-0 flex-1' : 'min-w-0 flex-1 overflow-y-auto'}>
            {activeTab === 'overview' && (
              <Overview
                application={application}
                allValidationsPassed={allValidationsPassed}
                dataSource={dataSource}
              />
            )}
            {activeTab === 'company' && <CompanySection application={application} editMode={editMode} />}
            {activeTab === 'contacts' && <ContactsSection application={application} editMode={editMode} />}
            {activeTab === 'plants' && <PlantsSection application={application} editMode={editMode} />}
            {activeTab === 'products' && <ProductsTable application={application} dataSource={dataSource} />}
            {activeTab === 'ingredients' && (
              <IngredientMgmt
                application={application}
                dataSource={dataSource}
                showRecentOnly={showRecentOnly}
                setShowRecentOnly={setShowRecentOnly}
              />
            )}
            {dataSource === 'application' && activeTab === 'schedule-a' && resolvedApplicationId !== null && (
              <ScheduleAIngredientsDrawer
                open
                mode="embedded"
                readOnly
                applicationId={resolvedApplicationId}
                applicationName={applicationDisplayName}
                visitId={application.visit_id ?? null}
                appVars={application.appvars ?? null}
                assignedRoles={application.assignedRoles}
                onClose={() => {}}
              />
            )}
            {dataSource === 'application' && activeTab === 'schedule-a' && resolvedApplicationId === null && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                Schedule A is unavailable because this application does not have a valid application ID.
              </div>
            )}
            {dataSource === 'application' && activeTab === 'schedule-b' && resolvedApplicationId !== null && (
              <ScheduleBProductsDrawer
                open
                mode="embedded"
                readOnly
                applicationId={resolvedApplicationId}
                applicationName={applicationDisplayName}
                visitId={application.visit_id ?? null}
                appVars={application.appvars ?? null}
                assignedRoles={application.assignedRoles}
                onClose={() => {}}
              />
            )}
            {dataSource === 'application' && activeTab === 'schedule-b' && resolvedApplicationId === null && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                Schedule B is unavailable because this application does not have a valid application ID.
              </div>
            )}
            {dataSource === 'application' && activeTab === 'contract' && resolvedApplicationId !== null && (
              <ContractStageDrawer
                open
                mode="embedded"
                readOnly
                applicationId={resolvedApplicationId}
                applicationName={applicationDisplayName}
                appVars={application.appvars ?? null}
                assignedRoles={application.assignedRoles}
                taskName="Contract"
                onClose={() => {}}
              />
            )}
            {dataSource === 'application' && activeTab === 'contract' && resolvedApplicationId === null && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                Contract is unavailable because this application does not have a valid application ID.
              </div>
            )}
            {activeTab === 'raw-application' && <RawApplicationPanel entries={application.raw_data} />}
            {activeTab === 'quote' && <QuoteInfo application={application} />}
            {activeTab === 'activity' && <ActivityLog recentActivity={recentActivity} comments={comments} />}
            {activeTab === 'task-events' && <TaskEventsPanel taskEvents={sortedTaskEvents} />}
            {activeTab === 'emails' && <EmailsPanel emails={application.emails} />}
            {activeTab === 'files' && <FilesList application={application} />}
            {activeTab === 'notes' && resolvedApplicationId !== null && (
              <TaskNotesDrawer
                open
                variant="embedded"
                applicantCompany={applicationDisplayName}
                applicationId={resolvedApplicationId}
                contextType="application"
                taskName={applicationDisplayName}
                activeTab={applicationNotes.drawer?.activeTab ?? 'incoming'}
                incomingNotes={applicationNotes.activeNotes.incoming}
                outgoingNotes={applicationNotes.activeNotes.outgoing}
                mentionNotes={applicationNotes.activeNotes.mention}
                privateNotes={applicationNotes.activeNotes.private}
                loadingIncoming={applicationNotes.activeLoading.incoming}
                loadingOutgoing={applicationNotes.activeLoading.outgoing}
                loadingMention={applicationNotes.activeLoading.mention}
                loadingPrivate={applicationNotes.activeLoading.private}
                composeText={applicationNotes.composeText}
                composeToUserId={applicationNotes.composeToUserId}
                composePrivate={applicationNotes.composePrivate}
                currentUsername={applicationNotes.currentUsername}
                isSubmitting={applicationNotes.isSubmitting}
                error={applicationNotes.error}
                onIncomingNoteClick={applicationNotes.markIncomingNoteRead}
                markingReadMessageId={applicationNotes.markingReadMessageId}
                reactingMessageId={applicationNotes.reactingMessageId}
                onClose={() => {}}
                onTabChange={applicationNotes.setActiveTab}
                onComposeTextChange={applicationNotes.setComposeText}
                onComposeToUserChange={applicationNotes.setComposeToUserId}
                onComposePrivateChange={applicationNotes.setComposePrivate}
                onSubmit={applicationNotes.submitNote}
                onReplySubmit={applicationNotes.submitReply}
                onReactionTagChange={applicationNotes.updateMessageReactionTag}
              />
            )}
            {activeTab === 'notes' && resolvedApplicationId === null && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                Notes are unavailable because this application does not have a valid application ID.
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        title="Add Internal Comment"
        value={newComment}
        onChange={setNewComment}
        onSubmit={addComment}
        placeholder="Enter your comment..."
        submitLabel="Add Comment"
      />
    </div>
  )
}
