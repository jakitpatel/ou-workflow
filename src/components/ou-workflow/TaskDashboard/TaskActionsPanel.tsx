import React, { useState, useMemo } from "react";
import { Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { assignTask, confirmTask } from './../../../api'; // same api.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type TaskActionsPanelProps = {
  application: any;
  username: string;
  staff: { id: string; name: string; department: string }[];
  showReassignDropdown: Record<string, boolean>;
  setShowReassignDropdown: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  getTaskActions: (task: any) => any[];
  handleTaskAction: (e: React.MouseEvent, application: any, action: any) => void;
  handleReassignTask: (taskId: string, newAssignee: string) => void;
};

export const TaskActionsPanel: React.FC<TaskActionsPanelProps> = ({
  application,
  username,
  staff,
  showReassignDropdown,
  setShowReassignDropdown,
  getTaskActions,
  handleReassignTask,
  handleTaskAction
}) => {
  const [showAll, setShowAll] = useState(false);
  const queryClient = useQueryClient();

  const MAX_VISIBLE = 6;
  const ROW_SIZE = 2;

  const actions = getTaskActions(application);

  // normalize statuses
  const normalized = actions.map(a => ({
    ...a,
    status: a.status?.toLowerCase(),
  }));

  // find index of first pending
  const pendingIndex = normalized.findIndex(a => a.status === "pending");

  // base cutoff → up to pending if found, else default
  let cutoff = pendingIndex >= 0 ? pendingIndex + 1 : MAX_VISIBLE;

  // ensure at least MAX_VISIBLE
  if (cutoff < MAX_VISIBLE) {
    cutoff = MAX_VISIBLE;
  }

  // ✅ round up to full row
  if (cutoff % ROW_SIZE !== 0) {
    cutoff = cutoff + (ROW_SIZE - (cutoff % ROW_SIZE));
  }

  // cap at total actions
  cutoff = Math.min(cutoff, actions.length);

  const visibleActions = showAll ? actions : actions.slice(0, cutoff);
  //const visibleActions = showAll ? actions : actions.slice(0, MAX_VISIBLE);

  return (
    <tr>
      <td colSpan={4} className="px-0 py-0">
        <div className="bg-blue-50 border-t border-blue-200">
          <div className="px-6 py-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <Wrench className="w-4 h-4 mr-2" />
                Task Actions
              </h4>

              <div className="flex items-center space-x-2">
                {/* Show More / Less Button */}
                {actions.length > MAX_VISIBLE && (
                  <button
                    onClick={() => setShowAll((prev) => !prev)}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title={showAll ? "Show Less" : "Show More"}
                  >
                    {showAll ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                )}

                {/* Stage Display */}
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  Stage: {application.workflowStage}
                </span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              {visibleActions.map((action) => (
                <button
                  key={action.TaskInstanceId}
                  onClick={(e) =>
                    !action.disabled && handleTaskAction(e, application, action)
                  }
                  disabled={action.disabled}
                  className={`flex items-center justify-center px-4 py-3 text-white rounded-lg transition-colors text-sm font-medium ${action.color}`}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </button>
              ))}
            </div>

            {/* Reassignment Dropdown */}
            {showReassignDropdown[application.id] && (
              <div className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-300">
                <h5 className="text-sm font-semibold text-blue-900 mb-3">
                  Reassign Task
                </h5>
                <div className="space-y-2">
                  {staff
                    .filter((s) => s.name !== username)
                    .map((person) => (
                      <button
                        key={person.id}
                        onClick={() =>
                          handleReassignTask(application.id, person.name)
                        }
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded border transition-colors"
                      >
                        <div className="font-medium">{person.name}</div>
                        <div className="text-xs text-gray-500">
                          {person.department}
                        </div>
                      </button>
                    ))}
                </div>
                <button
                  onClick={() =>
                    setShowReassignDropdown((prev) => ({
                      ...prev,
                      [application.id]: false,
                    }))
                  }
                  className="mt-3 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Metadata */}
            {/*
            <div className="mt-4 p-3 bg-white rounded border text-xs text-gray-600">
              <p>
                <strong>App ID:</strong> {application.applicationId}
              </p>
              <p>
                <strong>Assigned by:</strong> {application.assignedBy}
              </p>
              <p>
                <strong>Days Active:</strong> {application.daysActive}
              </p>
            </div>*/}
          </div>
        </div>
      </td>
    </tr>
  );
};