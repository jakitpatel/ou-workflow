 import React, { useState,useEffect, useRef,useMemo } from 'react';
 import { CheckCircle, X, CheckSquare } from 'lucide-react';
 import { useMutation, useQueryClient } from '@tanstack/react-query';
 import { assignTask, confirmTask, sendMsgTask } from '@/api'; // same api.ts
 import { useUser } from '@/context/UserContext'  // 👈 new import
 import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
 import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
 import { PlantHistoryModal } from './PlantHistoryModal';
 import { TaskStatsCards } from './TaskStatsCards';
 import { TaskFilters } from './TaskFilters';
 import { TaskRow } from './TaskRow';
 import { formatNowForApi } from './taskHelpers';

import { plantHistory } from './demoData';
import { useTasks } from './../hooks/useTaskDashboardHooks';
import { ErrorDialog, type ErrorDialogRef } from "@/components/ErrorDialog";
import { useTaskContext } from '@/context/TaskContext';

 // Tasks Dashboard Component (with full table functionality restored)
export function TaskDashboard (){
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [expandedActions, setExpandedActions] = useState(new Set());
    const [expandedMessages, setExpandedMessages] = useState(new Set());
    const [messageInputs, setMessageInputs] = useState({});
    const [showTaskAssignment, setShowTaskAssignment] = useState({});
    const [taskAssignmentData, setTaskAssignmentData] = useState({});
    const [showPlantHistory, setShowPlantHistory] = useState(null);
    const [recentReassignments, setRecentReassignments] = useState([]);
    const [completionFeedback, setCompletionFeedback] = useState([]);
    const [showReassignDropdown, setShowReassignDropdown] = useState({});

    const { username, role, roles, setActiveScreen, token, strategy } = useUser() // 👈 use context
    const [showActionModal, setShowActionModal] = useState(null);
    const [showConditionModal, setShowConditionModal] = useState(null);
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
    //const [selectedAction, setSelectedAction] = useState(null);

    const messageInputRefs = useRef({});
    const { applicationId, setApplicationId } = useTaskContext();
    const queryClient = useQueryClient();
    const errorDialogRef = useRef<ErrorDialogRef>(null);
    // Fetch tasks and plants
    const {
      data: tasksplants = [],
      isLoading,
      isError,
    } = useTasks(applicationId || undefined);

    // Cross-navigation handler
    const handleViewNCRCDashboard = () => {
      console.log('Returning to NCRC Dashboard');
      setApplicationId(null);
      setActiveScreen('ncrc-dashboard');
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!event.target.closest('.task-assignment-panel') &&
            !event.target.closest('.plant-history-modal')) {
          setShowTaskAssignment({});
          setShowReassignDropdown({});
          if (!event.target.closest('.plant-history-modal')) {
            setShowPlantHistory(null);
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    /*const stageOrder = [
      { key: 'initial', name: 'Initial' },
      { key: 'nda', name: 'NDA' },
      { key: 'inspection', name: 'Inspection' },
      { key: 'ingredients', name: 'Ingredients' },
      { key: 'products', name: 'Products' },
      { key: 'contract', name: 'Contract' },
      { key: 'certification', name: 'Certification' }
    ]*/
    // Usage: getAllTasks(app)                      -> old behavior, tasks only
//        getAllTasks(app, { includeStage: true }) -> tasks with `.stage` added
    /*const getAllTasks = (app, options = { includeStage: false }) => {
      if (!app?.stages) return [];

      const includeStage = !!options.includeStage;

      // Build a case-insensitive map of stages: lowercased key -> { key, stageObj }
      const stageKeyMap = Object.keys(app.stages).reduce((acc, realKey) => {
        acc[realKey.toLowerCase()] = { key: realKey, stage: app.stages[realKey] };
        return acc;
      }, {});

      // If stageOrder exists and is an array, use it to control ordering
      if (Array.isArray(stageOrder) && stageOrder.length > 0) {
        return stageOrder.flatMap(entry => {
          // accept entry as either string or object { key, name }
          const desiredName = typeof entry === 'string' ? entry : (entry.name ?? entry.key ?? '');
          if (!desiredName) return [];

          const lookup = desiredName.toLowerCase();
          const found = stageKeyMap[lookup];

          // If not found by name, also try 'key' field from entry (useful if stageOrder uses different naming)
          let stageObj = found ? found.stage : null;
          let realStageName = found ? found.key : null;
          if (!stageObj && typeof entry === 'object' && entry.key) {
            const alt = stageKeyMap[(entry.key + '').toLowerCase()];
            if (alt) {
              stageObj = alt.stage;
              realStageName = alt.key;
            }
          }

          if (!stageObj) return []; // skip missing stage

          const tasks = stageObj.tasks || [];
          if (!includeStage) return tasks;
          return tasks.map(t => ({ ...t, stage: realStageName || desiredName }));
        });
      }

      // Fallback: preserve original behaviour (insertion order of app.stages)
      return Object.values(app.stages).flatMap(stage => stage.tasks || []);
    };*/

    const taskStats = useMemo(() => {
      const allTasks = tasksplants;
      // normalize status + filter by user (if needed)
      const userTasks = allTasks
        .map(task => ({
          ...task,
          status: task.status?.toLowerCase() || ''
        }))
        //.filter(task => task.assignedTo === username) // uncomment if you only want current user's tasks

      return {
        total: userTasks.length,
        new: userTasks.filter(t => t.status === 'new').length,
        inProgress: userTasks.filter(t => {
          const s = t.status?.toLowerCase();
          return s === 'in_progress' || s === 'pending';
        }).length,
        overdue: userTasks.filter(t => t.status === 'overdue').length,
        completed: userTasks.filter(t => {
          const s = t.status?.toLowerCase();
          return s === 'completed' || s === 'complete';
        }).length,
      }
    }, [username, tasksplants])

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
      // Normalize user roles
      const isAllRole = role?.toUpperCase() === 'ALL';
      const userRoles = isAllRole
        ? (roles ?? []).map(r => r.value?.toLowerCase()).filter(Boolean)
        : role
        ? [role.toLowerCase()]
        : [];
      console.log('User Roles for filtering:', userRoles);
      let filtered = tasksplants.filter(task => {
        // ✅ If 'ALL' role selected → skip role check and show all tasks
        if (!isAllRole) {
          const taskRole = task.assigneeRole?.toLowerCase();
          if (!taskRole || !userRoles.includes(taskRole)) return false;
        }
        
        const matchesSearch = !searchTerm ||
        (task.taskName && task.taskName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.plantName && task.plantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.companyName && task.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === 'all' || 
          (statusFilter === 'active' && task.status !== 'completed') ||
          task.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });

      return filtered.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return b.daysActive - a.daysActive;
      });
    }, [tasksplants, username, searchTerm, statusFilter]);

   /*const mapTaskToAction = (taskitem, application) => {
      let color, icon, disabled = false;

      // Normalize status
      const status = taskitem.status?.toLowerCase();

      // Always normalize taskRole into array
      // Normalize taskRoles into array of strings
      const taskRoles = Array.isArray(taskitem.taskRoles)
        ? taskitem.taskRoles.map(r => r.taskRole).filter(Boolean)
        : taskitem.taskRole
          ? [taskitem.taskRole]
          : [];

      if (status === 'complete' || status === 'done' || status === 'completed') {
        // Completed task → show as done
        color = 'bg-green-400';
        icon = CheckSquare;
        disabled = true;

      } else if (taskRoles.length > 0 && !taskRoles.includes(role)) {
        // Task roles exist but don't include current user's role → disabled
        color = 'bg-gray-300 cursor-not-allowed';
        disabled = true;

      } else if (taskRoles.includes(role)) {
        console.log('taskitem:', taskitem, 'application:', application);

        // Role matches → check assignment
        const roles = Array.isArray(application?.assignedRoles) ? application.assignedRoles : [];

        const isAssigned = roles.some((ar: any) => ar[role] === username);
        console.log('isAssigned:', isAssigned);

        if (isAssigned && status==='pending') {
          // Active & assigned to current user → allowed
          color = 'bg-blue-600 hover:bg-blue-700';
        } else {
          // Not assigned or inactive
          color = 'bg-gray-300 cursor-not-allowed';
          disabled = true;
        }
      } else {
        // No roles defined at all → disabled
        color = 'bg-gray-300 cursor-not-allowed';
        disabled = true;
      }
      const taskTypeval = taskitem.taskType
      ? taskitem.taskType.toLowerCase()
      : "unknown";
      const taskCategoryval = taskitem.taskCategory
      ? taskitem.taskCategory.toLowerCase()
      : "unknown";
      return {
        TaskInstanceId: `${taskitem.TaskInstanceId}`,
        name: taskitem.name,
        status: taskitem.status,
        required: taskitem.required,
        assignee: taskitem.assignee,
        taskType: taskTypeval,
        taskCategory: taskCategoryval,
        color,
        icon,
        disabled,
      };
    };*/

    // main: get actions for an application
    /*const getTaskActions = (app) => {
      const baseActions = [];

      const allTasks = getAllTasks(app);
      const taskActions = allTasks.map(task => mapTaskToAction(task, app));
      // return flat list of tasks + base actions
      return [...taskActions, ...baseActions];
    };*/

    // Event handlers
    const handleActionsExpand = (taskId) => {
      setExpandedActions(prev => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(taskId)) {
          newExpanded.delete(taskId);
        } else {
          newExpanded.add(taskId);
          setExpandedMessages(prev => {
            const newMessages = new Set(prev);
            newMessages.delete(taskId);
            return newMessages;
          });
        }
        return newExpanded;
      });
    };

    const handleMessagesExpand = (taskId) => {
      setExpandedMessages(prev => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(taskId)) {
          newExpanded.delete(taskId);
        } else {
          newExpanded.add(taskId);
          setExpandedActions(prev => {
            const newActions = new Set(prev);
            newActions.delete(taskId);
            return newActions;
          });
          setTimeout(() => {
            if (messageInputRefs.current[taskId]) {
              messageInputRefs.current[taskId].focus();
            }
          }, 100);
        }
        return newExpanded;
      });
    };

    const handleMessageInputChange = (taskId, value) => {
      setMessageInputs(prev => ({
        ...prev,
        [taskId]: value
      }));
    };

    const sendMsgTaskMutation = useMutation({
      mutationFn: sendMsgTask,
      onSuccess: () => {
        // 🔄 Invalidate to refresh data
        queryClient.invalidateQueries({ queryKey: ["applications"] });
      },
      onError: (error: any) => {
        console.error("❌ Failed to send message:", error);
      }
    });

    const handleSendMessage = (taskId) => {
      const messageText = messageInputs[taskId];
      if (!messageText?.trim()) return;
      const newMessage = {
        data: {
          type: "WFApplicationMessage",
          attributes: {
            ApplicationID: taskId,
            FromUser: username,
            ToUser: "",
            MessageText: messageText,
            MessageType: "USER",
            Priority: "HIGH",
            SentDate: formatNowForApi(), // 👈 current timestamp
          },
        },
      };
      sendMsgTaskMutation.mutate({
        newMessage,
        token,
        strategy,
      });
      /*setTaskMessages(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newMessage]
      }));*/
      
      setMessageInputs(prev => ({
        ...prev,
        [taskId]: ''
      }));

      setTimeout(() => {
        if (messageInputRefs.current[taskId]) {
          messageInputRefs.current[taskId].focus();
        }
      }, 50);
    };

    const handleReassignTask = (taskId, newAssignee) => {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      const reassignment = {
        id: Date.now(),
        taskId,
        taskTitle: task.title,
        fromUser: task.assignedTo,
        toUser: newAssignee,
        timestamp: new Date(),
        dismissed: false
      };

      setRecentReassignments(prev => [reassignment, ...prev.slice(0, 4)]);

      setTimeout(() => {
        setRecentReassignments(prev => prev.filter(r => r.id !== reassignment.id));
      }, 10000);

      setAllTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              assignedTo: newAssignee,
              isReassigned: true,
              originalAssignee: task.assignedTo
            }
          : t
      ));

      setShowReassignDropdown(prev => ({ ...prev, [taskId]: false }));
      setExpandedActions(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(taskId);
        return newExpanded;
      });
    };

    const handleUndoCompletion = (taskId) => {
      setAllTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: t.daysActive > 3 ? 'overdue' : 'in_progress', completedAt: null }
          : t
      ));
      
      setCompletionFeedback(prev => prev.filter(f => f.taskId !== taskId));
    };

    const handleDismissCompletionFeedback = (feedbackId) => {
      setCompletionFeedback(prev => prev.filter(f => f.id !== feedbackId));
    };

    const handleUndoReassignment = (reassignmentId) => {
      const reassignment = recentReassignments.find(r => r.id === reassignmentId);
      if (!reassignment) return;

      setAllTasks(prev => prev.map(t => 
        t.id === reassignment.taskId 
          ? { 
              ...t, 
              assignedTo: reassignment.fromUser,
              isReassigned: false,
              originalAssignee: null
            }
          : t
      ));

      setRecentReassignments(prev => prev.filter(r => r.id !== reassignmentId));
    };

    const handleDismissReassignment = (reassignmentId) => {
      setRecentReassignments(prev => prev.filter(r => r.id !== reassignmentId));
    };

    const handleShowPlantHistory = (plantName: string) => {
      setShowPlantHistory(plantName);
    };

    const handleCreateTaskFromMessage = (applicantId) => {
      const messageText = messageInputs[applicantId];
      if (!messageText?.trim()) return;

      setShowTaskAssignment(prev => ({
        ...prev,
        [applicantId]: true
      }));
      setTaskAssignmentData(prev => ({
        ...prev,
        [applicantId]: {
          taskText: messageText,
          assignee: username
        }
      }));
    };

    const handleConfirmTaskCreation = (applicantId) => {
      const assignmentData = taskAssignmentData[applicantId];
      if (!assignmentData?.taskText?.trim()) return;

      const newMessage = {
        data: {
          type: "WFApplicationMessage",
          attributes: {
            ApplicationID: applicantId,
            FromUser: username,
            ToUser: assignmentData.assignee,
            MessageText: assignmentData.taskText.length > 50 ? assignmentData.taskText.substring(0, 50) + '...' : assignmentData.taskText,
            MessageType: "USER",
            Priority: "HIGH",
            SentDate: formatNowForApi(), // 👈 current timestamp
          },
        },
      };
      sendMsgTaskMutation.mutate({
        newMessage,
        token,
        strategy
      });

      //setAllTasks(prev => [...prev, newTask]);
      
      // Clear states
      setMessageInputs(prev => ({ ...prev, [applicantId]: '' }));
      setShowTaskAssignment(prev => ({ ...prev, [applicantId]: false }));
      setTaskAssignmentData(prev => ({ ...prev, [applicantId]: null }));
      /*
      // Add system message
      const systemMessage = {
        id: Date.now() + 1,
        sender: 'System',
        text: `✅ Task created: "${newTask.title}" → assigned to ${assignmentData.assignee}`,
        timestamp: new Date(),
        isSystemMessage: true,
      };
      
      setTaskMessages(prev => ({
        ...prev,
        [applicantId]: [...(prev[applicantId] || []), systemMessage]
      }));*/

      // Refocus input
      setTimeout(() => {
        if (messageInputRefs.current[applicantId]) {
          messageInputRefs.current[applicantId].focus();
        }
      }, 100);
    };

    const handleKeyPress = (e, taskId) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          if (showTaskAssignment[taskId]) {
            handleConfirmTaskCreation(taskId);
          } else {
            handleCreateTaskFromMessage(taskId);
          }
        } else {
          handleSendMessage(taskId);
        }
      }
    };

    const confirmTaskMutation = useMutation({
      mutationFn: confirmTask,
      onSuccess: () => {
        // 🔄 Invalidate to refresh data
        queryClient.invalidateQueries({ queryKey: ["tasksplants"] });
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
        queryClient.invalidateQueries({ queryKey: ["tasksplants"] });
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
        const taskCategory = action.taskCategory?.toLowerCase() || action.TaskCategory?.toLowerCase();
        const taskId = action?.TaskInstanceId ?? action?.taskInstanceId;

        if (taskType === "confirm" && taskCategory === "confirmation") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            token,
            strategy,
            username
          });
        } else if ((taskType === "conditional" || taskType === "condition") && taskCategory === "approval") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token,
            strategy,
            username
          });
        } else if (taskType === "action" && taskCategory === "selector") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token,
            strategy,
            username
          });
        } else if (taskType === "action" && taskCategory === "input") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token,
            strategy,
            username
          });
        }  else if (taskType === "action" && taskCategory === "scheduling") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token,
            strategy,
            username
          });
        } else if (taskType === "action" && taskCategory === "assignment") {
          const appId = selectedAction?.application?.id ?? selectedAction?.application?.applicationId ?? null;
          const rawLabel = action?.name ?? action?.taskName ?? "";
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

    const handleSelectAppActions = (applicationId: string, actionId: string) => {
      setSelectedActionId(`${applicationId}:${actionId}`);
    };

    const selectedAction = React.useMemo(() => {
      if (!selectedActionId) return null;

      const [appId, actId] = selectedActionId.split(":");

      // 🔒 normalize IDs as strings
      const app = tasksplants.find(a => String(a.id) === String(appId));
      if (!app) {
        console.warn("No app found for", appId, tasksplants.map(t => t.id));
        return null;
      }

      //const actions = getTaskActions(app) || [];
      const act = tasksplants.find(a => String(a.taskInstanceId) === String(actId));

      if (!act) {
        console.warn("No action found for", actId, tasksplants.map(a => a.taskInstanceId));
        return null;
      }

      return { application: app, action: act };
    }, [selectedActionId, tasksplants]);

    const handleApplicationTaskAction = (e, application) => {
      console.log("handleApplicationTaskAction called for application:", application);
      e.stopPropagation();
      e.preventDefault();
      console.log('Action clicked: handleApplicationTaskAction for application:', application);
      /*if (action === 'manage_ingredients') {
        const app = applicants.find(a => a.id === applicantId);
        setSelectedIngredientApp(app);
        setShowIngredientsManager(true);
        return;
      }*/
      handleSelectAppActions(application.id, application.taskInstanceId);
      //setSelectedAction({ application, action });
      const actionType = application.taskType?.toLowerCase(); // e.g., "confirm", "conditional", "action"
      const actionCategory = application.TaskCategory?.toLowerCase(); // e.g., "confirmation", "approval", "assignment", "selector", "input"
      if(actionType === "confirm" && actionCategory === "confirmation"){
        console.log("TaskType :"+actionType);
        executeAction("Confirmed", application);
      } else if((actionType === "conditional" || actionType === "condition") && actionCategory === "approval"){
        console.log("Conditional Action :"+actionType);
        setShowConditionModal(application);
      } else if(actionType === "action" && actionCategory === "assignment"){
        console.log("Assignment Action :"+actionType);
        setShowActionModal(application);
      } else if(actionType === "action" && actionCategory === "selector"){
        setShowConditionModal(application);
      } else if(actionType === "action" && actionCategory === "input"){
        console.log("Input Action :"+actionType);
        setShowConditionModal(application);
      } else if(actionType === "action" && actionCategory === "scheduling"){
        console.log("Scheduling Action :"+actionType);
        setShowConditionModal(application);
      }
    };
    
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks & Notifications</h1>
              <p className="text-gray-600 mt-1">Welcome back, {username} • Separated Actions & Messages</p>
            </div>
          </div>

          {/* Stats Cards */}
          <TaskStatsCards stats={taskStats} />

          {/* Filters */}
          <TaskFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          {/* List */}
          {isLoading && <div className="text-gray-500">Loading Tasks & Plants...</div>}
          {isError && <div className="text-red-600">Error: {(error as Error).message}</div>}

          {/* Completion Feedback */}
          <div className="mt-6">
            {completionFeedback.length > 0 && (
              <div className="space-y-2 mb-4">
                {completionFeedback.map(feedback => (
                  <div key={feedback.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Task completed: {feedback.taskTitle}
                        </p>
                        <p className="text-xs text-green-700">
                          {feedback.taskPlant} • {feedback.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUndoCompletion(feedback.taskId)}
                        className="text-xs text-green-700 hover:text-green-900 underline"
                      >
                        Undo
                      </button>
                      <button
                        onClick={() => handleDismissCompletionFeedback(feedback.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reassignment Notifications */}
          <div className="mt-2">
            {recentReassignments.length > 0 && (
              <div className="space-y-2 mb-4">
                {recentReassignments.map(reassignment => (
                  <div key={reassignment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <RotateCcw className="w-5 h-5 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Task reassigned: {reassignment.taskTitle}
                        </p>
                        <p className="text-xs text-blue-700">
                          From {reassignment.fromUser} to {reassignment.toUser} • {reassignment.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUndoReassignment(reassignment.id)}
                        className="text-xs text-blue-700 hover:text-blue-900 underline"
                      >
                        Undo
                      </button>
                      <button
                        onClick={() => handleDismissReassignment(reassignment.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden mt-6">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task & Plant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((application) => (
                  <TaskRow
                    key={application.taskInstanceId}   // ✅ unique key here
                    application={application}
                    username={username}
                    plantInfo={plantHistory[application.plant]}
                    expandedActions={expandedActions}
                    showReassignDropdown={showReassignDropdown}
                    setShowReassignDropdown={setShowReassignDropdown}
                    //getTaskActions={getTaskActions}
                    handleApplicationTaskAction={handleApplicationTaskAction}
                    handleReassignTask={handleReassignTask}
                    expandedMessages={expandedMessages}
                    handleShowPlantHistory={handleShowPlantHistory}
                    handleActionsExpand={handleActionsExpand}
                    handleMessagesExpand={handleMessagesExpand}
                    // ...pass other needed props...
                    taskMessages={application.application_messages || []}
                    messageInputs={messageInputs}
                    messageInputRefs={messageInputRefs}
                    showTaskAssignment={showTaskAssignment}
                    setShowTaskAssignment={setShowTaskAssignment}
                    taskAssignmentData={taskAssignmentData}
                    setTaskAssignmentData={setTaskAssignmentData}
                    handleMessageInputChange={handleMessageInputChange}
                    handleKeyPress={handleKeyPress}
                    handleSendMessage={handleSendMessage}
                    handleCreateTaskFromMessage={handleCreateTaskFromMessage}
                    handleConfirmTaskCreation={handleConfirmTaskCreation}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No tasks match your current filters.</p>
              <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
            </div>
          )}

          {/* Plant History Modal */}
          <PlantHistoryModal
            showPlantHistory={showPlantHistory}
            setShowPlantHistory={setShowPlantHistory}
            plantHistory={plantHistory}
            onViewNCRCDashboard={handleViewNCRCDashboard}
          />
        </div>
        {/* Global Error Dialog */}
        <ErrorDialog ref={errorDialogRef} />
      </div>
    );
  };
