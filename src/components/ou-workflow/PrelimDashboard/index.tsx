import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react';
import { fetchPrelimApplicationDetails } from '@/api'
import { CompanyCard } from '@/components/ou-workflow/PrelimDashboard/CompanyCard'
import { JsonModal } from '@/components/ou-workflow/PrelimDashboard/JsonModal'
import { Route } from '@/routes/ou-workflow/prelim-dashboard';
import { usePrelimApplications } from '@/components/ou-workflow/hooks/usePrelimApplications';
import { useDebounce } from '@/components/ou-workflow/hooks/useDebounce';
import { PrelimApplicantStatsCards } from './PrelimApplicantStatsCards';
import { useUser } from '@/context/UserContext';
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal';
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal';
import type { Task } from '@/types/application';
import type { ErrorDialogRef } from '@/components/ErrorDialog';
import { TASK_TYPES, TASK_CATEGORIES } from '@/lib/constants/task';
import { useTaskActions } from '@/components/ou-workflow/hooks/useTaskActions';

const PAGE_LIMIT = 20;
const DEBOUNCE_DELAY = 300; // milliseconds

export function PrelimDashboard() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  
  // 🔹 Separate states for different purposes
  const [expandedTaskPanel, setExpandedTaskPanel] = useState<string | null>(null); // For task panel
  const [selectedId, setSelectedId] = useState<number | null>(null) // For JSON modal
  const errorDialogRef = useRef<ErrorDialogRef>(null);
  // UI states
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState<Task | null | boolean>(null);
  const [showConditionModal, setShowConditionModal] = useState<Task | null | boolean>(null);

  const { q, status, page } = search;
  const { token, username } = useUser();
  
  // 🔹 Debounced search filters
  const debouncedSearch = useDebounce(q, DEBOUNCE_DELAY);

  // 🔹 Fetch applications
  const { data:response, isLoading } = usePrelimApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    page,
    limit: PAGE_LIMIT,
    enabled: true,
  });
  console.log("Prelim applications response:", response);
  // ✅ Extract the actual data array
  const data = response?.data ?? [];

  //const totalCount = response?.meta?.total_count ?? 0;
  //const totalPages = Math.ceil(totalCount / PAGE_LIMIT);

  console.log("Prelim applications data:", data);

  // 🔹 Fetch details ONLY when an app is selected for JSON modal
  const {
    data: applicationDetails,
    isLoading: isDetailsLoading,
    error,
  } = useQuery({
    queryKey: ['prelim-application-details', selectedId],
    queryFn: () =>
      fetchPrelimApplicationDetails(selectedId as number, token ?? undefined),
    enabled: !!selectedId,
    select: (data: any[]) => data?.[0] ?? null,
  })

  // 🔹 Update search params helper
  const updateSearch = (updates: Partial<typeof search>) => {
    navigate({
      search: (prev) => {
        const next = { ...prev, ...updates };
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      },
    });
  };

  // 🔹 Calculate stats
  const applicantStats = useMemo(() => {
    const normalizedApplicants = data.map(app => ({
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
  }, [data]);

  // 🔹 Handle task panel expansion (button click)
  /*const handlePrelimExpandClick = (id: number) => {
    const idStr = String(id);
    setExpandedTaskPanel(expandedTaskPanel === idStr ? null : idStr)
  }*/

  // 🔹 Handle card click (for JSON modal)
  const handleViewApplicationClick = (id: number) => {
    console.log('View Application clicked for ID:', id)
    setSelectedId(id)
  }
  
  // ==============================
  // 🔹 EXECUTE ACTION
  // ==============================
  
  const { executeAction, getSelectedAction } = useTaskActions({
    applications: data,
    token: token ?? undefined,
    username: username ?? undefined,
    onError: (msg) => errorDialogRef.current?.open(msg),
  });

  // ==============================
  // 🔹 SELECTED ACTION
  // ==============================
  const selectedAction = getSelectedAction(selectedActionId);
  
  // ==============================
  // 🔹 HANDLE ACTION SELECTION
  // ==============================
  
  const handleSelectAppActions = (applicationId: string | number, actionId: string | number) => {
    setSelectedActionId(`${applicationId}:${actionId}`);
  };

  // 🔹 Handle task action (optional - implement based on your needs)
  const handleTaskAction = (e: React.MouseEvent, application: any, action: Task) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Task action clicked:', { application, action })
    // Implement your task action logic here
    handleSelectAppActions(application.applicationId, action.TaskInstanceId);

    const actionType = action.taskType?.toLowerCase();
    const actionCategory = action.taskCategory?.toLowerCase();

    if (actionType === TASK_TYPES.CONFIRM && actionCategory === TASK_CATEGORIES.CONFIRMATION) {
      executeAction("Confirmed", action, "yes", selectedAction);
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
  }

  if (isLoading) return <p>Loading…</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Application Intake
      </h1>
      
      {/* Stats Cards */}
      <div className="pb-4">
        <PrelimApplicantStatsCards stats={applicantStats} />
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4">
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
                value={q || ''}
                onChange={(e) => updateSearch({ q: e.target.value, page: 0 })}
              />
            </div>
          </div>

          {/* Status */}
          <select
            value={status || 'all'}
            onChange={(e) => updateSearch({ status: e.target.value, page: 0 })}
            className="px-4 py-2 border border-gray-300 rounded-lg
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      min-w-[140px]"
          >
            <option value="all">All Statuses</option>
            <option value="COMPL">DONE</option>
            <option value="INP">In Progress</option>
            <option value="NEW">New</option>
            <option value="WTH">Withdrawn</option>
          </select>
        </div>
      </div>
      
      {/* Company Cards */}
      <div className="flex flex-col gap-4">
        {data.length > 0 ? (
          data.map((app: any) => (
            <CompanyCard
              key={app.applicationId}
              company={app}
              //isExpanded={selectedId === app.applicationId}
              expanded={expandedTaskPanel === String(app.applicationId)}
              setExpanded={setExpandedTaskPanel}
              //onPrelimExpandClick={() => handlePrelimExpandClick(app.applicationId)}
              onViewApplication={() => handleViewApplicationClick(app.externalReferenceId)}
              handleTaskAction={handleTaskAction}
            />
          ))
        ) : (
          <p className="text-gray-500">
            No applications found
          </p>
        )}
      </div>

      {/* JSON Modal */}
      {selectedId && (
        <JsonModal
          open={true}
          data={applicationDetails}
          isLoading={isDetailsLoading}
          error={error}
          onClose={() => setSelectedId(null)}
        />
      )}

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
    </div>
  )
}
