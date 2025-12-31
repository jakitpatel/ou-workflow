import type { ApplicationDetail } from "@/types/application";
import { MapPin, User, Factory, CheckCircle, AlertCircle } from "lucide-react";

export default function PlantsSection({ 
  application, 
  editMode 
}: { 
  application: ApplicationDetail; 
  editMode: boolean 
}) {
  const plant = application?.plants?.[0];
  const plantAddresses = application?.plantAddresses || [];
  const physicalAddress = plantAddresses.find(
    (a) => a.type?.toLowerCase() === "physical"
  );
  const plantContacts = application?.plantContacts || [];
  const primaryContact = plantContacts.find(
    (c) => c.type?.toLowerCase() === "primary contact"
  );

  if (!plant) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Plant Information</h2>
        <div className="py-12 text-center">
          <div className="text-gray-400">
            <Factory className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No plant information available</p>
            <p className="text-xs mt-1">Plant details will appear here once added</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Plant Information</h2>
      </div>

      {/* Plant Header Card */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-lg font-semibold text-blue-900">
            Plant #{plant.id}: {plant.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-700">Plant ID:</span>
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-200 text-blue-900 rounded-md text-xs font-mono font-semibold">
              {plant.plantId}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Location Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Location Information
            </h4>
          </div>
          <div className="p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text"
                  value={physicalAddress?.street || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                <input
                  type="text"
                  value={physicalAddress?.line2 || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={physicalAddress?.city || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={physicalAddress?.state || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={physicalAddress?.zip || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={physicalAddress?.country || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Plant Manager Contact */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              Plant Manager
            </h4>
          </div>
          <div className="p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  type="text"
                  value={primaryContact?.name || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  type="text"
                  value={primaryContact?.role || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="text"
                  value={primaryContact?.phone || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={primaryContact?.email || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Manufacturing Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Factory className="h-4 w-4 text-purple-600" />
              Manufacturing Information
            </h4>
          </div>
          <div className="p-4 bg-white space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Process Description</label>
              <textarea
                value={plant.manufacturing?.process || ''}
                readOnly={!editMode}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                  editMode 
                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Closest Major City</label>
              <input
                type="text"
                value={plant.manufacturing?.closestMajorCity || ''}
                readOnly={!editMode}
                className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                  editMode 
                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">Additional Information</h4>
          </div>
          <div className="p-4 bg-white space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Other products manufactured in plant</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                plant.otherProducts 
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {plant.otherProducts ? 'Yes' : 'No'}
              </span>
            </div>
            
            {plant.otherProducts && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other Products List</label>
                <input
                  type="text"
                  value={plant.otherProductsList || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Other plant locations producing same products</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                plant.otherPlantsProducing 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {plant.otherPlantsProducing ? 'Yes' : 'No'}
              </span>
            </div>

            {plant.otherPlantsProducing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other Plant Locations</label>
                <input
                  type="text"
                  value={plant.otherPlantsLocation || ''}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg text-gray-900 ${
                    editMode 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Operational Status */}
        <div className="border border-green-200 rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-green-100">
          <div className="bg-green-100 px-4 py-3 border-b border-green-200">
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Operational Status
            </h4>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-green-700">Plant Status</span>
                <span className="inline-flex items-center px-2.5 py-1 bg-green-200 text-green-900 border border-green-300 rounded-full text-xs font-medium w-fit">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-green-700">Last Inspection</span>
                <span className="font-medium text-green-900">Pending</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-green-700">Compliance Status</span>
                <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full text-xs font-medium w-fit">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Under Review
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}