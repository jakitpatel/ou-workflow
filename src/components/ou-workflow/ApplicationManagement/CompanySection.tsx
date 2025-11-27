import type { ApplicationDetail } from "@/types/application";

export default function CompanySection({ application, editMode }: { application: ApplicationDetail, editMode: boolean }) {
  const company = application?.company?.[0];
  const companyAddresses = application?.companyAddresses || [];
  const physicalAddress = companyAddresses.find(
    (a) => a.type?.toLowerCase() === "physical"
  );
  // ✅ Handle missing data gracefully
  if (!company) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No company information available.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Company Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={company.name}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={company.category}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={physicalAddress?.street ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
            <input
              type="text"
              value={physicalAddress?.line2 ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={physicalAddress?.city ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={physicalAddress?.state ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
            <input
              type="text"
              value={physicalAddress?.zip ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={physicalAddress?.country ?? ""}
              readOnly={!editMode}
              className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="text"
              value={company.website}
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
              <span className="font-medium text-blue-900">{application.kashrusCompanyId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Status:</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{application.kashrusStatus}</span>
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
  );
}