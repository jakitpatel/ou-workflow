import React, { memo } from 'react';
import { getStatusConfig, getPriorityBorderClass } from '@/features/tasks/lib/taskDashboardPresentation';
import type { ApplicationTask } from '@/types/application';
import { useNavigate } from '@tanstack/react-router';
import { Route as DashboardRoute } from '@/routes/_authed/ou-workflow/ncrc-dashboard';
import { COMPLETED_STATUSES } from '@/lib/utils/taskHelpers';

interface PlantInfo {
  applications?: number;
}

interface TaskRowProps {
  application: ApplicationTask;
  plantInfo?: PlantInfo;
  handleShowPlantHistory: (plantName: string) => void;
  handleApplicationTaskAction: (
    e: React.MouseEvent<HTMLElement>,
    application: ApplicationTask
  ) => void;
  /** Opens the Application Details drawer; without it the plant name opens the full page. */
  onOpenApplicationDetails?: (applicationId: string | number) => void;
}

const PlantNameButton = memo(
  ({
    plantName,
    applicationCount,
    onClick,
  }: {
    plantName: string;
    applicationCount: number;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="text-left group rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      title={`Click to view details for ${plantName}`}
      aria-label={
        applicationCount > 0
          ? `View details for ${plantName} - ${applicationCount} ${applicationCount === 1 ? 'application' : 'applications'}`
          : `View details for ${plantName}`
      }
    >
      <div className="text-base font-bold text-gray-900 transition-colors group-hover:text-blue-600">
        {plantName}
      </div>
      {/*
      <div className="text-xs text-gray-500 mt-0.5">
        {applicationCount} {applicationCount === 1 ? 'application' : 'applications'}
      </div>
      */}
    </button>
  )
);

PlantNameButton.displayName = 'PlantNameButton';

type ActionButtonProps = {
  taskName: string;
  taskDescription?: string | null;
  status?: string | null;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const ActionButton = memo(
  ({ taskName, taskDescription, status, onClick }: ActionButtonProps) => {
    const isCompleted = COMPLETED_STATUSES.includes(status?.toLowerCase() ?? '');

    if (isCompleted) {
      return (
        <span
          className="cursor-not-allowed text-sm font-medium text-gray-500"
          title="Task already completed"
        >
          {taskName}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        title={taskDescription || 'No description available'}
        aria-label={`Execute task: ${taskName}`}
        className="
          inline-flex items-center justify-center
          rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white
          shadow-sm transition-all hover:bg-blue-700 hover:shadow-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        "
      >
        {taskName}
      </button>
    );
  }
);

ActionButton.displayName = 'ActionButton';

const StatusBadge = memo(
  ({ status, daysActive }: { status: string; daysActive?: number }) => {
    const statusConfig = getStatusConfig(status, daysActive);
    const StatusIcon = statusConfig.icon;

    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${statusConfig.color}`}
        role="status"
        aria-label={`Status: ${statusConfig.label}`}
      >
        <StatusIcon className="mr-1.5 h-3 w-3" aria-hidden="true" />
        {statusConfig.label}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

function formatDateOnly(date?: string | null) {
  if (!date) return null;

  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getTaskRowDisplayName(application: ApplicationTask): string {
  const name = [application.plantName, application.companyName].find(
    (value) => typeof value === 'string' && value.trim() !== ''
  );
  if (name) return name.trim();
  return application.applicationId ? `Application ${application.applicationId}` : 'Unnamed application';
}

export const TaskRow = memo(
  ({
    application,
    plantInfo,
    handleApplicationTaskAction,
    onOpenApplicationDetails,
  }: TaskRowProps) => {
    const navigate = useNavigate();
    const applicationCount = plantInfo?.applications ?? 0;
    const daysPending = application?.daysPending ?? 0;
    const daysOverdue = application?.daysOverdue ?? 0;

    const handleTaskApplicationClick = () => {
      if (!application.applicationId) {
        return;
      }

      if (onOpenApplicationDetails) {
        onOpenApplicationDetails(application.applicationId);
        return;
      }

      const detailFlag = true;

      if (detailFlag) {
        navigate({
          to: `${DashboardRoute.to}/${application.applicationId}`,
        });
      } else {
        navigate({
          to: DashboardRoute.to,
          search: (prev) => ({
            q: prev.q ?? '',
            status: prev.status ?? 'all',
            priority: prev.priority ?? 'all',
            applicationId: Number(application.applicationId),
            page: 0,
            myOnly: prev.myOnly ?? true,
          }),
        });
      }
    };

    const handleActionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      handleApplicationTaskAction(e, application);
    };

    function isValidAssignee(value?: string | null) {
      return (
        typeof value === 'string' &&
        value.trim() !== '' &&
        value.toUpperCase() !== 'NULL'
      );
    }

    return (
      <tr
        className={`hover:bg-gray-50 transition-colors ${getPriorityBorderClass(application.priority)}`}
        data-task-id={application.taskInstanceId}
      >
        <td className="px-6 py-4 align-top">
          <div>
            <PlantNameButton
              plantName={getTaskRowDisplayName(application)}
              applicationCount={applicationCount}
              onClick={handleTaskApplicationClick}
            />

          </div>
        </td>

        <td className="px-6 py-4 align-top text-sm tabular-nums text-gray-700">
          {daysPending > 0 ? daysPending : <span className="text-gray-400">-</span>}
        </td>

        <td className="px-6 py-4 align-top text-sm tabular-nums">
          {daysOverdue > 0 ? (
            <span className="font-medium text-red-600">{daysOverdue}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>

        <td className="px-6 py-4 align-top text-sm text-gray-700 tabular-nums">
          {application.applicationId ?? <span className="text-gray-400">-</span>}
        </td>

        <td className="px-6 py-4 align-top">
          <ActionButton
            taskName={application.taskName}
            taskDescription={application.taskDescription}
            onClick={handleActionClick}
            status={application.status}
          />
        </td>

        <td className="px-6 py-4 align-top">
          <div className="text-sm font-medium text-gray-900">
            {application.assigneeRole || (
              <span className="italic text-gray-400">Not assigned</span>
            )}
          </div>
        </td>

        <td className="px-6 py-4 align-top">
          <div className="text-sm font-medium text-gray-900">
            {isValidAssignee(application.assignee) ? (
              application.assignee
            ) : (
              <span className="italic text-gray-400">Group</span>
            )}
          </div>
        </td>

        <td className="px-6 py-4 align-top">
          <div className="text-sm text-gray-900">
            {application.stageName || <span className="italic text-gray-400">No stage</span>}
          </div>
        </td>

        <td className="px-6 py-4 align-top">
          <div className="space-y-1">
            <StatusBadge
              status={application.status}
              daysActive={application.daysActive}
            />

            {(application.startedDate || application.completedDate) && (
              <div className="space-y-0.5 text-xs leading-tight text-gray-500">
                {application.startedDate && (
                  <div>
                    Started: {formatDateOnly(application.startedDate)}
                  </div>
                )}

                {COMPLETED_STATUSES.includes(application.status?.toLowerCase() ?? '') && (
                  <>
                    {application.completedDate && (
                      <div>
                        Completed: {formatDateOnly(application.completedDate)}
                      </div>
                    )}

                    {typeof application.completedCapacity === 'string' && (
                      <div>
                        Capacity:{' '}
                        <span className="font-medium text-gray-700">
                          {application.completedCapacity}
                        </span>
                      </div>
                    )}

                    {typeof application.completedBy === 'string' && (
                      <div>
                        Completed By:{' '}
                        <span className="font-medium text-gray-700">
                          {application.completedBy}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }
);

TaskRow.displayName = 'TaskRow';
