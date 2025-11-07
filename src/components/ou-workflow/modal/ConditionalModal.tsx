import React, { useState } from "react";
import { X } from "lucide-react";

type Application = {
  company: string;
  companyName?: string;
  assignee: string;
};

type SelectedAction = {
  application: Application;
  action: { id: string; name: string; taskType?: string; taskCategory?: string; taskName?: string; TaskCategory?: string };
};

type Props = {
  showConditionModal: boolean | null;
  selectedAction: SelectedAction | null;
  setShowConditionModal: (val: boolean | null) => void;
  executeAction: (
    id: string,
    action: { id: string; name: string },
    value: string
  ) => void;
};

export const ConditionalModal: React.FC<Props> = ({
  showConditionModal,
  setShowConditionModal,
  selectedAction,
  executeAction,
}) => {
  const [feeValue, setFeeValue] = useState<string>("0");
  const [invoiceAmount, setInvoiceAmount] = useState<string>("");
  const [error, setError] = useState<string>("");

  // ✅ New state for DateTime picker
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");

  if (!showConditionModal || !selectedAction) return null;

  const { application, action } = selectedAction;
  const taskName = action?.name || action?.taskName || "Action"; 
  const companyName = application?.company || application?.companyName || "Unknown Company";
  const taskCategory =
    action.taskCategory?.toLowerCase() || action.TaskCategory?.toLowerCase();

  const handleSave = (value: string) => {
    executeAction(action.id, action, value);
    setShowConditionModal(null);
    setInvoiceAmount("");
    setError("");
  };

  const handleCondition = (condition: "yes" | "no") => {
    executeAction(action.id, action, condition);
    setShowConditionModal(null);
  };

  const isFeeStructure =
    action.taskType?.toLowerCase() === "action" &&
    taskCategory === "selector" &&
    taskName.toLowerCase().includes("assign fee structure");

  const isInvoiceAmount =
    action.taskType?.toLowerCase() === "action" &&
    taskCategory === "input" &&
    taskName.toLowerCase().includes("assign invoice amount");

  // ✅ New scheduling condition
  const isScheduling =
    action.taskType?.toLowerCase() === "action" &&
    taskCategory === "scheduling";

   // ✅ NEW: Progress Task condition
  const isProgressTask =
    action.taskType?.toLowerCase() === "progress" &&
    taskCategory === "progress_task";

  const handleInvoiceChange = (val: string) => {
    if (/^\d*$/.test(val)) {
      setInvoiceAmount(val);
      setError("");
    } else {
      setError("Please enter a valid whole number");
    }
  };

  const isValidInvoice = invoiceAmount !== "" && /^\d+$/.test(invoiceAmount);

  // ✅ Validate datetime field
  const isValidSchedule = scheduledDateTime !== "";

  const handleScheduleSave = () => {
    handleSave(scheduledDateTime);
  };

  // ✅ Common function for progress status
  const handleProgressStatus = (status: string) => {
    executeAction(action.id, action, status);
    setShowConditionModal(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{taskName}</h3>
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
              <span className="font-medium">{companyName}</span>
            </p>
            {/* ✅ Show current assignee for all progress actions */}
            {isProgressTask && (
              <p>
                Current Assignee:{" "}
                <span className="font-medium">{application.assignee}</span>
              </p>
            )}
          </div>

          {/* Conditional UI */}
          {isFeeStructure ? (
            <>
              {/* Fee Structure Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Fee Structure
                </label>
                <select
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="0">LOW</option>
                  <option value="1">MED</option>
                  <option value="2">HIGH</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConditionModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(feeValue)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </>
          ) : isInvoiceAmount ? (
            <>
              {/* Invoice Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Invoice Amount
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={invoiceAmount}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Enter amount"
                />
                {error && (
                  <p className="text-xs text-red-500 mt-1">{error}</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConditionModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(invoiceAmount)}
                  disabled={!isValidInvoice}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </>
          ) : isScheduling ? (
            <>
              {/* ✅ DateTime Picker Section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConditionModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSave}
                  disabled={!isValidSchedule}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </>
          ) : isProgressTask ? (
            <>
              {/* ✅ NEW: Progress Task Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Update Status:
                </label>
                {["completed", "in_progress", "pending"].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleProgressStatus(status)}
                    className={`w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                      status === "completed"
                        ? "border-green-200 bg-green-50"
                        : status === "in_progress"
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <span className="font-medium capitalize">
                      {status.replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
