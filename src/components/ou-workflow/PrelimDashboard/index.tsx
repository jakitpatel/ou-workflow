import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react';
import {
  fetchPrelimApplicationDetails,
} from '@/api'
import { CompanyCard } from '@/components/ou-workflow/PrelimDashboard/CompanyCard'
import { JsonModal } from '@/components/ou-workflow/PrelimDashboard/JsonModal'
import { Route } from '@/routes/ou-workflow/prelim-dashboard';
import { usePrelimApplications } from '@/components/ou-workflow/hooks/usePrelimApplications';
import { useDebounce } from '@/components/ou-workflow/hooks/useDebounce';
import { PrelimApplicantStatsCards } from './PrelimApplicantStatsCards';
import { useUser } from '@/context/UserContext';

const PAGE_LIMIT = 20;
const DEBOUNCE_DELAY = 300; // milliseconds

export function PrelimDashboard() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { q, status, page } = search;
  const { token } = useUser();
  // 🔹 Debounced search filters
  const debouncedSearch = useDebounce(q, DEBOUNCE_DELAY);

  // 🔹 Fetch applications
  /* ================================================================
    * DATA FETCHING
    * ================================================================ */
  const { data = [], isLoading } = usePrelimApplications({
    searchTerm: debouncedSearch,
    statusFilter: status,
    page,
    limit: PAGE_LIMIT,
    enabled: true,
  });

  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 🔹 Fetch details ONLY when an app is selected
  const {
    data: applicationDetails,
    isLoading: isDetailsLoading,
    error,
  } = useQuery({
    queryKey: ['prelim-application-details', selectedId],
    queryFn: () =>
      fetchPrelimApplicationDetails(selectedId as number, token ?? undefined),
    enabled: !!selectedId,
    // 🔑 unwrap array here
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

  // ==============================
    // 🔹 CALCULATE STATS
    // ==============================
    
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

  if (isLoading) return <p>Loading…</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Preliminary Applications
      </h1>
      {/* Stats Cards - Sticky */}
      <div className="pb-4">
        <PrelimApplicantStatsCards stats={applicantStats} />
      </div>
      {/* Filters - Sticky */}
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
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.isArray(data) && data.length > 0 ? (
          data.map((app: any) => (
            <CompanyCard
              key={app.JotFormId}
              company={app}
              onClick={() =>
                setSelectedId(app.JotFormId)
              }
            />
          ))
        ) : (
          <p className="text-gray-500">
            No applications found
          </p>
        )}
      </div>

      {selectedId && (
        <JsonModal
          open={true}
          data={applicationDetails}
          isLoading={isDetailsLoading}
          error={error}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
