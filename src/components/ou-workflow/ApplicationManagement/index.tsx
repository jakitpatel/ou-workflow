import { useState, useMemo, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Building, Users, Package, Beaker, Send, MessageSquare, AlertTriangle, Check, X, Shield, MessageCircle } from 'lucide-react';
import Overview from './Overview';
import CompanySection from './CompanySection';
import ContactsSection from './ContactsSection';
import PlantsSection from './PlantsSection';
import ProductsTable from './Products/ProductsTable';
import ActivityLog from './ActivityLog';
import FilesList from './FilesList';
import IngredientMgmt from './Ingredients';
import QuoteInfo from './QuoteInfo';
import MessageLog from './MessageLog';
import type { ApplicationDetail } from '@/types/application';

// Types
type CompletionStatus = 'incomplete' | 'complete' | 'dispatched';
type ActivityType = 'completion' | 'ingredient' | 'plant' | 'bulk' | 'company' | 'dispatch' | 'undo';
type ActivityStatus = 'approved' | 'pending' | 'completed';

interface Activity {
  date: string;
  action: string;
  details: string;
  user: string;
  type: ActivityType;
  status: ActivityStatus;
}

interface Message {
  id: number;
  from: string;
  to: string;
  date: string;
  message: string;
  type: string;
}

interface Comment {
  id: number;
  author: string;
  date: string;
  comment: string;
  type: string;
}

interface ValidationCheck {
  valid: boolean;
  message: string;
}

interface Props {
  application: ApplicationDetail;
}

// Constants
const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'company', label: 'Company Details', icon: Building },
  { id: 'contacts', label: 'Company Contacts', icon: Users },
  { id: 'plants', label: 'Plants', icon: Building },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'ingredients', label: 'Ingredients', icon: Beaker },
  { id: 'quote', label: 'Quote', icon: FileText },
  { id: 'activity', label: 'Recent Activity', icon: AlertCircle },
  { id: 'files', label: 'File Management', icon: Upload },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
] as const;

const STATUS_BADGES: Record<string, string> = {
  'Not Started': 'bg-gray-100 text-gray-800',
  'Ready for Dispatch': 'bg-green-100 text-green-800',
  'Dispatched': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'Completed': 'bg-green-100 text-green-800',
  'Needs Review': 'bg-red-100 text-red-800'
};

const INITIAL_VALIDATION_CHECKS: Record<string, ValidationCheck> = {
  company: { valid: true, message: 'Company KC-2025-4829 verified in Kashrus DB' },
  plant: { valid: true, message: 'Plant PLT-KC-2025-4829-001 created and linked' },
  contacts: { valid: true, message: 'Primary contact John Mitchell designated for initial communication' },
  products: { valid: true, message: '4 products identified and categorized' },
  ingredients: { valid: true, message: '10 ingredients processed and validated' },
  quote: { valid: false, message: 'Quote not found - needs verification' },
  documentation: { valid: true, message: 'All required documents uploaded and processed' }
};

const INITIAL_MESSAGES: Message[] = [
  { id: 1, from: 'J. Mitchell', to: 'Dispatcher', date: '2025-07-18 09:30', message: 'Application ready for initial review. All documentation complete.', type: 'outgoing' }
];

const INITIAL_COMMENTS: Comment[] = [
  { id: 1, author: 'J. Mitchell', date: '2025-07-18 14:45', comment: 'Verified all ingredient certifications with suppliers. Coconut oil documentation updated.', type: 'internal' },
  { id: 2, author: 'G. Magder', date: '2025-07-18 13:20', comment: 'Plant contact information confirmed. John Mitchell will be primary for all communications.', type: 'internal' }
];

const INITIAL_ACTIVITY: Activity[] = [
  { date: '2025-07-18 14:30', action: 'Ingredient Added', details: 'Natural Vanilla Extract (Premium Flavor Co)', user: 'J. Mitchell', type: 'ingredient', status: 'approved' },
  { date: '2025-07-18 13:15', action: 'Ingredient Added', details: 'Organic Quinoa Flour (Andean Grains Ltd)', user: 'G. Magder', type: 'ingredient', status: 'pending' },
  { date: '2025-07-18 11:45', action: 'Supplier Sync', details: 'Coconut Oil (Refined) auto-added from supplier portal', user: 'Auto-Sync', type: 'ingredient', status: 'approved' },
  { date: '2025-07-18 09:20', action: 'Plant Updated', details: 'Manufacturing process description revised', user: 'J. Mitchell', type: 'plant', status: 'approved' },
  { date: '2025-07-17 16:45', action: 'Initial Import', details: '7 ingredients imported from application submission', user: 'System Import', type: 'bulk', status: 'approved' },
  { date: '2025-07-17 16:30', action: 'Company Created', details: 'Happy Cow Mills Inc. added to Kashrus DB (KC-2025-4829)', user: 'System', type: 'company', status: 'approved' }
];

// Utility functions
const getStatusBadge = (status: string | number): string => {
  return STATUS_BADGES[String(status)] || STATUS_BADGES['Not Started'];
};

const getCurrentTimestamp = (): string => {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
};

// Modal Component
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  value, 
  onChange, 
  onSubmit, 
  placeholder,
  submitLabel 
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 border rounded-lg h-32 resize-none"
        />
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// Validation Check Component
const ValidationCheckItem = ({ checkKey, check }: { checkKey: string; check: ValidationCheck }) => (
  <div className={`flex items-center justify-between p-3 rounded-lg border ${
    check.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  }`}>
    <div className="flex items-center space-x-3">
      {check.valid ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-red-600" />
      )}
      <div>
        <div className="font-medium capitalize text-gray-900">
          {checkKey.replace(/([A-Z])/g, ' $1')}
        </div>
        <div className={`text-sm ${check.valid ? 'text-green-700' : 'text-red-700'}`}>
          {check.message}
        </div>
      </div>
    </div>
    {check.valid ? (
      <Check className="h-5 w-5 text-green-600" />
    ) : (
      <X className="h-5 w-5 text-red-600" />
    )}
  </div>
);

