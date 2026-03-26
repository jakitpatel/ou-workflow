import { useCallback, useMemo, useState } from 'react'
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
  MessageCircle,
  ClipboardList,
} from 'lucide-react'
import Overview from '@/components/ou-workflow/ApplicationManagement/Overview'
import CompanySection from '@/components/ou-workflow/ApplicationManagement/CompanySection'
import ContactsSection from '@/components/ou-workflow/ApplicationManagement/ContactsSection'
import PlantsSection from '@/components/ou-workflow/ApplicationManagement/PlantsSection'
import ProductsTable from '@/components/ou-workflow/ApplicationManagement/Products/ProductsTable'
import ActivityLog from '@/components/ou-workflow/ApplicationManagement/ActivityLog'
import FilesList from '@/components/ou-workflow/ApplicationManagement/FilesList'
import IngredientMgmt from '@/components/ou-workflow/ApplicationManagement/Ingredients'
import QuoteInfo from '@/components/ou-workflow/ApplicationManagement/QuoteInfo'
import MessageLog from '@/components/ou-workflow/ApplicationManagement/MessageLog'
import TaskEventsPanel from '@/components/ou-workflow/ApplicationManagement/TaskEventsPanel'
import type { ApplicationDetail } from '@/types/application'

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

interface Message {
  id: number
  from: string
  to: string
  date: string
  message: string
  type: string
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
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'company', label: 'Company Details', icon: Building },
  { id: 'contacts', label: 'Company Contacts', icon: Users },
  { id: 'plants', label: 'Plants', icon: Building },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'ingredients', label: 'Ingredients', icon: Beaker },
  { id: 'quote', label: 'Quote', icon: FileText },
  { id: 'activity', label: 'Recent Activity', icon: AlertCircle },
  { id: 'task-events', label: 'Task Events', icon: ClipboardList },
  { id: 'files', label: 'File Management', icon: Upload },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
] as const

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

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    from: 'J. Mitchell',
    to: 'Dispatcher',
    date: '2025-07-18 09:30',
    message: 'Application ready for initial review. All documentation complete.',
    type: 'outgoing',
  },
]

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

export function ApplicationDetailsContent({ application, mode = 'page' }: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [editMode] = useState(false)
  const [showRecentOnly, setShowRecentOnly] = useState(false)
  const [userRole] = useState('admin')
  const [showAdminView] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('incomplete')
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [newComment, setNewComment] = useState('')
  const [validationChecks] = useState(INITIAL_VALIDATION_CHECKS)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [comments, setComments] = useState(INITIAL_COMMENTS)
  const [recentActivity, setRecentActivity] = useState(INITIAL_ACTIVITY)

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

  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: messages.length + 1,
      from: 'J. Mitchell',
      to: 'Dispatcher',
      date: getCurrentTimestamp(),
      message: newMessage,
      type: 'outgoing',
    }
    setMessages(prev => [...prev, message])
    setNewMessage('')
    setShowMessageModal(false)
  }, [newMessage, messages.length])

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

  return (
    <div className={mode === 'page' ? 'min-h-screen bg-gray-50' : 'flex h-full min-h-0 flex-col bg-gray-50'}>
      <div className={mode === 'page' ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' : 'shrink-0 border-b bg-white px-4 py-3'}>
        <div className={mode === 'page' ? 'flex items-center justify-between py-4' : 'flex items-center justify-between'}>
          <div>
            <h1 className={mode === 'page' ? 'text-2xl font-bold text-gray-900' : 'text-xl font-bold text-gray-900'}>
              Application Review & Management
            </h1>
            <p className="text-gray-600">NCRC Preprocessing Interface</p>
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

      <div className={mode === 'page' ? 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8' : 'min-h-0 flex-1 p-4'}>
        <div className={mode === 'page' ? 'flex' : 'flex h-full min-h-0'}>
          <nav className={mode === 'page' ? 'mr-8 w-64 space-y-1' : 'mr-4 w-56 shrink-0 space-y-1 overflow-y-auto pr-1'}>
            {TABS.map(tab => {
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

          <div className={mode === 'page' ? 'min-w-0 flex-1' : 'min-w-0 flex-1 overflow-y-auto pr-1'}>
            {activeTab === 'overview' && (
              <Overview application={application} allValidationsPassed={allValidationsPassed} />
            )}
            {activeTab === 'company' && <CompanySection application={application} editMode={editMode} />}
            {activeTab === 'contacts' && <ContactsSection application={application} editMode={editMode} />}
            {activeTab === 'plants' && <PlantsSection application={application} editMode={editMode} />}
            {activeTab === 'products' && <ProductsTable application={application} />}
            {activeTab === 'ingredients' && (
              <IngredientMgmt
                application={application}
                showRecentOnly={showRecentOnly}
                setShowRecentOnly={setShowRecentOnly}
              />
            )}
            {activeTab === 'quote' && <QuoteInfo application={application} />}
            {activeTab === 'activity' && <ActivityLog recentActivity={recentActivity} comments={comments} />}
            {activeTab === 'task-events' && <TaskEventsPanel taskEvents={sortedTaskEvents} />}
            {activeTab === 'files' && <FilesList application={application} />}
            {activeTab === 'messages' && <MessageLog application={application} />}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title="Message Dispatcher"
        value={newMessage}
        onChange={setNewMessage}
        onSubmit={sendMessage}
        placeholder="Enter your message..."
        submitLabel="Send Message"
      />

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

