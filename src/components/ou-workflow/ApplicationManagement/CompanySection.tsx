import type { ApplicationDetail } from "@/types/application";

export default function CompanySection({ 
  application, 
  editMode 
}: { 
  application: ApplicationDetail, 
  editMode: boolean 
}) {
  const company = application?.company?.[0];
  const companyAddresses = application?.companyAddresses || [];
  const physicalAddress = companyAddresses.find(
    (a) => a.type?.toLowerCase() === "physical"
  );

  // Handle missing data gracefully
  if (!company) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg mb-2">📋</div>
          <p className="text-gray-500 font-medium">No company information available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Company Information</h2>

      {/* Company Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Company Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Company Name
          </label>
          <input
            type="text"
            value={company.name}
            readOnly={!editMode}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
              editMode
                ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                : 'border-gray-200 bg-gray-50 text-gray-900'
            }`}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Category
          </label>
          <input
            type="text"
            value={company.category}
            readOnly={!editMode}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
              editMode
                ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                : 'border-gray-200 bg-gray-50 text-gray-900'
            }`}
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Street Address */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Street Address
            </label>
            <input
              type="text"
              value={physicalAddress?.street ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                editMode
                  ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
            />
          </div>

          {/* Address Line 2 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Address Line 2
            </label>
            <input
              type="text"
              value={physicalAddress?.line2 ?? ""}
              readOnly={!editMode}
              placeholder="Suite, Unit, Building, Floor, etc."
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                editMode
                  ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              City
            </label>
            <input
              type="text"
              value={physicalAddress?.city ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                editMode
                  ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              State
            </label>
            <input
              type="text"
              value={physicalAddress?.state ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                editMode
                  ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
            />
          </div>

          {/* ZIP Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              ZIP Code
            </label>
            <input
              type="text"
              value={physicalAddress?.zip ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                editMode
                  ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Country
            </label>
            <input
              type="text"
              value={physicalAddress?.country ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                editMode
                  ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Website */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Website
            </label>
            <input
              type="text"
              value={company.website}
              readOnly={!editMode}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                editMode
                  ? 'border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Kashrus Database Status */}
      <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            K
          </div>
          <h3 className="font-semibold text-blue-900">Kashrus Database Status</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
            <span className="text-sm font-medium text-blue-700">Company ID</span>
            <span className="text-sm font-bold text-blue-900">{application.kashrusCompanyId}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
            <span className="text-sm font-medium text-blue-700">Status</span>
            <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-semibold">
              {application.kashrusStatus}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
            <span className="text-sm font-medium text-blue-700">Created</span>
            <span className="text-sm font-bold text-blue-900">July 17, 2025</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
            <span className="text-sm font-medium text-blue-700">Last Updated</span>
            <span className="text-sm font-bold text-blue-900">July 18, 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
}