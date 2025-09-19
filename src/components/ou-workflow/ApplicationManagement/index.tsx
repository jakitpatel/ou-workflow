import React, { useState } from 'react';
import { Download, Edit, Upload, Tag, CheckCircle, AlertCircle, FileText, Building, Users, Package, Beaker, Clock, Send, MessageSquare, AlertTriangle, Check, X, Eye, EyeOff, User, Shield } from 'lucide-react';
import Overview from './Overview';

type Props = {
  application: ApplicationDetail;
};

export const ApplicationManagementInterface = ({ application }: Props) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const [userRole, setUserRole] = useState('admin'); // 'admin', 'dispatcher', 'rfr', 'ncrc'
  const [showAdminView, setShowAdminView] = useState(true);
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

  // Real extracted ingredient data from all Excel files - with tracking
  const ingredientData = [
    { source: 'File 1', ukdId: '', rmc: '', ingredient: 'Ryman Rye Grain', manufacturer: 'Jones Farms Organics', brand: 'Jones Farms Organics', packaging: 'bulk', agency: 'OU', addedDate: '2025-07-17', addedBy: 'System Import', status: 'Original', ncrcId: 'ING-2025-1001' },
    { source: 'File 1', ukdId: '', rmc: '', ingredient: 'Yecora Rojo Grain', manufacturer: 'Jones Farms Organics', brand: 'Jones Farms Organics', packaging: 'bulk', agency: 'OU', addedDate: '2025-07-17', addedBy: 'System Import', status: 'Original', ncrcId: 'ING-2025-1002' },
    { source: 'File 2', ukdId: '', rmc: '', ingredient: 'Durham Grain', manufacturer: 'cow & Livestock', brand: 'cow & Livestock', packaging: 'bulk', agency: 'OU', addedDate: '2025-07-17', addedBy: 'System Import', status: 'Original', ncrcId: 'ING-2025-1003' },
    { source: 'File 2', ukdId: '', rmc: '', ingredient: 'Purple Barley Grain', manufacturer: 'cow & Livestock', brand: 'cow & Livestock', packaging: 'bulk', agency: 'OU', addedDate: '2025-07-17', addedBy: 'System Import', status: 'Original', ncrcId: 'ING-2025-1004' },
    { source: 'File 2', ukdId: '', rmc: '', ingredient: 'Emmer Grain', manufacturer: 'cow Farms', brand: 'cow Farms', packaging: 'bulk', agency: 'OU', addedDate: '2025-07-17', addedBy: 'System Import', status: 'Original', ncrcId: 'ING-2025-1005' },
    { source: 'File 2', ukdId: '', rmc: '', ingredient: 'Einkorn Grain', manufacturer: 'cow Farms', brand: 'cow Farms', packaging: 'bulk', agency: 'OU', addedDate: '2025-07-17', addedBy: 'System Import', status: 'Original', ncrcId: 'ING-2025-1006' },
    { source: 'File 2', ukdId: '', rmc: '', ingredient: 'Spelt Grain', manufacturer: 'cow Farms', brand: 'cow Farms', packaging: 'bulk', agency: 'OU', addedDate: '2025-07-17', addedBy: 'System Import', status: 'Original', ncrcId: 'ING-2025-1007' },
    // Recently added ingredients
    { source: 'Manual Entry', ukdId: 'OUE9-VAN2024', rmc: '', ingredient: 'Natural Vanilla Extract', manufacturer: 'Premium Flavor Co', brand: 'Premium Flavor Co', packaging: 'Packaged', agency: 'OU', addedDate: '2025-07-18', addedBy: 'J. Mitchell', status: 'Recent', ncrcId: 'ING-2025-1008' },
    { source: 'Manual Entry', ukdId: '', rmc: '', ingredient: 'Organic Quinoa Flour', manufacturer: 'Andean Grains Ltd', brand: 'Andean Grains', packaging: 'bulk', agency: 'OU-P', addedDate: '2025-07-18', addedBy: 'G. Magder', status: 'Recent', ncrcId: 'ING-2025-1009' },
    { source: 'Supplier Update', ukdId: '', rmc: '', ingredient: 'Coconut Oil (Refined)', manufacturer: 'Tropical Oils Inc', brand: 'TropicalPure', packaging: 'Packaged', agency: 'OU', addedDate: '2025-07-18', addedBy: 'Auto-Sync', status: 'Recent', ncrcId: 'ING-2025-1010' }
  ];

  // Recent activity tracking
  const recentActivity = [
    { date: '2025-07-18 14:30', action: 'Ingredient Added', details: 'Natural Vanilla Extract (Premium Flavor Co)', user: 'J. Mitchell', type: 'ingredient', status: 'approved' },
    { date: '2025-07-18 13:15', action: 'Ingredient Added', details: 'Organic Quinoa Flour (Andean Grains Ltd)', user: 'G. Magder', type: 'ingredient', status: 'pending' },
    { date: '2025-07-18 11:45', action: 'Supplier Sync', details: 'Coconut Oil (Refined) auto-added from supplier portal', user: 'Auto-Sync', type: 'ingredient', status: 'approved' },
    { date: '2025-07-18 09:20', action: 'Plant Updated', details: 'Manufacturing process description revised', user: 'J. Mitchell', type: 'plant', status: 'approved' },
    { date: '2025-07-17 16:45', action: 'Initial Import', details: '7 ingredients imported from application submission', user: 'System Import', type: 'bulk', status: 'approved' },
    { date: '2025-07-17 16:30', action: 'Company Created', details: 'Happy Cow Mills Inc. added to Kashrus DB (KC-2025-4829)', user: 'System', type: 'company', status: 'approved' }
  ];

  // Real extracted product data
  const productData = application.products;
  /*[
    { source: 'Brands File 1', labelName: 'Yecora Rojo Flour', brandName: 'cow Mill', labelCompany: 'cow Mill', consumerIndustrial: 'C', bulkShipped: 'Y', symbol: 'OU' },
    { source: 'Brands File 1', labelName: 'Rye Flour', brandName: 'cow Mill', labelCompany: 'cow Mill', consumerIndustrial: 'C', bulkShipped: 'Y', symbol: 'OU' },
    { source: 'Form Data', labelName: 'cheese man', brandName: 'cheesy', labelCompany: 'Happy Cow Mills', consumerIndustrial: 'C', bulkShipped: 'Y', symbol: 'OU' },
    { source: 'Form Data', labelName: 'cheese chocolate', brandName: 'choccheese', labelCompany: 'Happy Cow Mills', consumerIndustrial: 'C', bulkShipped: 'Y', symbol: 'OU' }
  ];*/

  // Application data parsed from the PDF
  const applicationData = application;
  /*{
    status: completionStatus === 'incomplete' ? 'Not Started' : completionStatus === 'complete' ? 'Ready for Dispatch' : 'Dispatched',
    submissionDate: 'July 17, 2025',
    applicationId: 'APP-2025-0717-001',
    kashrusCompanyId: 'KC-2025-4829',
    kashrusStatus: 'Company Created',
    primaryContact: 'John Mitchell', // Designated for initial communication
    company: {
      name: 'Happy Cow Mills Inc.',
      category: 'Pharmaceutical / Nutraceutical',
      currentlyCertified: 'No',
      everCertified: 'No',
      address: {
        street: '1250 Industrial Parkway',
        line2: 'Building A, Suite 100',
        city: 'Rochester',
        state: 'NY',
        country: 'USA',
        zip: '14624'
      },
      website: 'www.happycowmills.com'
    },
    contacts: [
      {
        type: 'Primary Contact',
        name: 'John Mitchell',
        phone: '9176966517',
        email: 'john@happycowmills.com',
        designated: true // Marked as primary for initial communication
      },
      {
        type: 'Additional Contact',
        name: 'Gary Magder',
        title: 'Quality Assurance Manager',
        phone: '9176966517',
        email: 'gmagder@happycowmills.com',
        designated: false
      }
    ],
    plants: [
      {
        id: 1,
        plantId: 'PLT-KC-2025-4829-001', // NCRC Plant ID
        name: 'Happy Cow Mills Production Facility',
        address: {
          street: '1250 Industrial Parkway',
          line2: 'Building A, Suite 100',
          city: 'Rochester',
          state: 'NY',
          country: 'USA',
          province: 'N/A',
          region: 'Western New York',
          zip: '14624'
        },
        contact: {
          name: 'John Mitchell',
          title: 'Plant Manager',
          phone: '(585) 555-0123',
          email: 'j.mitchell@happycowmills.com'
        },
        manufacturing: {
          process: 'Grain cleaning, milling, and flour production. Raw grains are received in bulk, cleaned using mechanical separators, ground using stone mills, sifted through mesh screens, and packaged in food-grade containers. All processes follow HACCP guidelines.',
          closestMajorCity: 'Rochester, NY (15 miles)'
        },
        otherProducts: true,
        otherProductsList: 'Animal feed supplements, grain storage services',
        otherPlantsProducing: true,
        otherPlantsLocation: 'Secondary facility at 425a Commerce Drive, Rochester NY'
      }
    ],
    products: productData,
    preferences: {
      ownBrand: true,
      copackerDirectory: true,
      veganCertification: true,
      plantCount: 1
    }
  };*/

  const uploadedFiles = [
    { name: 'Application for OU Kosher Certification - Test.pdf', type: 'application', size: '245 KB', uploaded: '2025-07-17', tag: 'Application Form', processed: true },
    { name: 'happycow IngredientOUKosher.xlsx', type: 'ingredients', size: '12 KB', uploaded: '2025-07-17', tag: 'Ingredient List', processed: true, recordCount: 2 },
    { name: 'happycow BrandsOUKosher.xlsx', type: 'products', size: '8 KB', uploaded: '2025-07-17', tag: 'Brand/Product List', processed: true, recordCount: 2 },
    { name: 'Ingredient happycowOUKosher 1.xlsx', type: 'ingredients', size: '15 KB', uploaded: '2025-07-17', tag: 'Ingredient List (Additional)', processed: true, recordCount: 5 },
    { name: 'happycow BrandsOUKosher 1.xlsx', type: 'products', size: '9 KB', uploaded: '2025-07-17', tag: 'Brand/Product List (Additional)', processed: true, recordCount: 2 },
    { name: 'Screen List Matrix VR2Screens.csv', type: 'other', size: '3 KB', uploaded: '2025-07-17', tag: 'Reference Data', processed: true }
  ];

  const getFileIcon = (type) => {
    switch (type) {
      case 'application': return <FileText className="h-5 w-5 text-blue-600" />;
      case 'ingredients': return <Beaker className="h-5 w-5 text-green-600" />;
      case 'products': return <Package className="h-5 w-5 text-purple-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
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

  const downloadFile = async (fileName) => {
    try {
      const fileContent = await window.fs.readFile(fileName);
      const blob = new Blob([fileContent]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Application Review & Management</h1>
              <p className="text-gray-600">NCRC Preprocessing Interface</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Role Switcher for Demo */}
              <select 
                value={userRole} 
                onChange={(e) => setUserRole(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="admin">Admin</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="rfr">RFR</option>
                <option value="ncrc">NCRC</option>
              </select>
              
              {userRole === 'admin' && (
                <button
                  onClick={() => setShowAdminView(!showAdminView)}
                  className="flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {showAdminView ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showAdminView ? 'Hide Admin' : 'Show Admin'}
                </button>
              )}
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(applicationData.status)}`}>
                {applicationData.status}
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                {editMode ? 'Save Changes' : 'Edit Mode'}
              </button>
            </div>
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
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Message Dispatcher
                  </button>
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
            {activeTab === "overview" && <Overview application={applicationData} allValidationsPassed={allValidationsPassed} />}
            {/*activeTab === 'overview' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Application Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Application Status</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Kashrus DB Status:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {applicationData.kashrusStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Company ID:</span>
                        <span className="text-green-700 font-medium">{applicationData.kashrusCompanyId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Plant ID:</span>
                        <span className="text-green-700 font-medium">{applicationData.plants[0]?.plantId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Primary Contact:</span>
                        <span className="text-purple-700 font-medium">{applicationData.primaryContact}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Quote Status:</span>
                        <span className="text-yellow-600">Pending Acceptance</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Currently OU Certified:</span>
                        <span className="text-red-600">{applicationData.company.currentlyCertified}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Previously Certified:</span>
                        <span className="text-red-600">{applicationData.company.everCertified}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Quick Stats</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Plants:</span>
                        <span className="font-medium">{applicationData.preferences.plantCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Products:</span>
                        <span className="font-medium">{productData.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total Ingredients:</span>
                        <span className="font-medium">{ingredientData.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Recent Additions (24h):</span>
                        <span className="font-medium text-green-600">{ingredientData.filter(i => i.status === 'Recent').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>NCRC DB Records:</span>
                        <span className="font-medium text-blue-600">{ingredientData.filter(i => i.ncrcId).length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Uploaded Files:</span>
                        <span className="font-medium">{uploadedFiles.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Validation Status:</span>
                        <span className={`font-medium ${allValidationsPassed() ? 'text-green-600' : 'text-red-600'}`}>
                          {allValidationsPassed() ? 'All Passed' : 'Issues Found'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )*/}

            {activeTab === 'company' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Company Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={applicationData.company.name}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={applicationData.company.category}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={applicationData.company.address.street}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={applicationData.company.address.line2}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={applicationData.company.address.city}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={applicationData.company.address.state}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={applicationData.company.address.zip}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={applicationData.company.address.country}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="text"
                      value={applicationData.company.website}
                      readOnly={!editMode}
                      className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Kashrus Database Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Company ID:</span>
                      <span className="font-medium text-blue-900">{applicationData.kashrusCompanyId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Status:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Created:</span>
                      <span className="font-medium text-blue-900">July 17, 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Last Updated:</span>
                      <span className="font-medium text-blue-900">July 18, 2025</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
                <div className="space-y-6">
                  {applicationData.contacts.map((contact, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${contact.designated ? 'border-purple-200 bg-purple-50' : ''}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-900">{contact.type}</h3>
                        {contact.designated && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            ⭐ Primary for Initial Contact
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={contact.name}
                            readOnly={!editMode}
                            className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="text"
                            value={contact.phone}
                            readOnly={!editMode}
                            className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={contact.email}
                            readOnly={!editMode}
                            className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                          />
                        </div>
                        {contact.title && (
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                              type="text"
                              value={contact.title}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Contact Roles & Responsibilities</h3>
                  <div className="text-sm text-green-700">
                    <p><strong>Primary Contact (John Mitchell):</strong> Designated for all initial communications, quote discussions, and contract negotiations.</p>
                    <p className="mt-1"><strong>Quality Assurance (Gary Magder):</strong> Technical contact for ingredient specifications, manufacturing processes, and compliance questions.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'plants' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Plant Information</h2>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ In Kashrus DB
                    </span>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Building className="h-4 w-4 mr-2" />
                      View in Database
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  {applicationData.plants.map((plant, index) => (
                    <div key={index} className="border rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-900">Plant #{plant.id}: {plant.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Plant ID:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">
                            {plant.plantId}
                          </span>
                        </div>
                      </div>
                      
                      {/* Plant Location */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-3">Location Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                            <input
                              type="text"
                              value={plant.address.street}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                            <input
                              type="text"
                              value={plant.address.line2}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                              type="text"
                              value={plant.address.city}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                            <input
                              type="text"
                              value={plant.address.state}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                            <input
                              type="text"
                              value={plant.address.zip}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                            <input
                              type="text"
                              value={plant.address.country}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Plant Manager Contact */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-3">Plant Manager</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                            <input
                              type="text"
                              value={plant.contact.name}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                            <input
                              type="text"
                              value={plant.contact.title}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                              type="text"
                              value={plant.contact.phone}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                              type="email"
                              value={plant.contact.email}
                              readOnly={!editMode}
                              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Manufacturing Process */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-3">Manufacturing Information</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Process Description</label>
                          <textarea
                            value={plant.manufacturing.process}
                            readOnly={!editMode}
                            rows={4}
                            className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                          />
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Closest Major City</label>
                          <input
                            type="text"
                            value={plant.manufacturing.closestMajorCity}
                            readOnly={!editMode}
                            className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                          />
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-gray-800 mb-3">Additional Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Other products manufactured in plant:</span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                              {plant.otherProducts ? 'Yes' : 'No'}
                            </span>
                          </div>
                          {plant.otherProducts && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Other Products</label>
                              <input
                                type="text"
                                value={plant.otherProductsList}
                                readOnly={!editMode}
                                className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Other plant locations producing same products:</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {plant.otherPlantsProducing ? 'Yes' : 'No'}
                            </span>
                          </div>
                          {plant.otherPlantsProducing && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Other Plant Locations</label>
                              <input
                                type="text"
                                value={plant.otherPlantsLocation}
                                readOnly={!editMode}
                                className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Operational Status */}
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">Operational Status</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700">Status:</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Last Inspection:</span>
                            <span className="font-medium text-green-900">Pending</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">Compliance:</span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Under Review</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Product Information</h2>
                  <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Package className="h-4 w-4 mr-2" />
                    Add New Product
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{productData.length}</div>
                    <div className="text-sm text-blue-700">Total Products</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{productData.filter(p => p.consumerIndustrial === 'C').length}</div>
                    <div className="text-sm text-green-700">Consumer Products</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{productData.filter(p => p.bulkShipped === 'Y').length}</div>
                    <div className="text-sm text-purple-700">Bulk Shipped</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{productData.filter(p => p.source === 'Form Data').length}</div>
                    <div className="text-sm text-orange-700">From Application</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Source</th>
                        <th className="text-left py-3 px-4">Product Name</th>
                        <th className="text-left py-3 px-4">Brand Name</th>
                        <th className="text-left py-3 px-4">Label Company</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Bulk Shipped</th>
                        <th className="text-left py-3 px-4">Certification</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productData.map((product, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              product.source === 'Form Data' 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {product.source}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{product.labelName}</td>
                          <td className="py-3 px-4">{product.brandName}</td>
                          <td className="py-3 px-4">{product.labelCompany}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {product.consumerIndustrial === 'C' ? 'Consumer' : 'Industrial'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              product.bulkShipped === 'Y' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {product.bulkShipped === 'Y' ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              {product.symbol}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                              Submitted
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Product Specifications</h3>
                  <p className="text-sm text-blue-700">
                    All products are submitted for OU Kosher certification. Product specifications and 
                    ingredient lists have been uploaded and verified. Manufacturing processes documented 
                    for each product category.
                  </p>
                  <div className="mt-2 flex space-x-4 text-xs text-blue-600">
                    <span>• 2 Flour products from existing brands</span>
                    <span>• 2 New cheese-based products</span>
                    <span>• All products use verified kosher ingredients</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ingredients' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Ingredient Management</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Show:</label>
                      <button
                        onClick={() => setShowRecentOnly(!showRecentOnly)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          showRecentOnly 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {showRecentOnly ? 'Recent Only' : 'All Ingredients'}
                      </button>
                    </div>
                    <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <Beaker className="h-4 w-4 mr-2" />
                      Add New Ingredient
                    </button>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{ingredientData.length}</div>
                    <div className="text-sm text-blue-700">Total Ingredients</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{ingredientData.filter(i => i.status === 'Recent').length}</div>
                    <div className="text-sm text-green-700">Added This Week</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{ingredientData.filter(i => i.ncrcId).length}</div>
                    <div className="text-sm text-purple-700">In NCRC Database</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{ingredientData.filter(i => i.addedBy !== 'System Import').length}</div>
                    <div className="text-sm text-orange-700">Manual Additions</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">NCRC ID</th>
                        <th className="text-left py-3 px-4">Ingredient Name</th>
                        <th className="text-left py-3 px-4">Manufacturer</th>
                        <th className="text-left py-3 px-4">Brand</th>
                        <th className="text-left py-3 px-4">Packaging</th>
                        <th className="text-left py-3 px-4">Certification</th>
                        <th className="text-left py-3 px-4">Added Date</th>
                        <th className="text-left py-3 px-4">Added By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showRecentOnly ? ingredientData.filter(i => i.status === 'Recent') : ingredientData).map((ingredient, index) => (
                        <tr key={index} className={`border-b ${ingredient.status === 'Recent' ? 'bg-green-50' : ''}`}>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ingredient.status === 'Recent' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {ingredient.status === 'Recent' ? '🆕 New' : '📋 Original'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-blue-600 font-mono text-xs">{ingredient.ncrcId}</span>
                          </td>
                          <td className="py-3 px-4 font-medium">{ingredient.ingredient}</td>
                          <td className="py-3 px-4">{ingredient.manufacturer}</td>
                          <td className="py-3 px-4">{ingredient.brand}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              ingredient.packaging === 'bulk' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {ingredient.packaging}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              {ingredient.agency}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{ingredient.addedDate}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{ingredient.addedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>NCRC Database Integration:</strong> All ingredients automatically sync with NCRC database. 
                    Recent additions are highlighted and tracked for audit purposes. Ingredient certifications verified 
                    with suppliers and documentation uploaded.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Ingredient Sources</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <div>• 7 ingredients from uploaded spreadsheets</div>
                      <div>• 2 ingredients manually added by team</div>
                      <div>• 1 ingredient auto-synced from supplier portal</div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Kosher Status</h4>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div>• All ingredients OU certified</div>
                      <div>• 1 ingredient OU-P (Pareve) certified</div>
                      <div>• Certification documents uploaded and verified</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'quote' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Quote Information</h2>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800">Quote Requires Verification</h3>
                      <p className="text-yellow-700 text-sm mt-1">
                        Quote found in system but needs verification before application can be marked complete.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Quote Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quote Number:</span>
                        <span className="font-medium">{quoteData.quoteNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium text-green-600 text-lg">{quoteData.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valid Until:</span>
                        <span className="font-medium">{quoteData.validUntil}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          Pending Acceptance
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Quote Breakdown</h3>
                    <div className="space-y-3">
                      {quoteData.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{item.description}</span>
                          <span className="font-medium text-gray-900">{item.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <button
                    onClick={() => {
                      setValidationChecks(prev => ({
                        ...prev,
                        quote: { valid: true, message: 'Quote verified and accepted' }
                      }));
                    }}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Verify Quote
                  </button>
                  <div className="text-sm text-gray-600">
                    Last updated: July 17, 2025
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-6">Recent Activity & Change Log</h2>
                
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{recentActivity.filter(a => a.date.includes('2025-07-18')).length}</div>
                    <div className="text-sm text-green-700">Actions Today</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{recentActivity.filter(a => a.type === 'ingredient').length}</div>
                    <div className="text-sm text-blue-700">Ingredient Changes</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">{recentActivity.filter(a => a.user !== 'System' && a.user !== 'System Import').length}</div>
                    <div className="text-sm text-purple-700">Manual Updates</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">{recentActivity.filter(a => a.status === 'approved').length}</div>
                    <div className="text-sm text-orange-700">Approved Changes</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'ingredient' ? 'bg-green-100' :
                        activity.type === 'plant' ? 'bg-blue-100' :
                        activity.type === 'company' ? 'bg-purple-100' :
                        activity.type === 'completion' ? 'bg-green-100' :
                        activity.type === 'dispatch' ? 'bg-blue-100' :
                        activity.type === 'undo' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        {activity.type === 'ingredient' && <Beaker className="h-4 w-4 text-green-600" />}
                        {activity.type === 'plant' && <Building className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'company' && <Users className="h-4 w-4 text-purple-600" />}
                        {activity.type === 'bulk' && <Package className="h-4 w-4 text-gray-600" />}
                        {activity.type === 'completion' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {activity.type === 'dispatch' && <Send className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'undo' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{activity.action}</h3>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              activity.status === 'approved' ? 'bg-green-100 text-green-800' :
                              activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {activity.status}
                            </span>
                            <span className="text-xs text-gray-500">{activity.date}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Updated by:</span> {activity.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-800">NCRC Database Sync</h3>
                        <p className="text-blue-700 text-sm mt-1">
                          All changes are automatically synchronized with the NCRC database. 
                          Recent additions are tracked and auditable for compliance purposes.
                          <br />
                          <strong>Last Sync:</strong> 2025-07-18 14:35 • <strong>Status:</strong> Active
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-green-800">Internal Comments</h3>
                        <div className="space-y-2 mt-2">
                          {comments.map((comment, index) => (
                            <div key={index} className="text-sm text-green-700 border-l-2 border-green-300 pl-3">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{comment.author}</span>
                                <span className="text-xs text-green-600">{comment.date}</span>
                              </div>
                              <p className="mt-1">{comment.comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">File Management</h2>
                  <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Additional Files
                  </button>
                </div>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{uploadedFiles.length}</div>
                    <div className="text-sm text-blue-700">Total Files</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{uploadedFiles.filter(f => f.processed).length}</div>
                    <div className="text-sm text-green-700">Processed</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{uploadedFiles.filter(f => f.type === 'ingredients').length}</div>
                    <div className="text-sm text-purple-700">Ingredient Files</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">{uploadedFiles.filter(f => f.type === 'products').length}</div>
                    <div className="text-sm text-orange-700">Product Files</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        {getFileIcon(file.type)}
                        <div>
                          <h3 className="font-medium text-gray-900">{file.name}</h3>
                          <p className="text-sm text-gray-600">
                            {file.size} • Uploaded {file.uploaded}
                            {file.recordCount && (
                              <span className="ml-2 text-green-600">
                                • {file.recordCount} records extracted
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            file.type === 'ingredients' ? 'bg-green-100 text-green-800' :
                            file.type === 'products' ? 'bg-purple-100 text-purple-800' :
                            file.type === 'application' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {file.tag}
                          </span>
                          {file.processed && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs ml-2">
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              Processed
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => downloadFile(file.name)}
                          className="flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-green-800">Processing Complete</h3>
                        <p className="text-green-700 text-sm mt-1">
                          All uploaded files have been successfully processed and normalized. 
                          <br />
                          <strong>Data extracted:</strong> {ingredientData.length} ingredients, {productData.length} products from {uploadedFiles.filter(f => f.processed).length} files.
                          <br />
                          <strong>Ready for NCRC review.</strong> All ingredient and product data has been cross-referenced and validated.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-800">Document Classification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm text-blue-700">
                          <div>
                            <strong>Application Documents:</strong>
                            <ul className="ml-4 list-disc">
                              <li>Main application form (PDF)</li>
                              <li>Quote documentation</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Technical Documents:</strong>
                            <ul className="ml-4 list-disc">
                              <li>Ingredient specifications (2 Excel files)</li>
                              <li>Product/brand listings (2 Excel files)</li>
                              <li>Reference data matrices</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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