import React from "react";
import type { ApplicationDetail } from "./../../../types/application";

export default function Overview({ application, allValidationsPassed }: { application: ApplicationDetail, allValidationsPassed: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Application Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <h3 className="font-medium text-gray-900 mb-3">Application Status</h3>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                <span>Kashrus DB Status:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    {application.kashrusStatus}
                </span>
                </div>
                <div className="flex items-center justify-between">
                <span>Company ID:</span>
                <span className="text-green-700 font-medium">{application.kashrusCompanyId}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Plant ID:</span>
                <span className="text-green-700 font-medium">{application.plants[0]?.plantId}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Primary Contact:</span>
                <span className="text-purple-700 font-medium">{application.primaryContact}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Quote Status:</span>
                <span className="text-yellow-600">Pending Acceptance</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Currently OU Certified:</span>
                <span className="text-red-600">{application.company.currentlyCertified}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Previously Certified:</span>
                <span className="text-red-600">{application.company.everCertified}</span>
                </div>
            </div>
            </div>
            <div>
            <h3 className="font-medium text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                <span>Plants:</span>
                <span className="font-medium">{application.preferences?.plantCount}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Total Products:</span>
                <span className="font-medium">{application.products?.length}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Total Ingredients:</span>
                <span className="font-medium">{application.ingredients?.length}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Recent Additions (24h):</span>
                <span className="font-medium text-green-600">{application.ingredients?.filter(i => i.status === 'Recent').length}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>NCRC DB Records:</span>
                <span className="font-medium text-blue-600">{application.ingredients?.filter(i => i.ncrcId).length}</span>
                </div>
                <div className="flex items-center justify-between">
                <span>Uploaded Files:</span>
                <span className="font-medium">{application.uploadedFiles?.length}</span>
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
  );
}
