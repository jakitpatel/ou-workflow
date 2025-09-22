import { AlertTriangle, Beaker, Building, CheckCircle, MessageSquare, Package, Send, Users } from "lucide-react";
import React from "react";

export default function ActivityLog({ recentActivity, comments }: { recentActivity: any[], comments: any[] }) {
  return (
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
  );
}