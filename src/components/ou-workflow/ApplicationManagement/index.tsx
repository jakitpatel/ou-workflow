import React, { useState } from 'react';
import { Download, Edit, Upload, Tag, CheckCircle, AlertCircle, FileText, Building, Users, Package, Beaker, Clock, Send, MessageSquare, AlertTriangle, Check, X, Eye, EyeOff, User, Shield, Contact } from 'lucide-react';
import Overview from './Overview';
import CompanySection from './CompanySection';
import ContactsSection from './ContactsSection';
import PlantsSection from './PlantsSection';
import ProductsTable from './ProductsTable';
import ActivityLog from './ActivityLog';
import FilesList from './FilesList';

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

            {activeTab === 'company' && <CompanySection application={applicationData} editMode={editMode} />}

            {activeTab === 'contacts' && <ContactsSection application={applicationData} editMode={editMode} />}

            {activeTab === 'plants' && <PlantsSection application={applicationData} editMode={editMode} /> }

            {activeTab === 'products' && <ProductsTable application={applicationData} />}

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