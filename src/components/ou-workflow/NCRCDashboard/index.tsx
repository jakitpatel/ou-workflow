import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApplicantCard } from './ApplicantCard'
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import { Search } from 'lucide-react';
import { useUser } from '@/context/UserContext'
import { useApplications } from './../hooks/useApplications';
import { assignTask, confirmTask } from '@/api';
import { ErrorDialog, type ErrorDialogRef } from "@/components/ErrorDialog";
import type { Applicant, Task } from '@/types/application';
import { ApplicantStatsCards } from './ApplicantStatsCards';
import { useDebounce } from '@/components/ou-workflow/hooks/useDebounce'; // 👈 Create this hook

// 🎯 Constants
const PAGE_LIMIT = 20;
const DEBOUNCE_DELAY = 1000;

// 🎯 Task type definitions for better type safety
const TASK_TYPES = {
  CONFIRM: 'confirm',
  CONDITIONAL: 'conditional',
  CONDITION: 'condition',
  ACTION: 'action',
  PROGRESS: 'progress',
} as const;

const TASK_CATEGORIES = {
  CONFIRMATION: 'confirmation',
  APPROVAL: 'approval',
  ASSIGNMENT: 'assignment',
  SELECTOR: 'selector',
  INPUT: 'input',
  SCHEDULING: 'scheduling',
  PROGRESS_TASK: 'progress_task',
} as const;

// 🎯 Helper to get all tasks from an applicant
const getAllTasks = (app: Applicant): Task[] => {
  if (!app?.stages) return [];
  return Object.values(app.stages).flatMap(stage => stage.tasks || []);
};

// 🎯 Status mapping helper
const getProgressStatus = (result: string): string => {
  const statusMap: Record<string, string> = {
    completed: 'Completed',
    in_progress: 'In Progress',
    pending: 'Pending',
  };
  return statusMap[result] || '';
};

// 🎯 Role detection helper
const detectRole = (taskName: string): "RFR" | "NCRC" | "OtherRole" => {
  const normalized = taskName.replace(/\s+/g, "").toLowerCase();
  if (normalized.includes("selectrfr") || normalized.includes("assignrfr")) {
    return "RFR";
  }
  if (normalized.includes("assignncrc")) {
    return "NCRC";
  }
  return "OtherRole";
};

