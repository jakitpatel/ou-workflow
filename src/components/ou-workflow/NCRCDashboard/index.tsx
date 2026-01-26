import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApplicantCard } from './ApplicantCard'
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import { Search } from 'lucide-react';
import { useUser } from '@/context/UserContext'
//import { useApplications } from '@/components/ou-workflow/hooks/useApplications';
import { useDebounce } from '@/components/ou-workflow/hooks/useDebounce';
import { useInfiniteApplications } from '@/components/ou-workflow/hooks/useInfiniteApplications';
import { usePagedApplications } from '@/components/ou-workflow/hooks/usePagedApplications';
import { assignTask, confirmTask } from '@/api';
import { ErrorDialog, type ErrorDialogRef } from "@/components/ErrorDialog";
import type { Applicant, Task } from '@/types/application';
import { ApplicantStatsCards } from './ApplicantStatsCards';
import { Route } from '@/routes/ou-workflow/ncrc-dashboard';

// 🎯 Constants
const PAGE_LIMIT = 5;
const DEBOUNCE_DELAY = 1000;
//const STORAGE_KEY = 'ncrc-infinite-state';

// 🎯 Task type definitions
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
const detectRole = (preScript?: string): string => {
  if (!preScript) return "OtherRole";
  const [, role] = preScript.split(",");
  return role?.trim().toUpperCase();
};

