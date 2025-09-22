import React from "react";
import type { ApplicationDetail, Plant } from "./../../../types/application";
import { Building } from "lucide-react";

export default function PlantsSection({ application, editMode }: { application: ApplicationDetail; editMode: boolean }) {
  return (
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
        {application.plants.map((plant, index) => (
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
                    value={plant.contact?.name}
                    readOnly={!editMode}
                    className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={plant.contact?.title}
                    readOnly={!editMode}
                    className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={plant.contact?.phone}
                    readOnly={!editMode}
                    className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={plant.contact?.email}
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
                  value={plant.manufacturing?.process}
                  readOnly={!editMode}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Closest Major City</label>
                <input
                  type="text"
                  value={plant.manufacturing?.closestMajorCity}
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
  );
}
