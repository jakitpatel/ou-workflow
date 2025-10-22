import React, { useState,useMemo, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApplicantCard } from './ApplicantCard'
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import { Search } from 'lucide-react';
import { IngredientsManagerPage } from './IngredientsManagerPage';
import { useUser } from './../../../context/UserContext'  // 👈 new import
import { useApplications } from './../hooks/useApplications';
import { assignTask, confirmTask } from '@/api'; // same api.ts
import { ErrorDialog, type ErrorDialogRef } from "@/components/ErrorDialog";
//import type { Task, Stage, Applicant } from '@/types/application';

type Props = {
  showIngredientsManager: boolean
  setShowIngredientsManager: (val: boolean) => void
  selectedIngredientApp: any
  setSelectedIngredientApp: (val: any) => void
}

export function NCRCDashboard({
  showIngredientsManager,
  setShowIngredientsManager,
  selectedIngredientApp,
  setSelectedIngredientApp
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  /*const [selectedAction, setSelectedAction] = useState<{
    task: any;
    action: string;
    applicantId: string;
  } | null>(null);*/
  const { setActiveScreen, token, strategy, username } = useUser(); // 👈 use context
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(null);
  const [showConditionModal, setShowConditionModal] = useState(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();
  const errorDialogRef = useRef<ErrorDialogRef>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 1000);
    return () => clearTimeout(handler);
  }, [searchTerm]);
  
  const { data: applicants = [], isLoading, isError, error } = useApplications({
    searchTerm: debouncedSearchTerm,
    statusFilter,
    priorityFilter,
  });

  /*const filteredApplicants = useMemo(() => {
    return (Array.isArray(applicants) ? applicants : []).filter((app) => {
      const matchesSearch =
        app.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.plant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.region?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || app.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchTerm, statusFilter, priorityFilter, applicants]);
  */
  // ✅ Return conditionally AFTER all hooks
  if (showIngredientsManager && selectedIngredientApp) {
    return (
      <IngredientsManagerPage
        selectedIngredientApp={selectedIngredientApp}
        setShowIngredientsManager={setShowIngredientsManager}
      />
    );
  }

  const confirmTaskMutation = useMutation({
    mutationFn: confirmTask,
    onSuccess: () => {
      // 🔄 Invalidate to refresh data
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: any) => {
      console.error("❌ Failed to assign task:", error);
      const message =
        error?.message ||
        error?.response?.data?.message ||
        "Something went wrong while confirming the task.";
      errorDialogRef.current?.open(message);
    }
  });

  //const assignTaskMutation = useAssignTask();
  const assignTaskMutation = useMutation({
    mutationFn: assignTask,
    onSuccess: () => {
      // 🔄 Refresh application list after assigning
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

  const executeAction = (assignee: string, action: any, result: "yes" | "no") => {
      //if (selectedAction) {
        // normalize taskType safely
        const taskType = action.taskType?.toLowerCase();
        const taskCategory = action.taskCategory?.toLowerCase();

        if (taskType === "confirm" && taskCategory === "confirmation") {
          confirmTaskMutation.mutate({
            taskId: action.TaskInstanceId,
            token,
            strategy,
            username
          });
        } else if ((taskType === "conditional" || taskType === "condition") && taskCategory === "approval") {
          confirmTaskMutation.mutate({
            taskId: action.TaskInstanceId,
            result: result,
            token,
            strategy,
            username
          });
        } else if (taskType === "action" && taskCategory === "selector") {
          confirmTaskMutation.mutate({
            taskId: action.TaskInstanceId,
            result: result,
            token,
            strategy,
            username
          });
        } else if (taskType === "action" && taskCategory === "input") {
          confirmTaskMutation.mutate({
            taskId: action.TaskInstanceId,
            result: result,
            token,
            strategy,
            username
          });
        } else if (taskType === "action" && taskCategory === "scheduling") {
          confirmTaskMutation.mutate({
            taskId: action.TaskInstanceId,
            result: result,
            token,
            strategy,
            username
          });
        } else if (taskType === "action" && taskCategory === "assignment") {
          const taskId = action.TaskInstanceId;
          const appId = selectedAction.application.id;

          const rawLabel = action.name ?? "";
          const normalized = rawLabel.replace(/\s+/g, "").toLowerCase();

          let role: "RFR" | "NCRC" | "OtherRole";
          if (normalized.includes("selectrfr") || normalized.includes("assignrfr")) {
            role = "RFR";
          } else if (normalized.includes("assignncrc")) {
            role = "NCRC";
          } else {
            role = "OtherRole";
          }

          assignTaskMutation.mutate({
            appId,
            taskId,
            role,
            assignee,
            token,
            strategy,
          });
        }
      //}
    };
  
  const getAllTasks = (app) => {
    if (!app?.stages) return [];
    return Object.values(app.stages).flatMap(stage => stage.tasks || []);
  };

  const selectedAction = React.useMemo(() => {
    if (!selectedActionId) return null;

    const [appId, actId] = selectedActionId.split(":");

    // 🔒 normalize IDs as strings
    const app = applicants.find(a => String(a.id) === String(appId));
    if (!app) {
      console.warn("No app found for", appId, applicants.map(t => t.id));
      return null;
    }

    const actions = getAllTasks(app) || [];
    const act = actions.find(a => String(a.TaskInstanceId) === String(actId));

    if (!act) {
      console.warn("No action found for", actId, actions.map(a => a.TaskInstanceId));
      return null;
    }

    return { application: app, action: act };
  }, [selectedActionId, applicants, getAllTasks]);

  const handleSelectAppActions = (applicationId: string, actionId: string) => {
    setSelectedActionId(`${applicationId}:${actionId}`);
  };

  const handleTaskAction = (e, application, action) => {
      console.log("handleTaskAction called with action:", action, "for application:", application);
      e.stopPropagation();
      e.preventDefault();
      console.log('Action clicked: handleTaskAction', action, 'for application:', application);
      /*if (action === 'manage_ingredients') {
        const app = applicants.find(a => a.id === applicantId);
        setSelectedIngredientApp(app);
        setShowIngredientsManager(true);
        return;
      }*/
      handleSelectAppActions(application.id, action.TaskInstanceId);
      //setSelectedAction({ application, action });
      const actionType = action.taskType?.toLowerCase(); // e.g., "confirm", "conditional", "action"
      const actionCategory = action.taskCategory?.toLowerCase(); // e.g., "confirmation", "approval", "assignment", "selector", "input"
      if(actionType === "confirm" && actionCategory === "confirmation"){
        console.log("TaskType :"+actionType);
        executeAction("Confirmed", action);
      } else if((actionType === "conditional" || actionType === "condition") && actionCategory === "approval"){
        console.log("Conditional Action :"+actionType);
        setShowConditionModal(action);
      } else if(actionType === "action" && actionCategory === "assignment"){
        console.log("Assignment Action :"+actionType);
        setShowActionModal(action);
      } else if(actionType === "action" && actionCategory === "selector"){
        setShowConditionModal(action);
      } else if(actionType === "action" && actionCategory === "input"){
        console.log("Input Action :"+actionType);
        setShowConditionModal(action);
      } else if(actionType === "action" && actionCategory === "scheduling"){
        console.log("Scheduling Action :"+actionType);
        setShowConditionModal(action);
      }
    };
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">NCRC Dashboard</h2>
        <p className="text-gray-600">Executive Overview - Certification Management</p>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
          <option value="contract_sent">Contract Sent</option>
          <option value="under_review">Under Review</option>
          <option value="inspection_scheduled">Inspection Scheduled</option>
          <option value="payment_pending">Payment Pending</option>
          <option value="certified">Certified</option>
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

      {/* List */}
      {isLoading && <div className="text-gray-500">Loading applicants...</div>}
      {isError && <div className="text-red-600">Error: {(error as Error).message}</div>}

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          Showing {applicants.length} of {applicants.length} applications
        </p>
      </div>

      <div className="space-y-4">
        {applicants.length > 0 ? (
          applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              setShowIngredientsManager={setShowIngredientsManager}
              setSelectedIngredientApp={setSelectedIngredientApp}
              setActiveScreen={setActiveScreen}
              handleTaskAction={handleTaskAction}
            />
          ))
        ) : (
          !isLoading && (<div className="text-center py-12">
              <p className="text-gray-500 text-lg">No applications match your current filters.</p>
              <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
            </div>)
        )}
      </div>

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