// Main Component
export const ApplicationManagementInterface = ({ application }: Props) => {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const [userRole] = useState('admin');
  const [showAdminView] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('incomplete');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newComment, setNewComment] = useState('');
  const [validationChecks] = useState(INITIAL_VALIDATION_CHECKS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [recentActivity, setRecentActivity] = useState(INITIAL_ACTIVITY);

  // Memoized values
  const allValidationsPassed = useMemo(() => {
    return Object.values(validationChecks).every(check => check.valid);
  }, [validationChecks]);

  // Callbacks
  const addActivity = useCallback((action: string, details: string, type: ActivityType) => {
    const newActivity: Activity = {
      date: getCurrentTimestamp(),
      action,
      details,
      user: 'J. Mitchell',
      type,
      status: 'approved'
    };
    setRecentActivity(prev => [newActivity, ...prev]);
  }, []);

  const handleCompleteApplication = useCallback(() => {
    setCompletionStatus('complete');
    addActivity('Application Marked Complete', 'Application verified and marked ready for dispatcher', 'completion');
  }, [addActivity]);

  const handleDispatchApplication = useCallback(() => {
    setCompletionStatus('dispatched');
    addActivity('Application Dispatched', 'Application sent to dispatcher queue', 'dispatch');
  }, [addActivity]);

  const handleUndoCompletion = useCallback(() => {
    setCompletionStatus('incomplete');
    addActivity('Completion Undone', 'Application moved back to preparation', 'undo');
  }, [addActivity]);

  const sendMessage = useCallback(() => {
    if (newMessage.trim()) {
      const message: Message = {
        id: messages.length + 1,
        from: 'J. Mitchell',
        to: 'Dispatcher',
        date: getCurrentTimestamp(),
        message: newMessage,
        type: 'outgoing'
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setShowMessageModal(false);
    }
  }, [newMessage, messages.length]);

  const addComment = useCallback(() => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: comments.length + 1,
        author: 'J. Mitchell',
        date: getCurrentTimestamp(),
        comment: newComment,
        type: 'internal'
      };
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setShowCommentsModal(false);
    }
  }, [newComment, comments.length]);

  // Completion status info
  const completionStatusInfo = useMemo(() => {
    const statusMap = {
      incomplete: {
        title: 'Ready to Complete Application',
        description: 'All validations must pass before completion'
      },
      complete: {
        title: 'Application Completed - Ready for Dispatch',
        description: 'Click dispatch to send to reviewer queue'
      },
      dispatched: {
        title: 'Application Dispatched',
        description: 'Application is now in dispatcher queue'
      }
    };
    return statusMap[completionStatus];
  }, [completionStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application Review & Management</h1>
            <p className="text-gray-600">NCRC Preprocessing Interface</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(application.status)}`}>
              {application.status}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Completion Header */}
      {(userRole === 'admin' && showAdminView) && (
        <div className="bg-blue-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Admin Completion Workflow
                  </h3>
                  <p className="text-sm text-gray-600">Verify all required data before dispatching to review queue</p>
                </div>
                <button
                  onClick={() => setShowCommentsModal(true)}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Comment
                </button>
              </div>

              {/* Validation Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.entries(validationChecks).map(([key, check]) => (
                  <ValidationCheckItem key={key} checkKey={key} check={check} />
                ))}
              </div>

              {/* Completion Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    allValidationsPassed ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {allValidationsPassed ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {completionStatusInfo.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      {completionStatusInfo.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {completionStatus === 'incomplete' && (
                    <button
                      onClick={handleCompleteApplication}
                      disabled={!allValidationsPassed}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        allValidationsPassed
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </button>
                  )}
                  {completionStatus === 'complete' && (
                    <>
                      <button
                        onClick={handleUndoCompletion}
                        className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Undo
                      </button>
                      <button
                        onClick={handleDispatchApplication}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Dispatch to Queue
                      </button>
                    </>
                  )}
                  {completionStatus === 'dispatched' && (
                    <button
                      onClick={handleUndoCompletion}
                      className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Recall from Queue
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex">
          {/* Sidebar Navigation */}
          <nav className="w-64 mr-8 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Main Content Area */}
          <div className="flex-1">
            {activeTab === "overview" && <Overview application={application} allValidationsPassed={allValidationsPassed} />}
            {activeTab === 'company' && <CompanySection application={application} editMode={editMode} />}
            {activeTab === 'contacts' && <ContactsSection application={application} editMode={editMode} />}
            {activeTab === 'plants' && <PlantsSection application={application} editMode={editMode} />}
            {activeTab === 'products' && <ProductsTable application={application} />}
            {activeTab === 'ingredients' && <IngredientMgmt application={application} showRecentOnly={showRecentOnly} setShowRecentOnly={setShowRecentOnly} />}
            {activeTab === 'quote' && <QuoteInfo application={application} />}
            {activeTab === 'activity' && <ActivityLog recentActivity={recentActivity} comments={comments} />}
            {activeTab === 'files' && <FilesList application={application} />}
            {activeTab === 'messages' && <MessageLog application={application} />}
          </div>
        </div>
      </div>

      {/* Modals */}
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
  );
};