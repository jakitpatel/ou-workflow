import { plantHistory } from '@/features/tasks/model/plantHistory';
import { useState, type RefObject } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  nextDaysOverdueSort,
  sortByDaysOverdue,
  type DaysOverdueSort,
} from '@/features/tasks/lib/sortByDaysOverdue';
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer';

import { TaskRow } from './TaskRow';

type TaskDashboardTableProps = {
  filteredTasks: Array<Parameters<typeof TaskRow>[0]['application']>;
  paginationMode: 'paged' | 'infinite';
  totalCount: number;
  hasNextPage: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  /** No rows for the current view yet (first load, or after switching Pending / 7 / 30 Days). */
  isLoading?: boolean;
  /** The previous page is still shown while the next page loads. */
  isRefreshing?: boolean;
  handleApplicationTaskAction: Parameters<typeof TaskRow>[0]['handleApplicationTaskAction'];
  handleShowPlantHistory: Parameters<typeof TaskRow>[0]['handleShowPlantHistory'];
};

export function TaskDashboardTable({
  filteredTasks,
  paginationMode,
  totalCount,
  hasNextPage,
  sentinelRef,
  isFetchingNextPage,
  isLoading = false,
  isRefreshing = false,
  handleApplicationTaskAction,
  handleShowPlantHistory,
}: TaskDashboardTableProps) {
  // Clicking a plant name opens the Application Details drawer over the list (as on the
  // Application Dashboard) instead of leaving Tasks & Notifications for the full page.
  const [detailsApplicationId, setDetailsApplicationId] = useState<string | number | null>(null);
  // Sorts the rows already loaded (the current page, or everything loaded in infinite mode).
  const [daysOverdueSort, setDaysOverdueSort] = useState<DaysOverdueSort>('none');
  const visibleTasks = sortByDaysOverdue(filteredTasks, daysOverdueSort);
  const SortIcon =
    daysOverdueSort === 'desc' ? ArrowDown : daysOverdueSort === 'asc' ? ArrowUp : ArrowUpDown;

  // React keys must be unique. A response can repeat a task id (or lack one, mapped to 0), and
  // duplicate keys make React leave the previous view's rows in the table after the list changes
  // (e.g. 7 Days rows still showing under Pending). Repeats get a counter suffix.
  const keyCounts = new Map<string, number>();
  const rowKey = (task: TaskDashboardTableProps['filteredTasks'][number]) => {
    const id = String(task.taskInstanceId ?? '');
    const seen = keyCounts.get(id) ?? 0;
    keyCounts.set(id, seen + 1);
    return seen === 0 ? id : `${id}#${seen}`;
  };

  return (
    <>
    {/* Fills the space left under the page header and scrolls only the rows; the sticky
        column headings stay visible. Keeps at least 16rem on very short windows. */}
    <div className="mb-6 flex min-h-64 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="relative min-h-0 flex-1 overflow-y-auto" data-testid="tasks-table-scroll">
        {/* w-full (not just min-w-full) makes table-fixed honour the column widths, so long
            content wraps inside its column instead of widening the table past the screen. */}
        <table className="w-full table-fixed break-words">
          <thead className="sticky top-0 z-10 border-b bg-gray-50">
            <tr>
              <th className="w-[25%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Task & Plant
              </th>
              <th
                className="w-[7%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500"
                aria-sort={
                  daysOverdueSort === 'desc'
                    ? 'descending'
                    : daysOverdueSort === 'asc'
                      ? 'ascending'
                      : 'none'
                }
              >
                <button
                  type="button"
                  onClick={() => setDaysOverdueSort(nextDaysOverdueSort)}
                  className="inline-flex items-center gap-1 uppercase hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  title="Sort by days overdue"
                >
                  Days Overdue
                  <SortIcon
                    className={`h-3.5 w-3.5 shrink-0 ${daysOverdueSort === 'none' ? 'opacity-40' : 'text-blue-600'}`}
                    aria-hidden="true"
                  />
                </button>
              </th>
              <th className="w-[8%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                AppId
              </th>
              <th className="w-[14%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
              <th className="w-[10%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Role
              </th>
              <th className="w-[12%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Assignee
              </th>
              <th className="w-[12%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Stage
              </th>
              <th className="w-[12%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-gray-200 transition-opacity ${isRefreshing ? 'pointer-events-none opacity-50' : ''}`}
            aria-busy={isRefreshing || undefined}
          >
            {visibleTasks.map((application) => (
              <TaskRow
                key={rowKey(application)}
                application={application}
                plantInfo={
                  plantHistory[String(application.plantId) as keyof typeof plantHistory] ||
                  undefined
                }
                handleApplicationTaskAction={handleApplicationTaskAction}
                handleShowPlantHistory={handleShowPlantHistory}
                onOpenApplicationDetails={setDetailsApplicationId}
              />
            ))}
          </tbody>
        </table>

        {isLoading ? (
          <div className="py-12 text-center" role="status">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        ) : (
          filteredTasks.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">No tasks found.</div>
          )
        )}
      </div>

      {paginationMode === 'infinite' && totalCount > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 text-center">
          {hasNextPage ? (
            <>
              <div ref={sentinelRef} className="h-1" />
              <p className="text-sm text-gray-500">
                {isFetchingNextPage
                  ? 'Loading more tasks...'
                  : `Showing ${filteredTasks.length} of ${totalCount} tasks`}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-600">
              All {filteredTasks.length} tasks loaded
            </p>
          )}
        </div>
      )}
    </div>

    <ApplicationDetailsDrawer
      open={detailsApplicationId !== null}
      applicationId={detailsApplicationId ?? undefined}
      onClose={() => setDetailsApplicationId(null)}
    />
    </>
  );
}
