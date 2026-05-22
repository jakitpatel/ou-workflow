import { plantHistory } from '@/features/tasks/model/plantHistory';
import type { RefObject } from 'react';

import { TaskRow } from './TaskRow';

type TaskDashboardTableProps = {
  filteredTasks: Array<Parameters<typeof TaskRow>[0]['application']>;
  paginationMode: 'paged' | 'infinite';
  totalCount: number;
  hasNextPage: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
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
  handleApplicationTaskAction,
  handleShowPlantHistory,
}: TaskDashboardTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="relative max-h-[calc(100vh-20rem)] overflow-y-auto">
        <table className="min-w-full table-fixed">
          <thead className="sticky top-0 z-10 border-b bg-gray-50">
            <tr>
              <th className="w-[28%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Task & Plant
              </th>
              <th className="w-[16%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
              <th className="w-[12%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Role
              </th>
              <th className="w-[14%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Assignee
              </th>
              <th className="w-[15%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Stage
              </th>
              <th className="w-[15%] px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {filteredTasks.map((application) => (
              <TaskRow
                key={application.taskInstanceId}
                application={application}
                plantInfo={
                  plantHistory[String(application.plantId) as keyof typeof plantHistory] ||
                  undefined
                }
                handleApplicationTaskAction={handleApplicationTaskAction}
                handleShowPlantHistory={handleShowPlantHistory}
              />
            ))}
          </tbody>
        </table>

        {filteredTasks.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No tasks found.</div>
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
  );
}
