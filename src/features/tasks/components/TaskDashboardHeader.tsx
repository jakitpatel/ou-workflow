import { TaskFilters } from './TaskFilters';
import { TaskStatsCards } from './TaskStatsCards';

const dayFilterOptions = ['pending', 7, 30] as const;

type TaskDashboardHeaderProps = {
  daysFilter: string | number;
  role: string | null | undefined;
  searchTerm: string;
  setDaysFilter: (value: string | number) => void;
  setSearchTerm: (value: string) => void;
  stats: Parameters<typeof TaskStatsCards>[0]['stats'];
  username: string | null | undefined;
};

export function TaskDashboardHeader({
  daysFilter,
  role,
  searchTerm,
  setDaysFilter,
  setSearchTerm,
  stats,
  username,
}: TaskDashboardHeaderProps) {
  return (
    <div className="sticky top-16 z-20 bg-gray-50 pb-4">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tasks & Notifications</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {username || 'User'} • Role: {role || 'Not assigned'}
        </p>
      </header>

      <div className="pb-4">
        <TaskStatsCards stats={stats} />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="flex-1">
          <TaskFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>

        <div className="shrink-0">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
            {dayFilterOptions.map((option, index) => (
              <button
                key={option}
                onClick={() => setDaysFilter(option)}
                className={[
                  'px-3 py-1.5 text-sm font-medium transition',
                  'border-r border-gray-300 last:border-r-0',
                  daysFilter === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100',
                  index === 0 && 'rounded-l-lg',
                  index === dayFilterOptions.length - 1 && 'rounded-r-lg',
                ].join(' ')}
              >
                {option === 'pending' ? 'Pending' : `${option} Days`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
