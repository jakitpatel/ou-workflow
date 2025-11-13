import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useRCList } from "@/components/ou-workflow/hooks/useTaskDashboardHooks";

type Application = {
  company: string;
  companyName?: string;
  assignee: string;
};

type SelectedAction = {
  application: Application;
  action: { id: string; name?: string; taskName?: string };
};

type Props = {
  showActionModal: boolean | null;
  selectedAction: SelectedAction | null;
  setShowActionModal: (val: boolean | null) => void;
  executeAction: (
    value: string,
    action: { id: string; name?: string; taskName?: string }
  ) => void;
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

  const { application, action } = selectedAction;
  const dialogRef = useRef<HTMLDivElement>(null);

  const [selectedRc, setSelectedRc] = useState("");
  const [saving, setSaving] = useState(false);

  // Determine RC list based on action
  const roleType: "NCRC" | "RFR" =
    action.name?.toLowerCase().includes("rfr") ? "RFR" : "NCRC";

  const {
    data: selectlist = [],
    isLoading,
  } = useRCList(roleType, { enabled: showActionModal });

  const companyName =
    application?.company || application?.companyName || "Unknown Company";
  const taskName = action?.name || action?.taskName || "Action";

  // ESC key close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setShowActionModal(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [saving, setShowActionModal]);

  // Click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!saving && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      setShowActionModal(null);
    }
  };

  const handleSave = async () => {
    if (!selectedRc) return;
    setSaving(true);
    await executeAction(selectedRc, action);
    setSaving(false);
    setShowActionModal(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full animate-scaleIn"
      >
        {/* X Close button */}
        <button
          onClick={() => setShowActionModal(null)}
          disabled={saving}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 disabled:opacity-40"
        >
          <X size={22} />
        </button>

        {/* Header */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {taskName}
        </h3>

        {/* Application Info */}
        <div className="mb-4 text-sm text-gray-700">
          Application: <span className="font-medium">{companyName}</span>
        </div>

        {/* RC Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Name:
          </label>

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading {roleType} list...</p>
          ) : (
            <select
              value={selectedRc}
              disabled={saving}
              onChange={(e) => setSelectedRc(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose --</option>
              {selectlist.map((rc: RcLookupItem) => (
                <option key={rc.id} value={rc.name}>
                  {rc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowActionModal(null)}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!selectedRc || saving}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2 ${
              !selectedRc || saving
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving && (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};