import React, { memo } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { getStatusConfig, getPriorityBorderClass } from './taskHelpers';
import type { ApplicationTask } from '@/types/application';
import { useNavigate } from '@tanstack/react-router';
import { Route as DashboardRoute } from '@/routes/ou-workflow/ncrc-dashboard';

// Types
interface PlantInfo {
  applications?: number;
}

interface TaskRowProps {
  application: ApplicationTask;
  plantInfo?: PlantInfo;
  handleShowPlantHistory: (plantName: string) => void;
  handleApplicationTaskAction: (e: React.MouseEvent, application: ApplicationTask) => void;
}

// Helper Components
const TimeElapsedBadge = memo(({ days, isOverdue }: { days: number; isOverdue?: boolean }) => {
  if (days <= 0) return null;

  const Icon = isOverdue ? AlertCircle : Clock;
  const textColor = isOverdue ? 'text-red-600' : 'text-gray-700';
  const label = isOverdue ? 'days overdue' : 'days elapsed';

  return (
    <div className={`flex items-center ${isOverdue ? 'mr-0' : 'mr-3'}`}>
      <Icon className="w-4 h-4 opacity-60 group-hover:opacity-100" aria-hidden="true" />
      <span className={`ml-1 font-medium ${textColor}`}>
        {days} {label}
      </span>
    </div>
  );
});

TimeElapsedBadge.displayName = 'TimeElapsedBadge';

const PlantNameButton = memo(({ 
  plantName, 
  applicationCount, 
  onClick 
}: { 
  plantName: string; 
  applicationCount: number; 
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
    aria-label={`View ${plantName} history - ${applicationCount} applications`}
  >
    <div className="text-base font-bold group-hover:text-blue-600 transition-colors text-gray-900">
      {plantName}
    </div>
    {/*
    <div className="text-xs text-gray-500 mt-0.5">
      {applicationCount} {applicationCount === 1 ? 'application' : 'applications'}
    </div>
    */}
  </button>
));

PlantNameButton.displayName = 'PlantNameButton';

const COMPLETED_STATUSES = ['complete', 'done', 'completed'];

type ActionButtonProps = {
  taskName: string;
  taskDescription?: string | null;
  status?: string | null;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const ActionButton = memo(
  ({ taskName, taskDescription, status, onClick }: ActionButtonProps) => {
    const isCompleted = COMPLETED_STATUSES.includes(
      status?.toLowerCase() ?? ''
    );

    // ✅ Completed → plain text
    if (isCompleted) {
      return (
        <span
          className="text-sm font-medium text-gray-500 cursor-not-allowed"
          title="Task already completed"
        >
          {taskName}
        </span>
      );
    }

    // ✅ Active → button
    return (
      <button
        type="button"
        onClick={onClick}
        title={taskDescription || 'No description available'}
        aria-label={`Execute task: ${taskName}`}
        className="
          inline-flex items-center justify-center
          px-4 py-2 text-sm font-medium text-white
          rounded-lg bg-blue-600 hover:bg-blue-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-all shadow-sm hover:shadow-md
        "
      >
        {taskName}
      </button>
    );
  }
);

ActionButton.displayName = 'ActionButton';

const StatusBadge = memo(({ 
  status, 
  daysActive 
}: { 
  status: string; 
  daysActive?: number;
}) => {
  const statusConfig = getStatusConfig(status, daysActive);
  const StatusIcon = statusConfig.icon;

  return (
    <span 
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}
      role="status"
      aria-label={`Status: ${statusConfig.label}`}
    >
      <StatusIcon className="w-3 h-3 mr-1.5" aria-hidden="true" />
      {statusConfig.label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Utility Functions
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

// Main Component
export const TaskRow = memo(({
  application,
  plantInfo,
  handleApplicationTaskAction,
}: TaskRowProps) => {
  const navigate = useNavigate();
  //const dashboardSearch = DashboardRoute.useSearch();
  const applicationCount = plantInfo?.applications ?? 0;
  const daysPending = application?.daysPending ?? 0;
  const daysOverdue = application?.daysOverdue ?? 0;
  const hasDaysInfo = daysPending > 0 || daysOverdue > 0;

  const handleTaskApplicationClick = () => {
    if (!application.applicationId) {
      return;
    }
    let detailFlag = true;
    if (detailFlag) {
      navigate({
        to: `${DashboardRoute.to}/${application.applicationId}`,
      });
    } else{
      navigate({
        to: DashboardRoute.to,
        search: (prev) => ({
          q: prev.q ?? '',
          status: prev.status ?? 'all',
          priority: prev.priority ?? 'all',
          applicationId: Number(application.applicationId),
          page: 0,
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
      {/* Task & Plant Column */}
      <td className="px-6 py-4 align-top">
        <div className="space-y-2">
          {/* Plant Name */}
          <PlantNameButton
            plantName={application.plantName}
            applicationCount={applicationCount}
            onClick={handleTaskApplicationClick}
          />

          {/* Time Information */}
          {hasDaysInfo && (
            <div className="flex items-center flex-wrap gap-2 text-sm">
              <TimeElapsedBadge days={daysPending} />
              <TimeElapsedBadge days={daysOverdue} isOverdue />
            </div>
          )}
        </div>
      </td>

      {/* Actions Column */}
      <td className="px-6 py-4 align-top">
        <ActionButton
          taskName={application.taskName}
          taskDescription={application.taskDescription}
          onClick={handleActionClick}
          status={application.status}
        />
      </td>

      {/* Role Column */}
      <td className="px-6 py-4 align-top">
        <div className="text-sm text-gray-900 font-medium">
          {application.assigneeRole || (
            <span className="text-gray-400 italic">Not assigned</span>
          )}
        </div>
      </td>
      {/* Assignee Column */}
      <td className="px-6 py-4 align-top">
        <div className="text-sm text-gray-900 font-medium">
          {isValidAssignee(application.assignee) ? (
            application.assignee
          ) : (
            <span className="text-gray-400 italic">Group</span>
          )}
        </div>
      </td>

      {/* Stage Column */}
      <td className="px-6 py-4 align-top">
        <div className="text-sm text-gray-900">
          {application.stageName || (
            <span className="text-gray-400 italic">No stage</span>
          )}
        </div>
      </td>

      {/* Status Column */}
      <td className="px-6 py-4 align-top">
        <div className="space-y-1">
          <StatusBadge
            status={application.status}
            daysActive={application.daysActive}
          />

          {/* Lifecycle Dates */}
          {(application.startedDate || application.completedDate) && (
            <div className="text-xs text-gray-500 leading-tight space-y-0.5">
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
                </>
              )}
            </div>
          )}
        </div>
      </td>

    </tr>
  );
});

TaskRow.displayName = 'TaskRow';