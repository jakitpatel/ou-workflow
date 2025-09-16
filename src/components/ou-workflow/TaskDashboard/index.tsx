 import React, { useState,useEffect, useRef,useMemo, use } from 'react';
 import { Search, Filter, Bell, Clock, AlertTriangle, CheckCircle, Wrench, ChevronDown, MessageCircle, X, History, Check, User, CheckSquare, Mail, Send, FileText } from 'lucide-react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { fetchApplicants, fetchRcs, assignTask, confirmTask, sendMsgTask } from './../../../api'; // same api.ts
 import { useUser } from './../../../context/UserContext'  // 👈 new import
 import { ActionModal } from './../modal/ActionModal';
 import { TaskActionsPanel } from './TaskActionsPanel';
 import { TaskMessagesPanel } from './TaskMessagesPanel';
 import { PlantHistoryModal } from './PlantHistoryModal';
 import { TaskStatsCards } from './TaskStatsCards';
 import { TaskFilters } from './TaskFilters';

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

    const { username, role, setRole, setActiveScreen } = useUser() // 👈 use context
    const [showActionModal, setShowActionModal] = useState(null);
    const [selectedAction, setSelectedAction] = useState(null);
    const [showAllActions, setShowAllActions] = useState<Record<string, boolean>>({});
    const MAX_ACTIONS_SHOWN = 4; // configurable

    const messageInputRefs = useRef({});

    const queryClient = useQueryClient();

   //const queryClient = useQueryClient()
   //const applicants = queryClient.getQueryData(['applicants']) || []
   const {
      data: tasksplants = [],
      isLoading,
      isError,
      error,
    } = useQuery({
      queryKey: ['tasksplants'],
      queryFn: fetchApplicants,  // same queryFn as NCRCDashboard
    })
    // RC Lookup data
    const {
      data: rcnames = [],
    } = useQuery({
      queryKey: ['rcnames'],
      queryFn: fetchRcs,  // same queryFn as NCRCDashboard
    })

    // Cross-navigation handler
    const handleViewNCRCDashboard = (plantName) => {
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

    // Staff for assignments
    const staff = [
      { id: 'a.gottesman', name: 'A. Gottesman', department: 'Admin' },
      { id: 'd.herbsman', name: 'David Herbsman', department: 'IAR' },
      { id: 'j.torres', name: 'Jennifer Torres', department: 'RFR' },
      { id: 'r.gorelik', name: 'R. Gorelik', department: 'NCRC' },
      { id: 'r.epstein', name: 'R. Epstein', department: 'NCRC' },
      { id: 'legal.team', name: 'Legal Team', department: 'Legal' }
    ];

    // Plant history data
    const plantHistory = {
      'Brooklyn Bread Co.': {
        applications: 3,
        lastCertified: '2023-12-15',
        currentStage: 'NDA Review',
        notes: 'Long-standing client, typically smooth process',
        contact: 'Sarah Mitchell - Operations Manager',
        products: ['Artisan Breads', 'Pastries', 'Seasonal Items']
      },
      'Artisan Bakery': {
        applications: 1,
        lastCertified: null,
        currentStage: 'Contract Processing',
        notes: 'New client, first-time certification',
        contact: 'Michael Chen - Owner',
        products: ['Sourdough Breads', 'Organic Pastries']
      },
      'Metro Spice Company': {
        applications: 5,
        lastCertified: '2024-08-20',
        currentStage: 'Payment Follow-up',
        notes: 'Payment delays in past, requires follow-up',
        contact: 'Jennifer Rodriguez - Finance',
        products: ['Spice Blends', 'Seasoning Mixes', 'Organic Herbs']
      },
      'Happy Snacks': {
        applications: 2,
        lastCertified: '2024-01-10',
        currentStage: 'Certification Pending',
        notes: 'Quick turnaround expected',
        contact: 'David Park - Production Manager',
        products: ['Snack Bars', 'Dried Fruits', 'Nuts']
      }
    };

    // Sample tasks with workflow stages
    const [allTasks, setAllTasks] = useState([
      {
        id: 1,
        title: 'Review NDA Documentation',
        plant: 'Brooklyn Bread Co.',
        assignedTo: 'A. Gottesman',
        assignedBy: 'R. Gorelik',
        status: 'overdue',
        priority: 'high',
        daysActive: 5,
        applicationId: 'APP-2025-001',
        workflowStage: 'NDA'
      },
      {
        id: 2,
        title: 'Process Ingredient Review',
        plant: 'Artisan Bakery',
        assignedTo: 'A. Gottesman',
        assignedBy: 'R. Epstein',
        status: 'in_progress',
        priority: 'medium',
        daysActive: 2,
        applicationId: 'APP-2025-005',
        workflowStage: 'Ingredients'
      },
      {
        id: 3,
        title: 'Schedule Initial Inspection',
        plant: 'Metro Spice Company',
        assignedTo: 'A. Gottesman',
        assignedBy: 'R. Dick',
        status: 'overdue',
        priority: 'urgent',
        daysActive: 7,
        applicationId: 'APP-2025-004',
        workflowStage: 'Inspection'
      },
      {
        id: 4,
        title: 'Finalize Contract Terms',
        plant: 'Happy Snacks',
        assignedTo: 'A. Gottesman',
        assignedBy: 'System',
        status: 'new',
        priority: 'medium',
        daysActive: 1,
        applicationId: 'APP-2025-008',
        workflowStage: 'Contract'
      }
    ]);

    // Messages for each task
    const [taskMessages, setTaskMessages] = useState({
      1: [
        { id: 1, sender: 'R. Gorelik', text: 'NDA received from Brooklyn Bread, needs review', timestamp: new Date('2025-01-15T10:30:00'), isSystemMessage: false },
        { id: 2, sender: 'System', text: 'Task overdue - 5 days active', timestamp: new Date('2025-01-20T09:00:00'), isSystemMessage: true },
      ],
      2: [
        { id: 3, sender: 'R. Epstein', text: 'Invoice processing needed for contract completion', timestamp: new Date('2025-01-18T14:15:00'), isSystemMessage: false }
      ],
      3: [
        { id: 4, sender: 'R. Dick', text: 'KIM payment still pending - company not responding', timestamp: new Date('2025-01-13T16:20:00'), isSystemMessage: false },
        { id: 5, sender: 'System', text: 'Payment overdue - escalation required', timestamp: new Date('2025-01-20T08:00:00'), isSystemMessage: true }
      ]
    });

    // helper: flatten all tasks from all stages
    const getAllTasks = (app) => {
      if (!app?.stages) return [];
      return Object.values(app.stages).flatMap(stage => stage.tasks || []);
    };

    const taskStats = useMemo(() => {
      const allTasks = tasksplants.flatMap(app => getAllTasks(app))

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
        inProgress: userTasks.filter(t => t.status === 'in_progress').length,
        overdue: userTasks.filter(t => t.status === 'overdue').length,
        completed: userTasks.filter(t => t.status === 'completed').length,
      }
    }, [username, tasksplants])

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
      let filtered = tasksplants.filter(task => {
        //if (task.assignedTo !== username) return false;
        
        const matchesSearch = !searchTerm ||
        (task.title && task.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.plant && task.plant.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (task.company && task.company.toLowerCase().includes(searchTerm.toLowerCase()));
        
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

    // Helper functions
    const getStatusConfig = (status, daysActive = 0) => {
      const configs = {
        new: { label: 'New', color: 'bg-blue-100 text-blue-800', icon: Bell },
        in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        overdue: { label: `Overdue (${daysActive}d)`, color: 'bg-red-100 text-red-800', icon: AlertTriangle },
        completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      };
      return configs[status] || configs.new;
    };

    const getPriorityBorderClass = (priority) => {
      const classes = {
        urgent: 'border-l-4 border-red-500',
        high: 'border-l-4 border-orange-400',
        medium: 'border-l-4 border-blue-400',
        low: 'border-l-4 border-gray-400'
      };
      return classes[priority] || classes.medium;
    };

    const getStageColor = (stage) => {
      const colors = {
        'Application': 'bg-purple-100 text-purple-700',
        'NDA': 'bg-blue-100 text-blue-700',
        'Inspection': 'bg-orange-100 text-orange-700',
        'Ingredients': 'bg-green-100 text-green-700',
        'Products': 'bg-indigo-100 text-indigo-700',
        'Contract': 'bg-yellow-100 text-yellow-700',
        'Certification': 'bg-emerald-100 text-emerald-700'
      };
      return colors[stage] || 'bg-gray-100 text-gray-700';
    };

    const getMessageCount = (app) => {
      const messageCounts = app.task_messages?.length || 0;
      return { total: messageCounts, unread: 0 };
    };

   const mapTaskToAction = (taskitem, application) => {
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

      if (status === 'completed' || status === 'done') {
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

        const isAssigned = roles.some(ar => ar[role] === username);
        console.log('isAssigned:', isAssigned);

        if (isAssigned && status==='ready') {
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

      return {
        id: `${taskitem.TaskId}`,
        label: taskitem.name,
        status: taskitem.status,
        required: taskitem.required,
        assignee: taskitem.assignee,
        taskType: taskitem.taskType,
        color,
        icon,
        disabled,
      };
    };

    // main: get actions for an application
    const getTaskActions = (app) => {
      const baseActions = [];/*[
        { id: 'complete', label: 'Mark Complete', icon: Check, color: 'bg-green-600 hover:bg-green-700' },
        { id: 'reassign', label: 'Reassign', icon: User, color: 'bg-blue-600 hover:bg-blue-700' }
      ];*/

      const allTasks = getAllTasks(app);
      const taskActions = allTasks.map(task => mapTaskToAction(task, app));
      // return flat list of tasks + base actions
      return [...taskActions, ...baseActions];
    };

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
        queryClient.invalidateQueries({ queryKey: ["applicants"] });
      }
    });

    const handleSendMessage = (taskId) => {
      const messageText = messageInputs[taskId];
      if (!messageText?.trim()) return;
      
      const newMessage = {
        id: Date.now(),
        appId: taskId,
        sender: username,
        text: messageText,
        timestamp: new Date(),
        isSystemMessage: false,
      };
      sendMsgTaskMutation.mutate(newMessage);
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

    const handleTaskAction = (e, application, action) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('Action clicked: handleTaskAction', action, 'for application:', application);
      /*if (action === 'manage_ingredients') {
        const app = applicants.find(a => a.id === applicantId);
        setSelectedIngredientApp(app);
        setShowIngredientsManager(true);
        return;
      }*/

      setSelectedAction({ application, action });
      if(action.taskType === "confirm"){
        console.log("TaskType :"+action.taskType);
        executeAction("Confirmed");
      } else{
        setShowActionModal(action);
      }
    };

    /*const handleTaskAction = (taskId, action) => {
      const actionId = action.id;
      if (actionId === 'complete') {
        handleTaskComplete(taskId);
      } else if (actionId === 'reassign') {
        setShowReassignDropdown(prev => ({
          ...prev,
          [taskId]: true
        }));
      } else {
        const task = allTasks.find(t => t.id === taskId);
        const actionLabels = {
          'set_fee': 'Fee set for inspection',
          'select_rfr': 'RFR selected for inspection',
          'schedule_inspection': 'Inspection scheduled with company',
          'contact_company': 'Company contacted for follow-up',
          'send_to_legal': 'NDA sent to legal team for review',
          'send_to_iar': 'Ingredient list sent to IAR for review',
          'send_contract': 'Contract sent to company for signature'
        };
        
        const actionMessage = actionLabels[actionId] || `Action ${actionId} completed`;
        alert(`✅ ${actionMessage} for ${task?.plant}`);
        
        handleTaskComplete(taskId);
      }
    };*/

    const handleTaskComplete = (taskId) => {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      const completedTask = {
        ...task,
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      setAllTasks(prev => prev.map(t => t.id === taskId ? completedTask : t));
      
      const feedback = {
        id: Date.now(),
        taskId: taskId,
        taskTitle: task.title,
        taskPlant: task.plant,
        timestamp: new Date(),
        dismissed: false
      };
      
      setCompletionFeedback(prev => [feedback, ...prev]);

      setTimeout(() => {
        setCompletionFeedback(prev => prev.filter(f => f.id !== feedback.id));
      }, 10000);

      setExpandedActions(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(taskId);
        return newExpanded;
      });
      setExpandedMessages(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(taskId);
        return newExpanded;
      });
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

    const handleShowPlantHistory = (plantName) => {
      setShowPlantHistory(plantName);
    };

    const handleCreateTaskFromMessage = (taskId) => {
      const messageText = messageInputs[taskId];
      if (!messageText?.trim()) return;

      setShowTaskAssignment(prev => ({
        ...prev,
        [taskId]: true
      }));
      setTaskAssignmentData(prev => ({
        ...prev,
        [taskId]: {
          taskText: messageText,
          assignee: username
        }
      }));
    };

    const handleConfirmTaskCreation = (taskId) => {
      const assignmentData = taskAssignmentData[taskId];
      if (!assignmentData?.taskText?.trim()) return;

      const newTask = {
        id: Date.now(),
        title: assignmentData.taskText.length > 50 ? assignmentData.taskText.substring(0, 50) + '...' : assignmentData.taskText,
        plant: allTasks.find(t => t.id === taskId)?.plant || 'Unknown Plant',
        workflowStage: 'Application',
        assignedTo: assignmentData.assignee,
        assignedBy: username,
        status: 'new',
        priority: 'medium',
        daysActive: 0,
        applicationId: `APP-2025-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      };

      setAllTasks(prev => [...prev, newTask]);
      
      // Clear states
      setMessageInputs(prev => ({ ...prev, [taskId]: '' }));
      setShowTaskAssignment(prev => ({ ...prev, [taskId]: false }));
      setTaskAssignmentData(prev => ({ ...prev, [taskId]: null }));

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
        [taskId]: [...(prev[taskId] || []), systemMessage]
      }));

      // Refocus input
      setTimeout(() => {
        if (messageInputRefs.current[taskId]) {
          messageInputRefs.current[taskId].focus();
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
        queryClient.invalidateQueries({ queryKey: ["applicants"] });
      }
    });

    //const assignTaskMutation = useAssignTask();
    const assignTaskMutation = useMutation({
      mutationFn: assignTask,
      onSuccess: () => {
        // 🔄 Invalidate to refresh data
        queryClient.invalidateQueries({ queryKey: ["applicants"] });
      }
    });
    const executeAction = (assignee: string) => {
      if (selectedAction) {
        const taskId = selectedAction.action.id;
        const appId  = selectedAction.application.id;

        if(selectedAction.action.taskType === "confirm"){
          confirmTaskMutation.mutate({
            appId,
            taskId
          });
        } else if(selectedAction.action.taskType === "action"){
            const role =
              selectedAction.action.label === "Assign NCRC"
                ? "NCRC"
                : "OtherRole"; // adjust logic

            assignTaskMutation.mutate({
              appId,
              taskId,
              role,
              assignee
            });
          }
      }
    };

    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <ActionModal
            rcnames={rcnames}
            setShowActionModal={setShowActionModal} 
            showActionModal={showActionModal}
            executeAction={executeAction}
            selectedAction={selectedAction}
            />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => {
                  const statusConfig = getStatusConfig(task.status, task.daysActive);
                  const isActionsExpanded = expandedActions.has(task.id);
                  const isMessagesExpanded = expandedMessages.has(task.id);
                  const messageCounts = getMessageCount(task);
                  const plantInfo = plantHistory[task.plant];

                  return (
                    <React.Fragment key={task.id}>
                      <tr className={`hover:bg-gray-50 ${getPriorityBorderClass(task.priority)}`}>
                        {/* Task & Plant Column */}
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {/* Plant name - prominent and clickable */}
                            <button 
                              onClick={() => handleShowPlantHistory(task.plant)}
                              className="text-left group"
                              title={`Click to view ${task.plant} history. ${plantInfo?.applications || 0} applications`}
                            >
                              <div className="text-base font-bold group-hover:text-blue-600 transition-colors text-gray-900">
                                {task.plant}
                                <History className="w-4 h-4 inline ml-2 opacity-60 group-hover:opacity-100" />
                              </div>
                            </button>
                            
                            {/* Task title with stage label */}
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded font-medium ${getStageColor(task.workflowStage)}`}>
                                {task.workflowStage}
                              </span>
                              <span className="font-medium text-sm text-gray-900">
                                {task.title}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleActionsExpand(task.id)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            <Wrench className="w-4 h-4" />
                            <span className="text-sm">Actions</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isActionsExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>

                        {/* Messages Column */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleMessagesExpand(task.id)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm">
                              {messageCounts.total} message{messageCounts.total !== 1 ? 's' : ''}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isMessagesExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            <statusConfig.icon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>

                      {isActionsExpanded && (
                        <TaskActionsPanel
                          application={task}
                          username={username}
                          staff={staff}
                          showReassignDropdown={showReassignDropdown}
                          setShowReassignDropdown={setShowReassignDropdown}
                          getTaskActions={getTaskActions}
                          handleTaskAction={handleTaskAction}
                          handleReassignTask={handleReassignTask}
                        />
                      )}

                      {/* Expanded Messages Panel */}
                      {isMessagesExpanded && (
                        <TaskMessagesPanel
                          application={task}
                          username={username}
                          staff={staff}
                          taskMessages={task.task_messages || []}
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
                      )}
                    </React.Fragment>
                  );
                })}
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
      </div>
    );
  };
