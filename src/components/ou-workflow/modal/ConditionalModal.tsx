import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import type { Task, Applicant } from "@/types/application";

type SelectedAction = {
  application: Applicant | Task | any;
  action: {
    id: string;
    name: string;
    taskType?: string;
    taskCategory?: string;
    taskName?: string;
    TaskCategory?: string;
  } | Task | any;
};

type Props = {
  showConditionModal: boolean | null | Task;
  selectedAction: SelectedAction | null;
  setShowConditionModal: (val: boolean | null | Task) => void;
  executeAction: (
    id: string,
    action: { id: string; name?: string },
    value: string
  ) => void;
};

type ModalType = 
  | 'feeStructure' 
  | 'invoiceAmount' 
  | 'scheduling' 
  | 'progressTask' 
  | 'default';

export const ConditionalModal: React.FC<Props> = ({
  showConditionModal,
  selectedAction,
  setShowConditionModal,
  executeAction,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // 🔹 All state hooks at the top
  const [feeValue, setFeeValue] = useState("0");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [error, setError] = useState("");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [saving, setSaving] = useState(false);

  // 🔹 Memoized values to prevent recalculation
  const taskName = useMemo(() => {
    return selectedAction?.action?.name || 
           selectedAction?.action?.taskName || 
           "Action";
  }, [selectedAction?.action]);

  const companyName = useMemo(() => {
    return selectedAction?.application?.company || 
           selectedAction?.application?.companyName || 
           "Unknown Company";
  }, [selectedAction?.application]);

  const taskCategory = useMemo(() => {
    return selectedAction?.action?.taskCategory?.toLowerCase() ||
           selectedAction?.action?.TaskCategory?.toLowerCase() ||
           "";
  }, [selectedAction?.action]);

  const taskType = useMemo(() => {
    return selectedAction?.action?.taskType?.toLowerCase() || "";
  }, [selectedAction?.action]);

  // 🔹 Determine modal type with useMemo
  const modalType = useMemo((): ModalType => {
    if (!selectedAction?.action) return 'default';

    const isAction = taskType === "action";
    const isProgress = taskType === "progress";
    const taskNameLower = taskName.toLowerCase();

    // Fee Structure
    if (isAction && 
        taskCategory === "selector" && 
        taskNameLower.includes("assign fee structure")) {
      return 'feeStructure';
    }

    // Invoice Amount
    if (isAction && 
        taskCategory === "input" && 
        taskNameLower.includes("assign invoice amount")) {
      return 'invoiceAmount';
    }

    // Scheduling
    if (isAction && taskCategory === "scheduling") {
      return 'scheduling';
    }

    // Progress Task
    if (isProgress && taskCategory === "progress_task") {
      return 'progressTask';
    }

    return 'default';
  }, [taskType, taskCategory, taskName, selectedAction?.action]);

  // 🔹 Validation helpers
  const isValidInvoice = useMemo(() => {
    return invoiceAmount !== "" && /^\d+$/.test(invoiceAmount);
  }, [invoiceAmount]);

  const isValidSchedule = useMemo(() => {
    return scheduledDateTime !== "";
  }, [scheduledDateTime]);

  // 🔹 Reset state when modal closes
  useEffect(() => {
    if (!showConditionModal) {
      setFeeValue("0");
      setInvoiceAmount("");
      setError("");
      setScheduledDateTime("");
    }
  }, [showConditionModal]);

  // 🔹 Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        setShowConditionModal(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saving, setShowConditionModal]);

  // 🔹 Click outside to close
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (!saving && 
        modalRef.current && 
        !modalRef.current.contains(e.target as Node)) {
      setShowConditionModal(null);
    }
  }, [saving, setShowConditionModal]);

  // 🔹 Save handler
  const handleSave = useCallback(async (value: string) => {
    if (!selectedAction?.action) return;
    
    setSaving(true);
    try {
      await executeAction(selectedAction.action.id, selectedAction.action, value);
      setShowConditionModal(null);
      // State will be reset by useEffect
    } catch (error) {
      console.error("Error executing action:", error);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [selectedAction, executeAction, setShowConditionModal]);

  // 🔹 Invoice input handler
  const handleInvoiceChange = useCallback((val: string) => {
    if (/^\d*$/.test(val)) {
      setInvoiceAmount(val);
      setError("");
    } else {
      setError("Please enter a valid whole number");
    }
  }, []);

  // 🔹 Progress status handler
  const handleProgressStatus = useCallback(async (status: string) => {
    if (!selectedAction?.action) return;

    setSaving(true);
    try {
      await executeAction(selectedAction.action.id, selectedAction.action, status);
      setShowConditionModal(null);
    } catch (error) {
      console.error("Error updating progress:", error);
      setError("Failed to update status. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [selectedAction, executeAction, setShowConditionModal]);

  // 🔹 CRITICAL: Early return AFTER all hooks
  if (!showConditionModal || !selectedAction) {
    return null;
  }

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
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 disabled:opacity-40 transition-colors"
          aria-label="Close modal"
        >
          <X size={22} />
        </button>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {taskName}
        </h3>

        {/* Application Info */}
        <div className="mb-4 text-sm text-gray-700 space-y-1">
          <p>
            Application: <span className="font-medium">{companyName}</span>
          </p>

          {modalType === 'progressTask' && selectedAction.application?.assignee && (
            <p>
              Current Assignee:{" "}
              <span className="font-medium">{selectedAction.application.assignee}</span>
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && modalType !== 'invoiceAmount' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Fee Structure Modal */}
        {modalType === 'feeStructure' && (
          <>
            <label 
              htmlFor="fee-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Fee Structure
            </label>

            <select
              id="fee-select"
              value={feeValue}
              disabled={saving}
              onChange={(e) => setFeeValue(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-6 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="0">LOW</option>
              <option value="1">MED</option>
              <option value="2">HIGH</option>
            </select>

            <ActionButtons
              onCancel={() => setShowConditionModal(null)}
              onSave={() => handleSave(feeValue)}
              saving={saving}
              disabled={saving}
            />
          </>
        )}

        {/* Invoice Amount Modal */}
        {modalType === 'invoiceAmount' && (
          <>
            <label 
              htmlFor="invoice-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Enter Invoice Amount
            </label>

            <input
              id="invoice-input"
              type="text"
              value={invoiceAmount}
              disabled={saving}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter amount"
            />

            {error && (
              <p className="text-xs text-red-500 mb-4">{error}</p>
            )}

            <ActionButtons
              onCancel={() => setShowConditionModal(null)}
              onSave={() => handleSave(invoiceAmount)}
              saving={saving}
              disabled={!isValidInvoice || saving}
            />
          </>
        )}

        {/* Scheduling Modal */}
        {modalType === 'scheduling' && (
          <>
            <label 
              htmlFor="datetime-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Date & Time
            </label>

            <input
              id="datetime-input"
              type="datetime-local"
              value={scheduledDateTime}
              disabled={saving}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-6 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <ActionButtons
              onCancel={() => setShowConditionModal(null)}
              onSave={() => handleSave(scheduledDateTime)}
              saving={saving}
              disabled={!isValidSchedule || saving}
            />
          </>
        )}

        {/* Progress Task Modal */}
        {modalType === 'progressTask' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Status:
            </label>

            {(['completed', 'in_progress', 'pending'] as const).map((status) => (
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

        {/* Default Yes/No Modal */}
        {modalType === 'default' && (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => handleSave("no")}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40 transition-colors"
            >
              No
            </button>

            <button
              onClick={() => handleSave("yes")}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {saving && <Spinner />}
              Yes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 🔹 Extracted reusable components
const ActionButtons: React.FC<{
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
}> = ({ onCancel, onSave, saving, disabled = false }) => (
  <div className="flex justify-end gap-3">
    <button
      onClick={onCancel}
      disabled={saving}
      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40 transition-colors"
    >
      Cancel
    </button>

    <button
      onClick={onSave}
      disabled={disabled}
      className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors"
    >
      {saving && <Spinner />}
      Save
    </button>
  </div>
);

const Spinner: React.FC = () => (
  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
);