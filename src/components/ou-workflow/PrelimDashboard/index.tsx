import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchPrelimApplications } from '@/api';
import { CompanyCard } from '@/components/ou-workflow/PrelimDashboard/CompanyCard';
import { JsonModal } from '@/components/ou-workflow/PrelimDashboard/JsonModal';

export function PrelimDashboard() {
    const { data = [], isLoading } = useQuery({
        queryKey: ['prelim-applications'],
        queryFn: fetchPrelimApplications,

        // good defaults for static JSON
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
    });

  const [selected, setSelected] = useState<any | null>(null);

  if (isLoading) return <p>Loading…</p>;
  console.log('Dashboard data:', data);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Preliminary Applications</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.isArray(data) && data.length > 0 ? (
        data.map((app: any) => (
            <CompanyCard
            key={app.PreliminaryApplicationID}
            company={app.company}
            onClick={() => {
            console.log('Selected app:', app);
            setSelected(app);
            }}
            />
        ))
        ) : (
        <p className="text-gray-500">No applications found</p>
        )}
      </div>
      {selected && (
        <JsonModal
            open={true}
            data={selected}
            onClose={() => setSelected(null)}
        />
        )}
    </div>
  );
}
