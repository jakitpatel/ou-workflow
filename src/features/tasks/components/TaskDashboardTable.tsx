import { plantHistory } from '@/features/tasks/model/plantHistory';

import { TaskRow } from './TaskRow';

type TaskDashboardTableProps = {
  filteredTasks: Array<Parameters<typeof TaskRow>[0]['application']>;
  handleApplicationTaskAction: Parameters<typeof TaskRow>[0]['handleApplicationTaskAction'];
  handleShowPlantHistory: Parameters<typeof TaskRow>[0]['handleShowPlantHistory'];
};

export function TaskDashboardTable({
  filteredTasks,
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
      </div>
    </div>
  );
}