export function NCRCDashboard() {
  // 🔹 Router hooks
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { q, status, priority, page, applicationId } = search;

  // 🔹 User context
  const { token, username, paginationMode } = useUser();
  const queryClient = useQueryClient();
  const errorDialogRef = useRef<ErrorDialogRef>(null);
  // UI states
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<Task | null | boolean>(null);
  const [showConditionModal, setShowConditionModal] = useState<Task | null | boolean>(null);
  
  // 🔹 Infinite Scrolling States
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  // 🔹 Debounced search filters
  const debouncedSearch = useDebounce(q, DEBOUNCE_DELAY);

  // 🔹 Fetch applications
  /* ================================================================
   * DATA FETCHING
   * ================================================================ */
  const pagedQuery = usePagedApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    priorityFilter: priority,
    applicationId,
    page,
    limit: PAGE_LIMIT,
    enabled: paginationMode === 'paged',
  });

  const infiniteQuery = useInfiniteApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    priorityFilter: priority,
    applicationId,
    enabled: paginationMode === 'infinite',
  });

  const isLoading =
    paginationMode === 'paged'
      ? pagedQuery.isLoading
      : infiniteQuery.isLoading;

  const isError =
    paginationMode === 'paged'
      ? pagedQuery.isError
      : infiniteQuery.isError;

  const error =
    paginationMode === 'paged'
      ? pagedQuery.error
      : infiniteQuery.error;
      
  // 🔹 Update search params helper
  const updateSearch = (updates: Partial<typeof search>) => {
    navigate({
      search: (prev) => {
        const next = { ...prev, ...updates };
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      },
    });
  };

  // 🔹 Get applicants based on mode
  const applicants: Applicant[] =
    paginationMode === 'paged'
      ? pagedQuery.data?.data ?? []
      : infiniteQuery.data?.pages.flatMap(p => p.data) ?? [];

  const totalCount =
    paginationMode === 'paged'
      ? pagedQuery.data?.meta?.total_count ?? 0
      : infiniteQuery.data?.pages?.[0]?.meta?.total_count ?? 0;

  const totalPages = Math.ceil(totalCount / PAGE_LIMIT);

  // 🔹 Pagination handlers
  const handleFirst = () => updateSearch({ page: 0 })
  const handlePrev = () => updateSearch({ page: Math.max(page - PAGE_LIMIT, 0) });
  const handleNext = () => updateSearch({ page: (page + PAGE_LIMIT < totalCount ? page + PAGE_LIMIT : page) });
  const handleLast = () => updateSearch({ page: (totalPages - 1) * PAGE_LIMIT });

  // ✅ Restore scroll position ONLY for paged mode
  useEffect(() => {
    if (paginationMode !== 'paged') return;

    const savedScroll = sessionStorage.getItem('ncrc-paged-scroll');
    if (!savedScroll) return;

    requestAnimationFrame(() => {
      window.scrollTo(0, Number(savedScroll));
      sessionStorage.removeItem('ncrc-paged-scroll');
    });
  }, [paginationMode]);

  // Restore scroll position on mount for Infinite mode
  useEffect(() => {
    if (paginationMode !== 'infinite') return;
    if (!infiniteQuery.data) return;

    const raw = sessionStorage.getItem('ncrc-infinite-scroll');
    if (!raw) return;

    const { scrollY, anchorId } = JSON.parse(raw);

    // Wait for DOM + cards to render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (anchorId) {
          const el = document.querySelector(
            `[data-app-id="${anchorId}"]`
          ) as HTMLElement | null;

          if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'auto' });
          } else {
            window.scrollTo(0, scrollY ?? 0);
          }
        } else {
          window.scrollTo(0, scrollY ?? 0);
        }

        sessionStorage.removeItem('ncrc-infinite-scroll');
      });
    });
  }, [paginationMode, infiniteQuery.data]);


  /* ================================================================
   * INTERSECTION OBSERVER (INFINITE ONLY)
   * ================================================================ */
  useEffect(() => {
    if (paginationMode !== 'infinite') return;
    if (!sentinelRef.current) return;
    if (!infiniteQuery.hasNextPage) return;

    const observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          infiniteQuery.hasNextPage &&
          !infiniteQuery.isFetchingNextPage
        ) {
          infiniteQuery.fetchNextPage();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [
    paginationMode,
    infiniteQuery.hasNextPage,
    infiniteQuery.fetchNextPage,
    infiniteQuery.isFetchingNextPage
  ]);

  // ==============================
  // 🔹 RESET PAGE ON MODE SWITCH
  // ==============================
  
  useEffect(() => {
    if (paginationMode === 'paged' && page !== 0) {
      updateSearch({ page: 0 });
    }
  }, [paginationMode]);

  // ==============================
  // 🔹 CALCULATE STATS
  // ==============================
  
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

  // ==============================
  // 🔹 MUTATIONS
  // ==============================
  
  const confirmTaskMutation = useMutation({
    mutationFn: confirmTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'paged'] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'infinite'] });
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
      queryClient.invalidateQueries({ queryKey: ['applications', 'paged'] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'infinite'] });
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

  // ==============================
  // 🔹 EXECUTE ACTION
  // ==============================
  
  const executeAction = (assignee: string, action: any, result?: string) => {
    const taskType = action.taskType?.toLowerCase();
    const taskCategory = action.taskCategory?.toLowerCase();
    const taskId = action.TaskInstanceId;
    console.log("capacity:", action);
    const baseParams = {
      taskId,
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: action.capacity ?? undefined,
    };

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
        const role = detectRole(selectedAction?.action?.PreScript ?? "");

        assignTaskMutation.mutate({
          appId,
          taskId,
          role,
          assignee,
          token: token ?? undefined,
          capacity: action.capacity ?? undefined
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

  // ==============================
  // 🔹 SELECTED ACTION
  // ==============================
  
  const selectedAction = useMemo(() => {
    if (!selectedActionId) return null;

    const [appId, actId] = selectedActionId.split(":");
    const app = applicants.find(a => String(a.applicationId) === String(appId));
    
    if (!app) return null;

    const actions = getAllTasks(app);
    const act = actions.find(a => String(a.TaskInstanceId) === String(actId));

    if (!act) return null;

    return { application: app, action: act };
  }, [selectedActionId, applicants]);

  // ==============================
  // 🔹 HANDLE ACTION SELECTION
  // ==============================
  
  const handleSelectAppActions = (applicationId: string | number, actionId: string | number) => {
    setSelectedActionId(`${applicationId}:${actionId}`);
  };

  const handleTaskAction = (e: React.MouseEvent, application: Applicant, action: Task) => {
    e.stopPropagation();
    e.preventDefault();
    
    handleSelectAppActions(application.applicationId, action.TaskInstanceId);

    const actionType = action.taskType?.toLowerCase();
    const actionCategory = action.taskCategory?.toLowerCase();

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
    <>
      {/* Main Content - Single browser scroll, navigation accounts for fixed nav height */}
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          {/* Sticky Header Section - Sticks below fixed nav */}
          <div className="sticky top-16 z-20 bg-gray-50 pb-4">
            {/* Header */}
            <div className="pt-6 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">Application Dashboard</h2>
              <p className="text-gray-600">Executive Overview - Certification Management</p>
            </div>

            {/* Stats Cards - Sticky */}
            <div className="pb-4">
              <ApplicantStatsCards stats={applicantStats} />
            </div>

            {/* Filters - Sticky */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-4">

                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by company, plant, region..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={q}
                      onChange={(e) => updateSearch({ q: e.target.value, page: 0 })}
                    />
                  </div>
                </div>

                {/* Status */}
                <select
                  value={status}
                  onChange={(e) => updateSearch({ status: e.target.value, page: 0 })}
                  className="px-4 py-2 border border-gray-300 rounded-lg
                            focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            min-w-[140px]"
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

                {/* Priority */}
                <select
                  value={priority}
                  onChange={(e) => updateSearch({ priority: e.target.value, page: 0 })}
                  className="px-4 py-2 border border-gray-300 rounded-lg
                            focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            min-w-[120px]"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* All Apps | My Apps segmented control */}
                <div className="ml-auto flex items-center border-gray-200">
                  <div
                    className="inline-flex rounded-lg border border-gray-300 overflow-hidden"
                    role="group"
                    aria-label="Application visibility filter"
                  >
                    {/* All Apps */}
                    <button
                      type="button"
                      onClick={() =>
                        updateSearch({
                          myOnly: undefined,
                          page: 0,
                        })
                      }
                      aria-pressed={!search.myOnly}
                      className={[
                        'px-3 py-1.5 text-sm font-medium transition-colors',
                        !search.myOnly
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                      ].join(' ')}
                      title="Show all applications"
                    >
                      All Apps
                    </button>

                    {/* My Apps */}
                    <button
                      type="button"
                      onClick={() =>
                        updateSearch({
                          myOnly: true,
                          page: 0,
                        })
                      }
                      aria-pressed={Boolean(search.myOnly)}
                      className={[
                        'px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300',
                        search.myOnly
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                      ].join(' ')}
                      title="Show only applications assigned to me"
                    >
                      My Apps
                    </button>
                  </div>
                </div>

              </div>
            </div>


            {/* Loading/Error States */}
            {isLoading && paginationMode === 'paged' && (
              <div className="text-gray-500 mb-4">Loading applicants...</div>
            )}
            {isError && (
              <div className="text-center py-4 mb-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-red-600 font-semibold">Error loading applications</div>
                <div className="text-gray-600 mt-2">{(error as Error).message}</div>
              </div>
            )}

            {/* Pagination Controls - Sticky */}
            {paginationMode === 'paged' && !isError && (
              <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
                <div className="text-gray-600 text-sm">
                  Showing {page + 1}–{Math.min(page + PAGE_LIMIT, totalCount)} of {totalCount} applications
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleFirst}
                    disabled={page === 0}
                    className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    First
                  </button>
                  <button
                    onClick={handlePrev}
                    disabled={page === 0}
                    className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Prev
                  </button>
                  <span className="text-sm font-medium px-3 py-1.5 bg-gray-50 rounded-md">
                    Page {Math.floor(page / PAGE_LIMIT) + 1} of {totalPages}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={page + PAGE_LIMIT >= totalCount}
                    className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Next
                  </button>
                  <button
                    onClick={handleLast}
                    disabled={page + PAGE_LIMIT >= totalCount}
                    className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Applications List - Regular Flow (uses browser scroll) */}
          <div className="pb-8">
            {/* Initial Loading for Infinite Mode */}
            {paginationMode === 'infinite' && infiniteQuery.isLoading && !infiniteQuery.data && (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="text-gray-500 mt-4">Loading applications...</p>
              </div>
            )}

            {/* Applicants List */}
            {!isError && (
              <div className="space-y-4">
                {applicants.length > 0 ? (
                  applicants.map((applicant: Applicant) => (
                    <ApplicantCard
                      key={`${applicant.applicationId}-${paginationMode}`}
                      applicant={applicant}
                      handleTaskAction={handleTaskAction}
                    />
                  ))
                ) : (
                  !isLoading && (
                    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                      <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-900 text-lg font-medium mb-2">No applications found</p>
                        <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Infinite Scroll States */}
            {paginationMode === 'infinite' && !isError && (
              <>
                {/* Sentinel for triggering next page */}
                {infiniteQuery.hasNextPage && (
                  <div ref={sentinelRef} className="h-1" />
                )}

                {/* Loading next page */}
                {infiniteQuery.isFetchingNextPage && (
                  <div className="text-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-blue-500 border-r-transparent"></div>
                    <p className="text-gray-500 mt-2 text-sm">Loading more applications...</p>
                  </div>
                )}

                {/* End of list */}
                {!infiniteQuery.hasNextPage && applicants.length > 0 && !infiniteQuery.isFetchingNextPage && (
                  <div className="text-center py-8 mt-6">
                    <div className="inline-block px-4 py-2 bg-gray-100 rounded-full">
                      <p className="text-gray-600 text-sm font-medium">
                        All {applicants.length} applications loaded
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
    </>
  );
}