import React, { useState } from "react";
import { X } from "lucide-react";

type Application = {
  company: string;
  assignee: string;
};

type SelectedAction = {
  application: Application;
  action: { id: string; label: string; taskType?: string; taskCategory?: string };
};

type Props = {
  showConditionModal: boolean;
  selectedAction: SelectedAction | null;
  setShowConditionModal: (val: boolean | null) => void;
  executeAction: (
    id: string,
    action: { id: string; label: string },
    value: string
  ) => void;
};

export const ConditionalModal: React.FC<Props> = ({
  showConditionModal,
  setShowConditionModal,
  selectedAction,
  executeAction,
}) => {
  const [feeValue, setFeeValue] = useState<string>("0"); // default LOW
  const [invoiceAmount, setInvoiceAmount] = useState<string>(""); // input for invoice
  const [error, setError] = useState<string>("");

  if (!showConditionModal || !selectedAction) return null;

  const { application, action } = selectedAction;

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
    action.taskCategory?.toLowerCase() === "selector" &&
    action.label.toLowerCase().includes("assign fee structure");

  const isInvoiceAmount =
    action.taskType?.toLowerCase() === "action" &&
    action.taskCategory?.toLowerCase() === "input" &&
    action.label.toLowerCase().includes("assign invoice amount");

  const handleInvoiceChange = (val: string) => {
    // Only allow digits
    if (/^\d*$/.test(val)) {
      setInvoiceAmount(val);
      setError("");
    } else {
      setError("Please enter a valid whole number");
    }
  };

  const isValidInvoice = invoiceAmount !== "" && /^\d+$/.test(invoiceAmount);

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