import React from 'react';
import { X } from 'lucide-react';

type Task = {
  name: string;
  assignee: string;
};

type SelectedAction = {
  task: Task;
  action: 'assign_rc' | 'assign_department' | 'update_status';
};

type RcLookupItem = {
  id: string;
  name: string;
  specialty: string;
  workload: string;
};

type DepartmentLookupItem = {
  id: string;
  name: string;
  contact: string;
  avgTime: string;
};

type Props = {
  showActionModal: boolean;
  selectedAction: SelectedAction | null;
  setShowActionModal: (val: boolean | null) => void;
  executeAction: (value: string) => void;
  rcLookup: RcLookupItem[];
  departmentLookup: DepartmentLookupItem[];
};

export const ActionModal: React.FC<Props> = ({
  showActionModal,
  selectedAction,
  setShowActionModal,
  executeAction,
  rcLookup,
  departmentLookup
}) => {
  if (!showActionModal || !selectedAction) return null;

  const { task, action } = selectedAction;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {action === 'assign_rc'
                ? 'Assign Rabbinic Coordinator'
                : action === 'assign_department'
                ? 'Assign to Department'
                : action === 'update_status'
                ? 'Update Task Status'
                : 'Task Action'}
            </h3>
            <button
              onClick={() => setShowActionModal(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Task Info */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Task: <span className="font-medium">{task.name}</span>
            </p>
            <p className="text-sm text-gray-600">
              Current Assignee: <span className="font-medium">{task.assignee}</span>
            </p>
          </div>

          {/* Action Sections */}
          {action === 'update_status' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Update Status:</label>
              {['completed', 'in_progress', 'pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => executeAction(status)}
                  className={`w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                    status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : status === 'in_progress'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <span className="font-medium capitalize">{status.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          )}

          {action === 'assign_rc' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Select Rabbinic Coordinator:</label>
              {rcLookup.map((rc) => (
                <button
                  key={rc.id}
                  onClick={() => executeAction(rc.name)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{rc.name}</div>
                  <div className="text-sm text-gray-500">
                    {rc.specialty} • Workload: {rc.workload}
                  </div>
                </button>
              ))}
            </div>
          )}

          {action === 'assign_department' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Select Department:</label>
              {departmentLookup.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => executeAction(dept.name)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{dept.name}</div>
                  <div className="text-sm text-gray-500">
                    {dept.contact} • Avg: {dept.avgTime}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};