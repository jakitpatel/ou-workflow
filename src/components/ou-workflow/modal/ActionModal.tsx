import React, { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { useUserListByRole } from "@/components/ou-workflow/hooks/useTaskDashboardHooks";
import type { Task, Applicant } from "@/types/application";

type SelectedAction = {
  application: Applicant | Task | any;
  action: Task | { id: string; name?: string; taskName?: string } | any;
};

type Props = {
  showActionModal: boolean | null | Task;
  selectedAction: SelectedAction | null;
  setShowActionModal: (val: boolean | null | Task) => void;
  executeAction: (
    value: string,
    action: { id: string; name?: string; taskName?: string },
    result?: string
  ) => void;
};

type RcLookupItem = {
  id: string;
  name: string;
};

export const ActionModal: React.FC<Props> = ({
  showActionModal,
  setShowActionModal,
  selectedAction,
  executeAction,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedRc, setSelectedRc] = useState("");
  const [saving, setSaving] = useState(false);

  const roleType: "NCRC" | "RFR" = useMemo(() => {
    if (!selectedAction?.action?.name) return "NCRC";
    return selectedAction.action.name.toLowerCase().includes("rfr") ? "RFR" : "NCRC";
  }, [selectedAction?.action?.name]);

  // The hook's internal 'enabled' option handles when to fetch
  const {
    data: selectlist = [],
    isLoading,
  } = useUserListByRole(roleType, { enabled: !!showActionModal });

  // 🔹 FIX 3: Extract values safely with useMemo
  const companyName = useMemo(() => {
    return selectedAction?.application?.company || 
           selectedAction?.application?.companyName || 
           "Unknown Company";
  }, [selectedAction?.application]);

  const taskName = useMemo(() => {
    return selectedAction?.action?.name || 
           selectedAction?.action?.taskName || 
           "Action";
  }, [selectedAction?.action]);

  // 🔹 Reset selected RC when modal closes
  useEffect(() => {
    if (!showActionModal) {
      setSelectedRc("");
    }
  }, [showActionModal]);

  // ESC key close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        setShowActionModal(null);
      }
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
    if (!selectedRc || !selectedAction) return;
    setSaving(true);
    try {
      await executeAction(selectedRc, selectedAction.action);
    } catch (error) {
      console.error("Error executing action:", error);
    } finally {
      setSaving(false);
      setShowActionModal(null);
    }
  };

  // 🔹 FIX 4: Early return AFTER all hooks
  if (!showActionModal || !selectedAction) {
    return null;
  }

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
          aria-label="Close modal"
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
          <label 
            htmlFor="rc-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Name:
          </label>

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading {roleType} list...</p>
          ) : (
            <select
              id="rc-select"
              value={selectedRc}
              disabled={saving}
              onChange={(e) => setSelectedRc(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!selectedRc || saving}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white flex items-center gap-2 transition-colors ${
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