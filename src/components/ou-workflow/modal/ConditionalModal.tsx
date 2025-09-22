import React from "react";
import { X } from "lucide-react";

type Application = {
  company: string;
  assignee: string;
};

type SelectedAction = {
  application: Application;
  action: { id: string; label: string };
};

type Props = {
  showConditionModal: boolean;
  selectedAction: SelectedAction | null;
  setShowConditionModal: (val: boolean | null) => void;
  executeAction: (value: string) => void;
};

export const ConditionalModal: React.FC<Props> = ({
  showConditionModal,
  setShowConditionModal,
  selectedAction,
  executeAction,
}) => {
  if (!showConditionModal || !selectedAction) return null;

  const { application, action } = selectedAction;

  const handleCondition = (condition: "yes" | "no") => {
    executeAction(action.id, action, condition); // pass action id or any identifier
    setShowConditionModal(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {action.label}
            </h3>
            <button
              onClick={() => setShowConditionModal(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Application Info */}
          <div className="mb-4 text-sm text-gray-600">
            <p>
              Application:{" "}
              <span className="font-medium">{application.company}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => handleCondition("no")}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              No
            </button>
            <button
              onClick={() => handleCondition("yes")}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};