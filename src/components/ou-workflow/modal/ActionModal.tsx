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
    result?: string,
    selectedAction?: SelectedAction | null
  ) => void;
};

type RcLookupItem = {
  id: string;
  name: string;
  email?: string;
  userName?: string;
  fullName?: string;
  userRole?: string;
  isActive?: boolean;
  rfr?: string;
  pct_of_total_apps?: number;
  pct_of_total_apps_at_work?: number;
};

export const ActionModal: React.FC<Props> = ({
  showActionModal,
  setShowActionModal,
  selectedAction,
  executeAction,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const rfrTableBodyRef = useRef<HTMLTableSectionElement>(null);
  const [selectedRc, setSelectedRc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [saving, setSaving] = useState(false);

  type ActionMeta = {
    endpoint: string;
    roleType: string;
  };

  const actionMeta = useMemo<ActionMeta>(() => {
    const prefix = selectedAction?.action?.PreScript;

    if (!prefix) {
      return {
        endpoint: "api/vSelectNCRC",
        roleType: "NCRC",
      };
    }

    const [endpoint, role] = prefix.split(",");

    return {
      endpoint: endpoint?.trim() ?? "",
      roleType: role?.trim().toUpperCase(),
    };
  }, [selectedAction?.action?.PreScript]);
  

  // The hook's internal 'enabled' option handles when to fetch
  const {
    data: selectlist = [],
    isLoading,
  } = useUserListByRole(actionMeta.endpoint, { enabled: !!showActionModal });

  const isRfrSelection = actionMeta.roleType === "RFR";

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
      setSearchTerm("");
      setHighlightedIndex(-1);
    }
  }, [showActionModal]);

  const filteredSelectList = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return selectlist;
    }

    return selectlist.filter((item: RcLookupItem) => {
      const haystack = [
        item.rfr,
        item.name,
        item.fullName,
        item.userName,
        item.email,
        item.userRole,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [searchTerm, selectlist]);

  useEffect(() => {
    if (!isRfrSelection) {
      return;
    }

    if (filteredSelectList.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    const selectedIndex = filteredSelectList.findIndex(
      (item: RcLookupItem) => item.id === selectedRc
    );

    if (selectedIndex >= 0) {
      setHighlightedIndex(selectedIndex);
      return;
    }

    setHighlightedIndex((currentIndex) => {
      if (currentIndex >= 0 && currentIndex < filteredSelectList.length) {
        return currentIndex;
      }

      return 0;
    });
  }, [filteredSelectList, isRfrSelection, selectedRc]);

  useEffect(() => {
    if (!isRfrSelection || highlightedIndex < 0) {
      return;
    }

    const activeRow = rfrTableBodyRef.current?.querySelector<HTMLElement>(
      `[data-rfr-index="${highlightedIndex}"]`
    );

    activeRow?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isRfrSelection]);

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
      await executeAction(selectedRc, selectedAction.action, undefined, selectedAction);
    } catch (error) {
      console.error("Error executing action:", error);
    } finally {
      setSaving(false);
      setShowActionModal(null);
    }
  };

  const handleRfrSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRfrSelection || saving || filteredSelectList.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((currentIndex) =>
        currentIndex < 0
          ? 0
          : Math.min(currentIndex + 1, filteredSelectList.length - 1)
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((currentIndex) =>
        currentIndex <= 0 ? 0 : currentIndex - 1
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      const candidate =
        filteredSelectList[highlightedIndex] ??
        filteredSelectList.find((item: RcLookupItem) => item.id === selectedRc) ??
        filteredSelectList[0];

      if (!candidate) {
        return;
      }

      if (selectedRc !== candidate.id) {
        setSelectedRc(candidate.id);
        return;
      }

      await handleSave();
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
        className={`relative bg-white rounded-xl shadow-xl p-6 w-full animate-scaleIn ${
          isRfrSelection ? "max-w-4xl" : "max-w-md"
        }`}
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
            htmlFor={isRfrSelection ? "rfr-search" : "rc-select"}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {isRfrSelection ? "Select RFR" : "Select Name:"}
          </label>

          {isLoading ? (
            <p className="text-sm text-gray-500">Loading {actionMeta.roleType} list...</p>
          ) : isRfrSelection ? (
            <div className="space-y-3">
              <input
                id="rfr-search"
                type="text"
                value={searchTerm}
                disabled={saving}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleRfrSearchKeyDown}
                placeholder="Search by RFR, full name, username, or email"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">RFR</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Username</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody ref={rfrTableBodyRef}>
                      {filteredSelectList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                            No RFR matches found.
                          </td>
                        </tr>
                      ) : (
                        filteredSelectList.map((rc: RcLookupItem, rowIndex: number) => {
                          const isSelected = selectedRc === rc.id;
                          const isHighlighted = highlightedIndex === rowIndex;

                          return (
                            <tr
                              key={rc.id}
                              data-rfr-index={rowIndex}
                              onClick={() => {
                                if (saving) return;
                                setSelectedRc(rc.id);
                                setHighlightedIndex(rowIndex);
                              }}
                              onMouseEnter={() => {
                                if (!saving) {
                                  setHighlightedIndex(rowIndex);
                                }
                              }}
                              className={`border-b border-gray-100 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-blue-100"
                                  : isHighlighted
                                  ? "bg-blue-50"
                                  : "hover:bg-gray-50"
                              }`}
                              aria-selected={isSelected}
                            >
                              <td className="px-3 py-2 text-gray-900">
                                <div className="font-medium">{rc.rfr ?? rc.fullName ?? rc.name}</div>
                                {((rc.pct_of_total_apps ?? 0) > 0 ||
                                  (rc.pct_of_total_apps_at_work ?? 0) > 0) && (
                                  <div className="text-xs text-gray-500">
                                    {(rc.pct_of_total_apps ?? 0) > 0
                                      ? `${rc.pct_of_total_apps}% total`
                                      : ""}
                                    {(rc.pct_of_total_apps ?? 0) > 0 &&
                                    (rc.pct_of_total_apps_at_work ?? 0) > 0
                                      ? " | "
                                      : ""}
                                    {(rc.pct_of_total_apps_at_work ?? 0) > 0
                                      ? `${rc.pct_of_total_apps_at_work}% at work`
                                      : ""}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-700">{rc.userName ?? rc.id}</td>
                              <td className="px-3 py-2 text-gray-700">{rc.email ?? "-"}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                    rc.isActive === false
                                      ? "bg-red-100 text-red-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {rc.isActive === false ? "Inactive" : "Active"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
                <option key={rc.id} value={rc.id}>
                  {rc.name} 
                  {((rc.pct_of_total_apps ?? 0) > 0 ||
                    (rc.pct_of_total_apps_at_work ?? 0) > 0) && (
                    <>
                      {' '}
                      (
                      {(rc.pct_of_total_apps ?? 0) > 0 && `${rc.pct_of_total_apps}% total`}
                      {(rc.pct_of_total_apps ?? 0) > 0 &&
                        (rc.pct_of_total_apps_at_work ?? 0) > 0 &&
                        ', '}
                      {(rc.pct_of_total_apps_at_work ?? 0) > 0 &&
                        `${rc.pct_of_total_apps_at_work}% at work`}
                      )
                    </>
                  )}
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
