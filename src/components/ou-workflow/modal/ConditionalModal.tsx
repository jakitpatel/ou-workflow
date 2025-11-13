import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

type Application = {
  company: string;
  companyName?: string;
  assignee: string;
};

type SelectedAction = {
  application: Application;
  action: {
    id: string;
    name: string;
    taskType?: string;
    taskCategory?: string;
    taskName?: string;
    TaskCategory?: string;
  };
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
  selectedAction,
  setShowConditionModal,
  executeAction,
}) => {
  if (!showConditionModal || !selectedAction) return null;

  const { application, action } = selectedAction;

  const modalRef = useRef<HTMLDivElement>(null);

  const [feeValue, setFeeValue] = useState("0");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [error, setError] = useState("");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [saving, setSaving] = useState(false);

  const taskName = action?.name || action?.taskName || "Action";
  const companyName =
    application?.company || application?.companyName || "Unknown Company";

  const taskCategory =
    action.taskCategory?.toLowerCase() ||
    action.TaskCategory?.toLowerCase() ||
    "";

  // Conditions
  const isFeeStructure =
    action.taskType?.toLowerCase() === "action" &&
    taskCategory === "selector" &&
    taskName.toLowerCase().includes("assign fee structure");

  const isInvoiceAmount =
    action.taskType?.toLowerCase() === "action" &&
    taskCategory === "input" &&
    taskName.toLowerCase().includes("assign invoice amount");

  const isScheduling =
    action.taskType?.toLowerCase() === "action" &&
    taskCategory === "scheduling";

  const isProgressTask =
    action.taskType?.toLowerCase() === "progress" &&
    taskCategory === "progress_task";

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setShowConditionModal(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saving, setShowConditionModal]);

  // Close when clicking outside modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (
      !saving &&
      modalRef.current &&
      !modalRef.current.contains(e.target as Node)
    ) {
      setShowConditionModal(null);
    }
  };

  const handleSave = async (value: string) => {
    setSaving(true);
    await executeAction(action.id, action, value);
    setSaving(false);
    setShowConditionModal(null);
    setInvoiceAmount("");
    setError("");
  };

  const handleInvoiceChange = (val: string) => {
    if (/^\d*$/.test(val)) {
      setInvoiceAmount(val);
      setError("");
    } else {
      setError("Please enter a valid whole number");
    }
  };

  const isValidInvoice = invoiceAmount !== "" && /^\d+$/.test(invoiceAmount);
  const isValidSchedule = scheduledDateTime !== "";

  const handleProgressStatus = async (status: string) => {
    setSaving(true);
    await executeAction(action.id, action, status);
    setSaving(false);
    setShowConditionModal(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl p-6 max-w-md w-full shadow-xl animate-scaleIn"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setShowConditionModal(null)}
          disabled={saving}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 disabled:opacity-40"
        >
          <X size={22} />
        </button>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {taskName}
        </h3>

        {/* Application Info */}
        <div className="mb-4 text-sm text-gray-700">
          <p>
            Application:{" "}
            <span className="font-medium">{companyName}</span>
          </p>

          {isProgressTask && (
            <p>
              Current Assignee:{" "}
              <span className="font-medium">{application.assignee}</span>
            </p>
          )}
        </div>

        {/* Conditional UI Render */}
        {isFeeStructure && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Fee Structure
            </label>

            <select
              value={feeValue}
              disabled={saving}
              onChange={(e) => setFeeValue(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-6"
            >
              <option value="0">LOW</option>
              <option value="1">MED</option>
              <option value="2">HIGH</option>
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConditionModal(null)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                onClick={() => handleSave(feeValue)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                Save
              </button>
            </div>
          </>
        )}

        {isInvoiceAmount && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Invoice Amount
            </label>

            <input
              type="text"
              value={invoiceAmount}
              disabled={saving}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-1"
              placeholder="Enter amount"
            />

            {error && (
              <p className="text-xs text-red-500 mb-4">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConditionModal(null)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                onClick={() => handleSave(invoiceAmount)}
                disabled={!isValidInvoice || saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                Save
              </button>
            </div>
          </>
        )}

        {isScheduling && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date & Time
            </label>

            <input
              type="datetime-local"
              value={scheduledDateTime}
              disabled={saving}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConditionModal(null)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                onClick={() => handleSave(scheduledDateTime)}
                disabled={!isValidSchedule || saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                Save
              </button>
            </div>
          </>
        )}

        {isProgressTask && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Update Status:
            </label>

            {["completed", "in_progress", "pending"].map((status) => (
              <button
                key={status}
                disabled={saving}
                onClick={() => handleProgressStatus(status)}
                className={`w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 ${
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
        )}

        {/* Default Yes / No */}
        {!isFeeStructure &&
          !isInvoiceAmount &&
          !isScheduling &&
          !isProgressTask && (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleSave("no")}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
              >
                No
              </button>

              <button
                onClick={() => handleSave("yes")}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}
                Yes
              </button>
            </div>
          )}
      </div>
    </div>
  );
};