 import React, { useState,useEffect, useRef,useMemo } from 'react';
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
import { useTasks } from '@/components/ou-workflow/hooks/useTaskDashboardHooks';
import { ErrorDialog, type ErrorDialogRef } from "@/components/ErrorDialog";
//import { useTaskContext } from '@/context/TaskContext';

 // Tasks Dashboard Component (with full table functionality restored)
type TaskDashboardProps = { applicationId?: string | number | null };
export function TaskDashboard ({ applicationId }: TaskDashboardProps){
    const [searchTerm, setSearchTerm] = useState('');
    //const [expandedActions, setExpandedActions] = useState(new Set());
    //const [expandedMessages, setExpandedMessages] = useState(new Set());
    const [messageInputs, setMessageInputs] = useState({});
    const [showTaskAssignment, setShowTaskAssignment] = useState({});
    const [taskAssignmentData, setTaskAssignmentData] = useState({});
    const [showPlantHistory, setShowPlantHistory] = useState(null);
    //const [showReassignDropdown, setShowReassignDropdown] = useState({});

    const { username, role, roles, setActiveScreen, token, strategy } = useUser() // 👈 use context
    const [showActionModal, setShowActionModal] = useState<boolean | null>(null);
    const [showConditionModal, setShowConditionModal] = useState<boolean | null>(null);
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
    //const [selectedAction, setSelectedAction] = useState(null);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    const messageInputRefs = useRef({});
    //const { applicationId, setApplicationId } = useTaskContext();
    const queryClient = useQueryClient();
    const errorDialogRef = useRef<ErrorDialogRef>(null);
    // Fetch tasks and plants
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 1000);
      return () => clearTimeout(handler);
    }, [searchTerm]); 

    const {
      data: tasksplants = [],
      isLoading,
      isError,
    } = useTasks(applicationId || undefined, debouncedSearchTerm);

    // Cross-navigation handler
    const handleViewNCRCDashboard = () => {
      console.log('Returning to NCRC Dashboard');
      //setApplicationId(null);
      setActiveScreen('ncrc-dashboard');
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!event.target.closest('.task-assignment-panel') &&
            !event.target.closest('.plant-history-modal')) {
          setShowTaskAssignment({});
          //setShowReassignDropdown({});
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
        overdue: userTasks.filter(t => {return t.daysOverdue > 0}).length,
        completed: userTasks.filter(t => {
          const s = t.status?.toLowerCase();
          return s === 'completed' || s === 'complete';
        }).length,
      }
    }, [username, tasksplants])

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
      const isAllRole = role?.toUpperCase() === 'ALL';
      const userRoles = isAllRole
        ? (roles ?? []).map(r => r.value?.toLowerCase()).filter(Boolean)
        : role
        ? [role.toLowerCase()]
        : [];

      let filtered = tasksplants.filter(task => {
        if (!isAllRole) {
          const taskRole = task.assigneeRole?.toLowerCase();
          if (!taskRole || !userRoles.includes(taskRole)) return false;
        }
        return true;
      });

      return filtered.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return (b.daysActive ?? 0) - (a.daysActive ?? 0);
      });
    }, [tasksplants, role, roles]);

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
        token: token ?? undefined,     // ✅ null → undefined
        strategy: strategy ?? undefined, // ✅ null → undefined
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
            token: token ?? undefined,     // ✅ null → undefined
            strategy: strategy ?? undefined, // ✅ null → undefined
            username: username ?? undefined, // ✅ null → undefined
          });
        } else if ((taskType === "conditional" || taskType === "condition") && taskCategory === "approval") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token: token ?? undefined,     // ✅ null → undefined
            strategy: strategy ?? undefined, // ✅ null → undefined
            username: username ?? undefined, // ✅ null → undefined
          });
        } else if (taskType === "action" && taskCategory === "selector") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token: token ?? undefined,     // ✅ null → undefined
            strategy: strategy ?? undefined, // ✅ null → undefined
            username: username ?? undefined, // ✅ null → undefined
          });
        } else if (taskType === "action" && taskCategory === "input") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token: token ?? undefined,     // ✅ null → undefined
            strategy: strategy ?? undefined, // ✅ null → undefined
            username: username ?? undefined, // ✅ null → undefined
          });
        }  else if (taskType === "action" && taskCategory === "scheduling") {
          confirmTaskMutation.mutate({
            taskId: taskId,
            result: result,
            token: token ?? undefined,     // ✅ null → undefined
            strategy: strategy ?? undefined, // ✅ null → undefined
            username: username ?? undefined, // ✅ null → undefined
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
            token: token ?? undefined,
            strategy: strategy ?? undefined,
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
        executeAction("Confirmed", application, "no");
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
          />
          {/* List */}
          {isLoading && <div className="text-gray-500">Loading Tasks & Plants...</div>}
          {isError && <div className="text-red-600">Error: {(error as Error).message}</div>}

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
                    plantInfo={plantHistory[application.plant]}
                    //showReassignDropdown={showReassignDropdown}
                    //setShowReassignDropdown={setShowReassignDropdown}
                    handleApplicationTaskAction={handleApplicationTaskAction}
                    //expandedMessages={expandedMessages}
                    handleShowPlantHistory={handleShowPlantHistory}
                    // ...pass other needed props...
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
