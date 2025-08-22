import React from 'react'
import { ArrowLeft, FileText, ExternalLink, Download, Mail, Package, Bell, Users } from 'lucide-react'

type Props = {
  selectedIngredientApp: any
  setShowIngredientsManager: (val: boolean) => void
}

export function IngredientsManagerPage({ selectedIngredientApp, setShowIngredientsManager }: Props) {
  // your big JSX from before...
  // Sample ingredients data with OU Schedule A structure
    const sampleIngredients = [
      {
        id: 1,
        name: 'Enriched Wheat Flour',
        supplierName: 'General Mills',
        category: 'Base Ingredients',
        dairyStatus: 'Pareve',
        groupDesignation: 1,
        status: 'approved',
        assignedTo: 'R. Gorelik (RC)',
        lastUpdated: '2025-06-23',
        communicationCount: 0,
        notes: 'Approved on Schedule A - Group 1 (no symbol required)',
        issueType: null,
        daysActive: 0,
        specificRequirements: 'None',
        scheduleStatus: 'On Schedule A'
      },
      {
        id: 2,
        name: 'High Fructose Corn Syrup',
        supplierName: 'Cargill Inc.',
        category: 'Sweeteners',
        dairyStatus: 'Pareve',
        groupDesignation: 3,
        status: 'pending_schedule_approval',
        assignedTo: 'R. Herbsman (IAR)',
        lastUpdated: '2025-06-20',
        communicationCount: 2,
        notes: 'Requires OU symbol verification - Group 3',
        issueType: 'Symbol Verification Required',
        daysActive: 5,
        specificRequirements: 'Must bear OU symbol',
        scheduleStatus: 'Pending Schedule A'
      },
      {
        id: 3,
        name: 'Natural Vanilla Flavoring',
        supplierName: 'McCormick & Co.',
        category: 'Flavoring',
        dairyStatus: 'Pareve',
        groupDesignation: 3,
        status: 'supplier_not_approved',
        assignedTo: 'R. Gorelik (RC)',
        lastUpdated: '2025-06-18',
        communicationCount: 3,
        notes: 'Supplier not on approved list - awaiting alternate supplier',
        issueType: 'Supplier Not Approved',
        daysActive: 7,
        specificRequirements: 'Must bear OU symbol',
        scheduleStatus: 'Blocked - Supplier Issue'
      },
      {
        id: 4,
        name: 'Calcium Propionate',
        supplierName: 'Kemin Industries',
        category: 'Preservatives',
        dairyStatus: 'Pareve',
        groupDesignation: 1,
        status: 'name_verification',
        assignedTo: 'R. Rabinowitz (Products)',
        lastUpdated: '2025-06-22',
        communicationCount: 1,
        notes: 'Verifying exact name match with delivered product',
        issueType: 'Name Match Verification',
        daysActive: 3,
        specificRequirements: 'None',
        scheduleStatus: 'Under Review'
      },
      {
        id: 5,
        name: 'Soy Lecithin',
        supplierName: 'ADM',
        category: 'Emulsifiers',
        dairyStatus: 'Pareve',
        groupDesignation: 1,
        status: 'approved',
        assignedTo: 'R. Herbsman (IAR)',
        lastUpdated: '2025-06-21',
        communicationCount: 0,
        notes: 'Approved on Schedule A - Group 1',
        issueType: null,
        daysActive: 0,
        specificRequirements: 'None',
        scheduleStatus: 'On Schedule A'
      },
      {
        id: 6,
        name: 'Fresh Basil',
        supplierName: 'Local Farms Co.',
        category: 'Herbs & Spices',
        dairyStatus: 'Pareve',
        groupDesignation: 2,
        status: 'requires_inspection',
        assignedTo: 'R. Gorelik (RC)',
        lastUpdated: '2025-06-15',
        communicationCount: 4,
        notes: 'Requires pre-use rabbinic inspection per Schedule A',
        issueType: 'Rabbinic Inspection Required',
        daysActive: 10,
        specificRequirements: 'Pre-use rabbinic inspection',
        scheduleStatus: 'Conditional Approval'
      },
      {
        id: 7,
        name: 'Papaya Powder',
        supplierName: 'Tropical Foods Inc.',
        category: 'Fruit Products',
        dairyStatus: 'Pareve',
        groupDesignation: 1,
        status: 'missing_kosher_code',
        assignedTo: 'R. Herbsman (IAR)',
        lastUpdated: '2025-06-19',
        communicationCount: 2,
        notes: 'Missing required 6-digit kosher code in certification',
        issueType: 'Missing Kosher Code',
        daysActive: 6,
        specificRequirements: '6-digit kosher code required',
        scheduleStatus: 'Documentation Issue'
      }
    ];

    const getStatusColor = (status) => {
      switch(status) {
        case 'approved': return 'bg-green-50 text-green-700 border-green-200';
        case 'name_verification': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'pending_schedule_approval': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'supplier_not_approved': return 'bg-red-50 text-red-700 border-red-200';
        case 'requires_inspection': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'missing_kosher_code': return 'bg-orange-50 text-orange-700 border-orange-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
      }
    };

    const getStatusLabel = (status) => {
      switch(status) {
        case 'approved': return 'Approved';
        case 'name_verification': return 'Name Verification';
        case 'pending_schedule_approval': return 'Pending Schedule A';
        case 'supplier_not_approved': return 'Supplier Not Approved';
        case 'requires_inspection': return 'Requires Inspection';
        case 'missing_kosher_code': return 'Missing Kosher Code';
        default: return 'Under Review';
      }
    };

    const getGroupLabel = (group) => {
      switch(group) {
        case 1: return 'Group 1 (No Symbol)';
        case 2: return 'Group 2 (Internal/Confidential)';
        case 3: return 'Group 3 (OU Symbol Required)';
        case 4: return 'Group 4 (Bulk/Special)';
        case 5: return 'Group 5 (Specialized)';
        case 6: return 'Group 6 (Restricted)';
        default: return 'Group TBD';
      }
    };

    const completedCount = sampleIngredients.filter(i => i.status === 'approved').length;
    const progressPercentage = Math.round((completedCount / sampleIngredients.length) * 100);

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowIngredientsManager(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedIngredientApp?.company} - Ingredients Management</h1>
                  <p className="text-gray-600">{selectedIngredientApp?.plant} • {selectedIngredientApp?.region}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Progress</div>
                  <div className="text-lg font-bold text-gray-900">{progressPercentage}% Complete</div>
                  <div className="text-xs text-gray-500">{completedCount} of {sampleIngredients.length} ingredients</div>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Original Docs
                  </button>
                  <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    <ExternalLink className="w-4 h-4 inline mr-1" />
                    Customer Portal
                  </button>
                  <button className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                    <Download className="w-4 h-4 inline mr-1" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-6">
            {/* Main Ingredients Section */}
            <div className="flex-1">
              <div className="space-y-4">
                {sampleIngredients.map((ingredient) => (
                  <div key={ingredient.id} className={`border-2 rounded-lg p-4 ${getStatusColor(ingredient.status)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="font-medium text-gray-900">{ingredient.name}</h4>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {ingredient.category}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(ingredient.status)}`}>
                            {getStatusLabel(ingredient.status)}
                          </span>
                        </div>
                        
                        {/* Schedule A Information Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-600 font-medium">Supplier:</span>
                            <div className="text-gray-900">{ingredient.supplierName}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Dairy Status:</span>
                            <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${
                              ingredient.dairyStatus === 'Dairy' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {ingredient.dairyStatus}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Group:</span>
                            <div className="text-gray-900">{getGroupLabel(ingredient.groupDesignation)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Schedule Status:</span>
                            <div className={`text-sm font-medium ${
                              ingredient.scheduleStatus === 'On Schedule A' ? 'text-green-600' :
                              ingredient.scheduleStatus.includes('Blocked') ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {ingredient.scheduleStatus}
                            </div>
                          </div>
                        </div>

                        {/* Specific Requirements */}
                        {ingredient.specificRequirements && ingredient.specificRequirements !== 'None' && (
                          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <span className="text-xs font-medium text-yellow-800">Requirements:</span>
                            <div className="text-xs text-yellow-700 mt-1">{ingredient.specificRequirements}</div>
                          </div>
                        )}

                        {/* Assignment and Timeline */}
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-600 font-medium">Assigned to:</span>
                            <div className="text-gray-900">{ingredient.assignedTo}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 font-medium">Last Updated:</span>
                            <div className="text-gray-900">{ingredient.lastUpdated}</div>
                          </div>
                        </div>

                        {/* Issue Information */}
                        {ingredient.issueType && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                            <span className="text-xs font-medium text-red-800">Issue:</span>
                            <div className="text-xs text-red-700 mt-1">{ingredient.issueType}</div>
                          </div>
                        )}

                        {/* Days Active */}
                        {ingredient.daysActive > 0 && (
                          <div className="mb-3">
                            <span className={`text-sm font-medium ${
                              ingredient.daysActive > 7 ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {ingredient.daysActive} days active
                            </span>
                          </div>
                        )}

                        {/* Notes */}
                        {ingredient.notes && (
                          <div className="text-sm bg-gray-50 p-2 rounded">
                            <span className="text-gray-600 font-medium">Notes:</span>
                            <div className="text-gray-700 mt-1">{ingredient.notes}</div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {ingredient.communicationCount > 0 && (
                          <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            {ingredient.communicationCount} emails
                          </div>
                        )}
                        <div className="flex flex-col space-y-1">
                          <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors">
                            View Schedule A
                          </button>
                          {ingredient.status !== 'approved' && (
                            <button className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors">
                              Request Update
                            </button>
                          )}
                          <button className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors">
                            Add Note
                          </button>
                          {ingredient.status === 'requires_inspection' && (
                            <button className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors">
                              Schedule Inspection
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar - Communication & Collaboration */}
            <div className="w-80 bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-medium text-gray-900 mb-4">Communication & Collaboration</h3>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-lg font-bold text-red-600">{sampleIngredients.filter(i => i.status === 'needs_followup' || i.status === 'missing_info').length}</div>
                  <div className="text-xs text-gray-600">Need Attention</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-lg font-bold text-blue-600">{sampleIngredients.reduce((sum, i) => sum + i.communicationCount, 0)}</div>
                  <div className="text-xs text-gray-600">Total Emails</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-gray-800 text-sm">Quick Actions</h4>
                <button className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email All Missing Items
                </button>
                <button className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm">
                  <Bell className="w-4 h-4 inline mr-2" />
                  Send Follow-up Reminders
                </button>
                <button className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm">
                  <Users className="w-4 h-4 inline mr-2" />
                  Team Meeting Request
                </button>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="font-medium text-gray-800 text-sm mb-3">Recent Activity</h4>
                <div className="space-y-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded border">
                    <div className="font-medium">R. Gorelik</div>
                    <div className="text-gray-600">Sent follow-up for Natural Vanilla Flavoring</div>
                    <div className="text-gray-500">2 hours ago</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <div className="font-medium">R. Herbsman</div>
                    <div className="text-gray-600">Approved High Fructose Corn Syrup with notes</div>
                    <div className="text-gray-500">1 day ago</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <div className="font-medium">R. Rabinowitz</div>
                    <div className="text-gray-600">Started review of Calcium Propionate</div>
                    <div className="text-gray-500">2 days ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}
