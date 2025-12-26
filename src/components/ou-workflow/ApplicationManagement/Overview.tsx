import type { ApplicationDetail } from "@/types/application";

export default function Overview({ 
  application, 
  allValidationsPassed 
}: { 
  application: ApplicationDetail, 
  allValidationsPassed: boolean 
}) {
  const company = application?.company?.[0];
  const plant = application?.plants?.[0];
  
  // Calculate statistics
  const stats = {
    plantCount: application.preferences?.plantCount || 0,
    productCount: application.products?.length || 0,
    ingredientCount: application.ingredients?.length || 0,
    recentAdditions: application.ingredients?.filter(i => i.status === 'Recent').length || 0,
    ncrcRecords: application.ingredients?.filter(i => i.ncrcId).length || 0,
    uploadedFiles: application.files?.length || 0
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Application Overview</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Status Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-6 bg-blue-600 rounded"></span>
            <h3 className="font-semibold text-gray-900 text-lg">Application Status</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Kashrus DB Status</span>
              <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-semibold">
                {application.kashrusStatus}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Company ID</span>
              <span className="text-sm font-semibold text-green-700">
                {application.kashrusCompanyId}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Plant ID</span>
              <span className="text-sm font-semibold text-green-700">
                {plant?.plantId || '—'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Primary Contact</span>
              <span className="text-sm font-semibold text-purple-700">
                {application.primaryContact}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Quote Status</span>
              <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full text-xs font-semibold">
                Pending Acceptance
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Currently OU Certified</span>
              <span className={`text-sm font-semibold ${
                company?.currentlyCertified === 'Yes' ? 'text-green-600' : 'text-red-600'
              }`}>
                {company?.currentlyCertified || 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-600">Previously Certified</span>
              <span className={`text-sm font-semibold ${
                company?.everCertified === 'Yes' ? 'text-green-600' : 'text-red-600'
              }`}>
                {company?.everCertified || 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-6 bg-purple-600 rounded"></span>
            <h3 className="font-semibold text-gray-900 text-lg">Quick Stats</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Plants</span>
              <span className="text-lg font-bold text-gray-900">{stats.plantCount}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total Products</span>
              <span className="text-lg font-bold text-gray-900">{stats.productCount}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total Ingredients</span>
              <span className="text-lg font-bold text-gray-900">{stats.ingredientCount}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Recent Additions (24h)</span>
              <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-bold">
                {stats.recentAdditions}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">NCRC DB Records</span>
              <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-bold">
                {stats.ncrcRecords}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Uploaded Files</span>
              <span className="text-lg font-bold text-gray-900">{stats.uploadedFiles}</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-600">Validation Status</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                allValidationsPassed 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
              }`}>
                {allValidationsPassed ? '✓ All Passed' : '⚠ Issues Found'}
              </span>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}