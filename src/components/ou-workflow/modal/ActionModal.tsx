import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useRCNames } from '@/components/ou-workflow/hooks/useTaskDashboardHooks'; // adjust path if needed

type Application = {
  company: string;
  assignee: string;
};

type SelectedAction = {
  application: Application;
  action: { id: string; label: string };
};

type Props = {
  showActionModal: boolean;
  selectedAction: SelectedAction | null;
  setShowActionModal: (val: boolean | null) => void;
  executeAction: (value: string, action: { id: string; label: string }) => void;
};

type RcLookupItem = {
  id: string;
  name: string;
  specialty: string;
  workload: string;
};

export const ActionModal: React.FC<Props> = ({
  showActionModal,
  setShowActionModal,
  selectedAction,
  executeAction,
}) => {
  if (!showActionModal || !selectedAction) return null;

  // ✅ Lazy-load RCs only when modal is open
  const { data: rcnames = [], isLoading } = useRCNames({
    enabled: showActionModal,
  });

  const { application, action } = selectedAction;
  const [selectedRc, setSelectedRc] = useState<string>("");

  const handleSave = () => {
    if (selectedRc) {
      executeAction(selectedRc, action);
      setShowActionModal(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{action.label}</h3>
            <button
              onClick={() => setShowActionModal(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Application Info */}
          <div className="mb-4 text-sm text-gray-600">
            <p>
              Application: <span className="font-medium">{application.company}</span>
            </p>
          </div>

          {/* RC Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Name:
            </label>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading RC names...</p>
            ) : (
              <select
                value={selectedRc}
                onChange={(e) => setSelectedRc(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Choose --</option>
                {rcnames.map((rc: RcLookupItem) => (
                  <option key={rc.id} value={rc.name}>
                    {rc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowActionModal(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedRc}
              className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${
                selectedRc ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};