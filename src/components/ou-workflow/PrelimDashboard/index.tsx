import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  fetchPrelimApplications,
  fetchPrelimApplicationDetails,
} from '@/api'
import { CompanyCard } from '@/components/ou-workflow/PrelimDashboard/CompanyCard'
import { JsonModal } from '@/components/ou-workflow/PrelimDashboard/JsonModal'

export function PrelimDashboard() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['prelim-applications'],
    queryFn: fetchPrelimApplications,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 🔹 Fetch details ONLY when an app is selected
  const {
    data: applicationDetails,
    isLoading: isDetailsLoading,
    error,
  } = useQuery({
    queryKey: ['prelim-application-details', selectedId],
    queryFn: () =>
      fetchPrelimApplicationDetails(selectedId as number),
    enabled: !!selectedId,
    // 🔑 unwrap array here
    select: (data: any[]) => data?.[0] ?? null,
  })

  if (isLoading) return <p>Loading…</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Preliminary Applications
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.isArray(data) && data.length > 0 ? (
          data.map((app: any) => (
            <CompanyCard
              key={app.PreliminaryApplicationID}
              company={app}
              onClick={() =>
                setSelectedId(app.PreliminaryApplicationID)
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
