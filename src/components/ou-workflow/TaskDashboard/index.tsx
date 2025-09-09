 import React, { useState,useEffect, useRef,useMemo } from 'react';
 import { Search, Filter, Bell, Clock, AlertTriangle, CheckCircle, Wrench, ChevronDown, MessageCircle, X, History, Check, User, CheckSquare, Mail, Send, FileText } from 'lucide-react';
 import { useQuery } from '@tanstack/react-query';
 import { fetchApplicants } from '../../../api'; // same api.ts
 //import { useQueryClient } from '@tanstack/react-query';
 import { useUser } from './../../../context/UserContext'  // 👈 new import

 // Tasks Dashboard Component (with full table functionality restored)
export function TaskDashboard ({setActiveScreen}){
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
    const { username, role, setRole } = useUser() // 👈 use context

    const messageInputRefs = useRef({});

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
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.plant.toLowerCase().includes(searchTerm.toLowerCase());
        
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

    const getMessageCount = (taskId) => {
      const messages = taskMessages[taskId] || [];
      return { total: messages.length, unread: 0 };
    };

    // helper: map each task into an action object
    const mapTaskToAction = (task) => {
      return {
        id: `task_${task.TaskId}`,
        label: task.name,
        status: task.status,
        required: task.required,
        assignee: task.assignee,
        color: task.status === "Completed"
          ? "bg-gray-400"
          : "bg-green-600 hover:bg-green-700",
        icon: task.status === "Completed" ? CheckSquare : Check
      };
    };

    // main: get actions for an application
    const getTaskActions = (app) => {
      const baseActions = [
        { id: 'complete', label: 'Mark Complete', icon: Check, color: 'bg-green-600 hover:bg-green-700' },
        { id: 'reassign', label: 'Reassign', icon: User, color: 'bg-blue-600 hover:bg-blue-700' }
      ];

      const allTasks = getAllTasks(app);
      const taskActions = allTasks.map(mapTaskToAction);

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

    const handleSendMessage = (taskId) => {
      const messageText = messageInputs[taskId];
      if (!messageText?.trim()) return;
      
      const newMessage = {
        id: Date.now(),
        sender: username,
        text: messageText,
        timestamp: new Date(),
        isSystemMessage: false,
      };
      
      setTaskMessages(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newMessage]
      }));
      
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

    const handleTaskAction = (taskId, actionId) => {
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
    };

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

    // Plant History Modal
    const PlantHistoryModal = () => {
      if (!showPlantHistory) return null;
      
      const plant = plantHistory[showPlantHistory];
      if (!plant) return null;

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="plant-history-modal bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <History className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold">{showPlantHistory}</h3>
              </div>
              <button onClick={() => setShowPlantHistory(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Application History</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Total Applications:</span> {plant.applications}</p>
                    <p><span className="font-medium">Last Certified:</span> {plant.lastCertified || 'Never'}</p>
                    <p><span className="font-medium">Current Stage:</span> {plant.currentStage}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                  <div className="text-sm">
                    <p className="font-medium">{plant.contact}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Products</h4>
                <div className="flex flex-wrap gap-2">
                  {plant.products.map((product, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {product}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{plant.notes}</p>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => {
                    setShowPlantHistory(null);
                    handleViewNCRCDashboard(showPlantHistory);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View in NCRC Dashboard →
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks & Notifications</h1>
              <p className="text-gray-600 mt-1">Welcome back, {username} • Separated Actions & Messages</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mt-6 grid grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
              <div className="text-sm text-blue-700">Total Tasks</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{taskStats.new}</div>
              <div className="text-sm text-yellow-700">New</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{taskStats.inProgress}</div>
              <div className="text-sm text-purple-700">In Progress</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
              <div className="text-sm text-red-700">Overdue</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks or plants..."
                  className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

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
                  const messageCounts = getMessageCount(task.id);
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

                      {/* Expanded Actions Panel */}
                      {isActionsExpanded && (
                        <tr>
                          <td colSpan={4} className="px-0 py-0">
                            <div className="bg-blue-50 border-t border-blue-200">
                              <div className="px-6 py-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-medium text-gray-900 flex items-center">
                                    <Wrench className="w-4 h-4 mr-2" />
                                    Task Actions
                                  </h4>
                                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                    Stage: {task.workflowStage}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  {getTaskActions(task).map((action) => (
                                    <button
                                      key={action.id}
                                      onClick={() => handleTaskAction(task.id, action.id)}
                                      className={`flex items-center justify-center px-4 py-3 text-white rounded-lg transition-colors text-sm font-medium ${action.color}`}
                                    >
                                      <action.icon className="w-4 h-4 mr-2" />
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                                
                                {/* Reassignment Dropdown */}
                                {showReassignDropdown[task.id] && (
                                  <div className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-300">
                                    <h5 className="text-sm font-semibold text-blue-900 mb-3">Reassign Task</h5>
                                    <div className="space-y-2">
                                      {staff.filter(s => s.name !== username).map(person => (
                                        <button
                                          key={person.id}
                                          onClick={() => handleReassignTask(task.id, person.name)}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded border transition-colors"
                                        >
                                          <div className="font-medium">{person.name}</div>
                                          <div className="text-xs text-gray-500">{person.department}</div>
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => setShowReassignDropdown(prev => ({ ...prev, [task.id]: false }))}
                                      className="mt-3 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                                
                                <div className="mt-4 p-3 bg-white rounded border text-xs text-gray-600">
                                  <p><strong>App ID:</strong> {task.applicationId}</p>
                                  <p><strong>Assigned by:</strong> {task.assignedBy}</p>
                                  <p><strong>Days Active:</strong> {task.daysActive}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expanded Messages Panel */}
                      {isMessagesExpanded && (
                        <tr>
                          <td colSpan={4} className="px-0 py-0">
                            <div className="bg-blue-50 border-t border-blue-200">
                              <div className="px-6 py-4">
                                <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Messages & Communications
                                </h4>
                                
                                {/* Messages List */}
                                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                                  {(taskMessages[task.id] || []).length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No messages yet</p>
                                  ) : (
                                    (taskMessages[task.id] || []).map(msg => (
                                      <div key={msg.id} className={`p-3 rounded-lg text-sm ${
                                        msg.isSystemMessage 
                                          ? 'bg-yellow-50 border border-yellow-200' 
                                          : 'bg-white border border-gray-200'
                                      }`}>
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="font-medium text-gray-900">{msg.sender}</span>
                                          <span className="text-xs text-gray-500">
                                            {msg.timestamp.toLocaleDateString()} {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </span>
                                        </div>
                                        <p className="text-gray-700">{msg.text}</p>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Message Input */}
                                <div className="space-y-2">
                                  <div className="flex space-x-2">
                                    <input
                                      ref={el => {
                                        messageInputRefs.current[task.id] = el;
                                      }}
                                      type="text"
                                      placeholder="Type a message..."
                                      className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                                      value={messageInputs[task.id] || ''}
                                      onChange={(e) => handleMessageInputChange(task.id, e.target.value)}
                                      onKeyDown={(e) => handleKeyPress(e, task.id)}
                                    />
                                    {messageInputs[task.id]?.trim() && (
                                      <button
                                        onClick={() => handleCreateTaskFromMessage(task.id)}
                                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
                                        title="Create task from message"
                                      >
                                        <CheckSquare className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleSendMessage(task.id)}
                                      disabled={!messageInputs[task.id]?.trim()}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                      <Send className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    Press Enter to send message{messageInputs[task.id]?.trim() ? ', Ctrl+Enter to create task, or click checkbox to create task' : ', or Ctrl+Enter to create task'}
                                  </p>
                                  
                                  {/* Task Assignment Panel */}
                                  {showTaskAssignment[task.id] && (
                                    <div className="task-assignment-panel mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-400 rounded-lg shadow-lg">
                                      <div className="flex items-center mb-3">
                                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                                          <CheckSquare className="w-4 h-4 text-white" />
                                        </div>
                                        <h5 className="text-lg font-semibold text-purple-900">Create New Task</h5>
                                      </div>
                                      
                                      <div className="bg-white p-3 rounded-lg mb-4 border-l-4 border-purple-500">
                                        <div className="text-sm font-medium text-gray-700 mb-1">Task Description:</div>
                                        <div className="text-sm text-gray-900 italic">"{taskAssignmentData[task.id]?.taskText}"</div>
                                      </div>
                                      
                                      <div className="mb-4">
                                        <label className="block text-sm font-semibold text-purple-800 mb-2">
                                          👤 Assign Task To:
                                        </label>
                                        <select 
                                          className="w-full text-sm border-2 border-purple-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none focus:border-purple-500 bg-white font-medium"
                                          value={taskAssignmentData[task.id]?.assignee || username}
                                          onChange={(e) => {
                                            setTaskAssignmentData(prev => ({
                                              ...prev,
                                              [task.id]: { 
                                                ...prev[task.id], 
                                                assignee: e.target.value 
                                              }
                                            }));
                                          }}
                                        >
                                          {staff.map(person => (
                                            <option key={person.id} value={person.name}>
                                              {person.name === username ? '🫵 You' : '👤'} {person.name} ({person.department})
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      
                                      <div className="flex justify-between items-center">
                                        <button
                                          onClick={() => {
                                            setShowTaskAssignment(prev => ({ ...prev, [task.id]: false }));
                                            setTaskAssignmentData(prev => ({ ...prev, [task.id]: null }));
                                          }}
                                          className="px-4 py-2 text-sm text-purple-700 hover:text-purple-900 border-2 border-purple-300 rounded-lg hover:bg-purple-50 transition-colors font-medium"
                                        >
                                          ❌ Cancel
                                        </button>
                                        <button
                                          onClick={() => handleConfirmTaskCreation(task.id)}
                                          className="px-6 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-bold transition-all shadow-lg border-2 border-purple-500"
                                        >
                                          ✨ Create Task
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
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
          <PlantHistoryModal />
        </div>
      </div>
    );
  };