export function NCRCDashboard() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<Task | null | boolean>(null);
  const [showConditionModal, setShowConditionModal] = useState<Task | null | boolean>(null);
  
  const { token, username } = useUser();
  const queryClient = useQueryClient();
  const errorDialogRef = useRef<ErrorDialogRef>(null);
  
  // 🔹 Use custom debounce hook instead of useEffect
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);

  // 🔹 Reset pagination when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm, statusFilter, priorityFilter]);

  // 🔹 Fetch applications
  const { data, isLoading, isError, error } = useApplications({
    searchTerm: debouncedSearchTerm,
    statusFilter,
    priorityFilter,
    page,
    limit: PAGE_LIMIT,
  });

  const applicants = data?.data || [];
  const totalCount = data?.meta?.total_count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_LIMIT);

  // 🔹 Pagination handlers
  const handleFirst = () => setPage(0);
  const handlePrev = () => setPage(p => Math.max(p - PAGE_LIMIT, 0));
  const handleNext = () => setPage(p => (p + PAGE_LIMIT < totalCount ? p + PAGE_LIMIT : p));
  const handleLast = () => setPage((totalPages - 1) * PAGE_LIMIT);

  // 🔹 Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // 🔹 Calculate stats
  const applicantStats = useMemo(() => {
    const normalizedApplicants = applicants.map(app => ({
      ...app,
      status: app.status?.toLowerCase() || ''
    }));

    const statusCounts = {
      new: normalizedApplicants.filter(t => t.status === 'new').length,
      inProgress: normalizedApplicants.filter(
        t => t.status === 'inp' || t.status === 'in progress'
      ).length,
      withdrawn: normalizedApplicants.filter(
        t => t.status === 'wth' || t.status === 'withdrawn'
      ).length,
      completed: normalizedApplicants.filter(
        t => ['compl', 'completed', 'certified'].includes(t.status)
      ).length,
    };

    const knownTotal = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    return {
      total: normalizedApplicants.length,
      ...statusCounts,
      others: normalizedApplicants.length - knownTotal,
    };
  }, [applicants]);

  // 🔹 Mutations
  const confirmTaskMutation = useMutation({
    mutationFn: confirmTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: any) => {
      console.error("❌ Failed to confirm task:", error);
      const message =
        error?.message ||
        error?.response?.data?.message ||
        "Something went wrong while confirming the task.";
      errorDialogRef.current?.open(message);
    }
  });

  const assignTaskMutation = useMutation({
    mutationFn: assignTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: any) => {
      console.error("❌ Failed to assign task:", error);
      const message =
        error?.message ||
        error?.response?.data?.message ||
        "Something went wrong while assigning the task.";
      errorDialogRef.current?.open(message);
    },
  });

  // 🔹 Execute action based on task type
  const executeAction = (assignee: string, action: any, result?: string) => {
    const taskType = action.taskType?.toLowerCase();
    const taskCategory = action.taskCategory?.toLowerCase();
    const taskId = action.TaskInstanceId;

    // Common mutation params
    const baseParams = {
      taskId,
      token: token ?? undefined,
      username: username ?? undefined,
    };

    // Handle different task types
    if (taskType === TASK_TYPES.CONFIRM && taskCategory === TASK_CATEGORIES.CONFIRMATION) {
      confirmTaskMutation.mutate(baseParams);
    } 
    else if (
      (taskType === TASK_TYPES.CONDITIONAL || taskType === TASK_TYPES.CONDITION) && 
      taskCategory === TASK_CATEGORIES.APPROVAL
    ) {
      confirmTaskMutation.mutate({ ...baseParams, result: result ?? undefined });
    }
    else if (taskType === TASK_TYPES.ACTION) {
      if (taskCategory === TASK_CATEGORIES.ASSIGNMENT) {
        const appId = selectedAction?.application?.applicationId ?? 
                      action.application?.applicationId ?? 
                      action.applicationId;
        const role = detectRole(action.name ?? "");

        assignTaskMutation.mutate({
          appId,
          taskId,
          role,
          assignee,
          token: token ?? undefined,
        });
      } 
      else if ([TASK_CATEGORIES.SELECTOR, TASK_CATEGORIES.INPUT, TASK_CATEGORIES.SCHEDULING].includes(taskCategory)) {
        confirmTaskMutation.mutate({ ...baseParams, result: result ?? undefined });
      }
    }
    else if (taskType === TASK_TYPES.PROGRESS && taskCategory === TASK_CATEGORIES.PROGRESS_TASK) {
      const status = result ? getProgressStatus(result) : '';
      confirmTaskMutation.mutate({
        ...baseParams,
        result: result ?? undefined,
        status,
      });
    }
  };

  // 🔹 Get selected action
  const selectedAction = useMemo(() => {
    if (!selectedActionId) return null;

    const [appId, actId] = selectedActionId.split(":");
    const app = applicants.find(a => String(a.applicationId) === String(appId));
    
    if (!app) {
      console.warn("No app found for", appId);
      return null;
    }

    const actions = getAllTasks(app);
    const act = actions.find(a => String(a.TaskInstanceId) === String(actId));

    if (!act) {
      console.warn("No action found for", actId);
      return null;
    }

    return { application: app, action: act };
  }, [selectedActionId, applicants]);

  // 🔹 Handle action selection
  const handleSelectAppActions = (applicationId: string | number, actionId: string | number) => {
    setSelectedActionId(`${applicationId}:${actionId}`);
  };

  // 🔹 Handle task action click
  const handleTaskAction = (e: React.MouseEvent, application: Applicant, action: Task) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('Action clicked:', action, 'for application:', application);
    handleSelectAppActions(application.applicationId, action.TaskInstanceId);

    const actionType = action.taskType?.toLowerCase();
    const actionCategory = action.taskCategory?.toLowerCase();

    // Route to appropriate modal or execute immediately
    if (actionType === TASK_TYPES.CONFIRM && actionCategory === TASK_CATEGORIES.CONFIRMATION) {
      executeAction("Confirmed", action, "yes");
    } 
    else if (
      (actionType === TASK_TYPES.CONDITIONAL || actionType === TASK_TYPES.CONDITION) && 
      actionCategory === TASK_CATEGORIES.APPROVAL
    ) {
      setShowConditionModal(action);
    } 
    else if (actionType === TASK_TYPES.ACTION) {
      if (actionCategory === TASK_CATEGORIES.ASSIGNMENT) {
        setShowActionModal(action);
      } else {
        setShowConditionModal(action);
      }
    } 
    else if (actionType === TASK_TYPES.PROGRESS && actionCategory === TASK_CATEGORIES.PROGRESS_TASK) {
      setShowConditionModal(action);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">NCRC Dashboard</h2>
        <p className="text-gray-600">Executive Overview - Certification Management</p>
      </div>

      {/* Stats Cards */}
      <ApplicantStatsCards stats={applicantStats} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 mt-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by company, plant, region..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            <option value="COMPL">Certified</option>
            <option value="CONTRACT">Contract Sent</option>
            <option value="DISP">Dispatched</option>
            <option value="INC">Incomplete</option>
            <option value="INP">In Progress</option>
            <option value="INSPECTION">Inspection Scheduled</option>
            <option value="NEW">New</option>
            <option value="PAYPEND">Payment Pending</option>
            <option value="REVIEW">Under Review</option>
            <option value="WTH">Withdrawn</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Loading/Error States */}
      {isLoading && <div className="text-gray-500">Loading applicants...</div>}
      {isError && <div className="text-red-600">Error: {(error as Error).message}</div>}

      {/* Pagination Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-gray-600">
          Showing {page + 1}–{Math.min(page + PAGE_LIMIT, totalCount)} of {totalCount} applications
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleFirst}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            First
          </button>
          <button
            onClick={handlePrev}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-sm font-medium">
            Page {Math.floor(page / PAGE_LIMIT) + 1} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={page + PAGE_LIMIT >= totalCount}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
          <button
            onClick={handleLast}
            disabled={page + PAGE_LIMIT >= totalCount}
            className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Last
          </button>
        </div>
      </div>

      {/* Applicants List */}
      <div className="space-y-4">
        {applicants.length > 0 ? (
          applicants.map((applicant: Applicant) => (
            <ApplicantCard
              key={applicant.applicationId}
              applicant={applicant}
              handleTaskAction={handleTaskAction}
            />
          ))
        ) : (
          !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No applications match your current filters.</p>
              <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      <ActionModal
        setShowActionModal={setShowActionModal} 
        showActionModal={showActionModal}
        executeAction={executeAction}
        selectedAction={selectedAction}
      />
      <ConditionalModal
        setShowConditionModal={setShowConditionModal} 
        showConditionModal={showConditionModal}
        executeAction={executeAction}
        selectedAction={selectedAction}
      />
      
      {/* Global Error Dialog */}
      <ErrorDialog ref={errorDialogRef} />
    </div>
  );
}