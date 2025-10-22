import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Building, Users, Package, Beaker, Send, MessageSquare, AlertTriangle, Check, X, Shield } from 'lucide-react';
import Overview from './Overview';
import CompanySection from './CompanySection';
import ContactsSection from './ContactsSection';
import PlantsSection from './PlantsSection';
import ProductsTable from './ProductsTable';
import ActivityLog from './ActivityLog';
import FilesList from './FilesList';
import IngredientMgmt from './Ingredients';
import QuoteInfo from './QuoteInfo';
import type { ApplicationDetail } from '@/types/application';
import { Navigation } from '../Navigation';
type Props = {
  application: ApplicationDetail;
};

export const ApplicationManagementInterface = ({ application }: Props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const [userRole, setUserRole] = useState('admin'); // 'admin', 'dispatcher', 'rfr', 'ncrc'
  const [showAdminView, setShowAdminView] = useState(false);
  const [completionStatus, setCompletionStatus] = useState('incomplete'); // 'incomplete', 'complete', 'dispatched'
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newComment, setNewComment] = useState('');

  // Validation state for required data
  const [validationChecks, setValidationChecks] = useState({
    company: { valid: true, message: 'Company KC-2025-4829 verified in Kashrus DB' },
    plant: { valid: true, message: 'Plant PLT-KC-2025-4829-001 created and linked' },
    contacts: { valid: true, message: 'Primary contact John Mitchell designated for initial communication' },
    products: { valid: true, message: '4 products identified and categorized' },
    ingredients: { valid: true, message: '10 ingredients processed and validated' },
    quote: { valid: false, message: 'Quote not found - needs verification' },
    documentation: { valid: true, message: 'All required documents uploaded and processed' }
  });

  // Messages and comments
  const [messages, setMessages] = useState([
    { id: 1, from: 'J. Mitchell', to: 'Dispatcher', date: '2025-07-18 09:30', message: 'Application ready for initial review. All documentation complete.', type: 'outgoing' }
  ]);

  const [comments, setComments] = useState([
    { id: 1, author: 'J. Mitchell', date: '2025-07-18 14:45', comment: 'Verified all ingredient certifications with suppliers. Coconut oil documentation updated.', type: 'internal' },
    { id: 2, author: 'G. Magder', date: '2025-07-18 13:20', comment: 'Plant contact information confirmed. John Mitchell will be primary for all communications.', type: 'internal' }
  ]);

  // Quote information
  const quoteData = {
    quoteNumber: 'QT-2025-HC-001',
    amount: '$2,850',
    validUntil: '2025-08-17',
    status: 'pending_acceptance',
    items: [
      { description: 'Initial Certification - 1 Plant', amount: '$1,500' },
      { description: 'Product Review (4 products)', amount: '$800' },
      { description: 'Ingredient Analysis (10 ingredients)', amount: '$550' }
    ]
  };

  // Recent activity tracking
  const recentActivity = [
    { date: '2025-07-18 14:30', action: 'Ingredient Added', details: 'Natural Vanilla Extract (Premium Flavor Co)', user: 'J. Mitchell', type: 'ingredient', status: 'approved' },
    { date: '2025-07-18 13:15', action: 'Ingredient Added', details: 'Organic Quinoa Flour (Andean Grains Ltd)', user: 'G. Magder', type: 'ingredient', status: 'pending' },
    { date: '2025-07-18 11:45', action: 'Supplier Sync', details: 'Coconut Oil (Refined) auto-added from supplier portal', user: 'Auto-Sync', type: 'ingredient', status: 'approved' },
    { date: '2025-07-18 09:20', action: 'Plant Updated', details: 'Manufacturing process description revised', user: 'J. Mitchell', type: 'plant', status: 'approved' },
    { date: '2025-07-17 16:45', action: 'Initial Import', details: '7 ingredients imported from application submission', user: 'System Import', type: 'bulk', status: 'approved' },
    { date: '2025-07-17 16:30', action: 'Company Created', details: 'Happy Cow Mills Inc. added to Kashrus DB (KC-2025-4829)', user: 'System', type: 'company', status: 'approved' }
  ];

  // Application data parsed from the PDF
  const applicationData = application;

  const uploadedFiles = [
    { name: 'Application for OU Kosher Certification - Test.pdf', type: 'application', size: '245 KB', uploaded: '2025-07-17', tag: 'Application Form', processed: true },
    { name: 'happycow IngredientOUKosher.xlsx', type: 'ingredients', size: '12 KB', uploaded: '2025-07-17', tag: 'Ingredient List', processed: true, recordCount: 2 },
    { name: 'happycow BrandsOUKosher.xlsx', type: 'products', size: '8 KB', uploaded: '2025-07-17', tag: 'Brand/Product List', processed: true, recordCount: 2 },
    { name: 'Ingredient happycowOUKosher 1.xlsx', type: 'ingredients', size: '15 KB', uploaded: '2025-07-17', tag: 'Ingredient List (Additional)', processed: true, recordCount: 5 },
    { name: 'happycow BrandsOUKosher 1.xlsx', type: 'products', size: '9 KB', uploaded: '2025-07-17', tag: 'Brand/Product List (Additional)', processed: true, recordCount: 2 },
    { name: 'Screen List Matrix VR2Screens.csv', type: 'other', size: '3 KB', uploaded: '2025-07-17', tag: 'Reference Data', processed: true }
  ];

  const getStatusBadge = (status: string | number) => {
    const badges = {
      'Not Started': 'bg-gray-100 text-gray-800',
      'Ready for Dispatch': 'bg-green-100 text-green-800',
      'Dispatched': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'Needs Review': 'bg-red-100 text-red-800'
    };
    return badges[status] || badges['Not Started'];
  };

  const handleCompleteApplication = () => {
    setCompletionStatus('complete');
    // Add activity log
    const newActivity = {
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      action: 'Application Marked Complete',
      details: 'Application verified and marked ready for dispatcher',
      user: 'J. Mitchell',
      type: 'completion',
      status: 'approved'
    };
    recentActivity.unshift(newActivity);
  };

  const handleDispatchApplication = () => {
    setCompletionStatus('dispatched');
    // Add activity log
    const newActivity = {
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      action: 'Application Dispatched',
      details: 'Application sent to dispatcher queue',
      user: 'J. Mitchell',
      type: 'dispatch',
      status: 'approved'
    };
    recentActivity.unshift(newActivity);
  };

  const handleUndoCompletion = () => {
    setCompletionStatus('incomplete');
    // Add activity log
    const newActivity = {
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      action: 'Completion Undone',
      details: 'Application moved back to preparation',
      user: 'J. Mitchell',
      type: 'undo',
      status: 'approved'
    };
    recentActivity.unshift(newActivity);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        from: 'J. Mitchell',
        to: 'Dispatcher',
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        message: newMessage,
        type: 'outgoing'
      };
      setMessages([...messages, message]);
      setNewMessage('');
      setShowMessageModal(false);
    }
  };

  const addComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: comments.length + 1,
        author: 'J. Mitchell',
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        comment: newComment,
        type: 'internal'
      };
      setComments([...comments, comment]);
      setNewComment('');
      setShowCommentsModal(false);
    }
  };

  const allValidationsPassed = () => {
    return Object.values(validationChecks).every(check => check.valid);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'company', label: 'Company Details', icon: Building },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'plants', label: 'Plants', icon: Building },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'ingredients', label: 'Ingredients', icon: Beaker },
    { id: 'quote', label: 'Quote', icon: FileText },
    { id: 'activity', label: 'Recent Activity', icon: AlertCircle },
    { id: 'files', label: 'File Management', icon: Upload }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application Review & Management</h1>
            <p className="text-gray-600">NCRC Preprocessing Interface</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Role Switcher for Demo */}
            {/*<select 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="admin">Admin</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="rfr">RFR</option>
              <option value="ncrc">NCRC</option>
            </select>*/}
            
            {/*userRole === 'admin' && (
              <button
                onClick={() => setShowAdminView(!showAdminView)}
                className="flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                {showAdminView ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showAdminView ? 'Hide Admin' : 'Show Admin'}
              </button>
            )*/}
            
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(applicationData.status)}`}>
              {applicationData.status}
            </span>
            {/*<button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              {editMode ? 'Save Changes' : 'Edit Mode'}
            </button>*/}
          </div>
        </div>
      </div>

      {/* Admin Completion Header - Only visible to admin */}
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
                <div className="flex items-center space-x-2">
                  {/*<button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Message Dispatcher
                  </button>*/}
                  <button
                    onClick={() => setShowCommentsModal(true)}
                    className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Comment
                  </button>
                </div>
              </div>

              {/* Validation Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.entries(validationChecks).map(([key, check]) => (
                  <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${
                    check.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {check.valid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium capitalize text-gray-900">{key.replace(/([A-Z])/g, ' $1')}</div>
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
                ))}
              </div>

              {/* Completion Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    allValidationsPassed() ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {allValidationsPassed() ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {completionStatus === 'incomplete' && 'Ready to Complete Application'}
                      {completionStatus === 'complete' && 'Application Completed - Ready for Dispatch'}
                      {completionStatus === 'dispatched' && 'Application Dispatched'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {completionStatus === 'incomplete' && 'All validations must pass before completion'}
                      {completionStatus === 'complete' && 'Click dispatch to send to reviewer queue'}
                      {completionStatus === 'dispatched' && 'Application is now in dispatcher queue'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {completionStatus === 'incomplete' && (
                    <button
                      onClick={handleCompleteApplication}
                      disabled={!allValidationsPassed()}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        allValidationsPassed()
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
          <div className="w-64 mr-8">
            <nav className="space-y-1">
              {tabs.map((tab) => {
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
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {activeTab === "overview" && <Overview application={applicationData} allValidationsPassed={allValidationsPassed()} />}

            {activeTab === 'company' && <CompanySection application={applicationData} editMode={editMode} />}

            {activeTab === 'contacts' && <ContactsSection application={applicationData} editMode={editMode} />}

            {activeTab === 'plants' && <PlantsSection application={applicationData} editMode={editMode} /> }

            {activeTab === 'products' && <ProductsTable application={applicationData} />}

            {activeTab === 'ingredients' && <IngredientMgmt application={applicationData} showRecentOnly={showRecentOnly} setShowRecentOnly={setShowRecentOnly} />}

            {activeTab === 'quote' && <QuoteInfo application={applicationData} quoteData={quoteData} setValidationChecks={setValidationChecks} />}

            {activeTab === 'activity' && <ActivityLog recentActivity={recentActivity} comments={comments} />}

            {activeTab === 'files' && <FilesList application={applicationData} uploadedFiles={uploadedFiles} />}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Message Dispatcher</h3>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter your message..."
              className="w-full p-3 border rounded-lg h-32 resize-none"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowMessageModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Internal Comment</h3>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Enter your comment..."
              className="w-full p-3 border rounded-lg h-32 resize-none"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowCommentsModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addComment}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};