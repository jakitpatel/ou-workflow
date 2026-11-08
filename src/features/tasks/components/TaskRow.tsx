import React, { memo, useId } from 'react';
import { ArrowUpRight, Info, PanelRightOpen } from 'lucide-react';
import { getStatusConfig, getPriorityBorderClass } from '@/features/tasks/lib/taskDashboardPresentation';
import type { ApplicationTask } from '@/types/application';
import { useNavigate } from '@tanstack/react-router';
import { Route as DashboardRoute } from '@/routes/_authed/ou-workflow/ncrc-dashboard';
import { COMPLETED_STATUSES } from '@/lib/utils/taskHelpers';
import {
  getTaskDetailsTarget,
  isIntakeStage,
  toLinkableApplicationId,
  type TaskDetailsTarget,
} from '@/features/tasks/model/applicationIdLink';

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
  /**
   * Opens the details drawer for the row: Intake details (by externalReferenceId) for Intake-stage
   * tasks, otherwise Application Details (by applicationId). Without it the plant name opens the
   * full application page.
   */
  onOpenApplicationDetails?: (target: TaskDetailsTarget) => void;
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
      className="group cursor-pointer text-left rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      title={`Click to view details for ${plantName}`}
      aria-label={
        applicationCount > 0
          ? `View details for ${plantName} - ${applicationCount} ${applicationCount === 1 ? 'application' : 'applications'}`
          : `View details for ${plantName}`
      }
    >
      {/* Link styling (blue, underlined, drawer icon) so it reads as clickable, like the AppId chip. */}
      <span className="inline-flex items-start gap-1.5 text-base font-bold text-blue-700 underline decoration-blue-200 decoration-2 underline-offset-4 transition-colors group-hover:text-blue-900 group-hover:decoration-blue-500">
        <span>{plantName}</span>
        <PanelRightOpen
          className="mt-1 h-4 w-4 shrink-0 text-blue-400 transition-colors group-hover:text-blue-700"
          aria-hidden="true"
        />
      </span>
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

type StatusDetail = { label: string; value: string };

/** The status cell's detail lines (shown on hover/focus of the status badge). */
export function getStatusDetails(application: ApplicationTask): StatusDetail[] {
  const details: StatusDetail[] = [];
  const started = formatDateOnly(application.startedDate);
  if (started) details.push({ label: 'Started', value: started });

  if (COMPLETED_STATUSES.includes(application.status?.toLowerCase() ?? '')) {
    const completed = formatDateOnly(application.completedDate);
    if (completed) details.push({ label: 'Completed', value: completed });
    if (typeof application.completedCapacity === 'string') {
      details.push({ label: 'Capacity', value: application.completedCapacity });
    }
    if (typeof application.completedBy === 'string') {
      details.push({ label: 'Completed By', value: application.completedBy });
    }
  }
  return details;
}

function StatusBadgeWithDetails({
  status,
  daysActive,
  details,
}: {
  status: string;
  daysActive?: number;
  details: StatusDetail[];
}) {
  const tooltipId = useId();
  if (details.length === 0) {
    return <StatusBadge status={status} daysActive={daysActive} />;
  }

  return (
    <span
      className="group relative inline-flex cursor-help items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      <StatusBadge status={status} daysActive={daysActive} />
      <Info className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-gray-600" aria-hidden="true" />
      <span
        id={tooltipId}
        role="tooltip"
        className="invisible absolute right-full top-0 z-30 mr-2 w-max max-w-[16rem] rounded-md bg-gray-900 px-3 py-2 text-left text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
      >
        {details.map((detail) => (
          <span key={detail.label} className="block whitespace-nowrap">
            <span className="text-gray-300">{detail.label}:</span>{' '}
            <span className="font-medium">{detail.value}</span>
          </span>
        ))}
      </span>
    </span>
  );
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
    // The backend may send a number or a numeric string. Every number is shown (0 and negative
    // values in normal text, overdue in red); only a non-numeric value shows "-".
    const daysOverdueValue = Number(application?.daysOverdue ?? 0);
    const daysOverdue = Number.isFinite(daysOverdueValue) ? daysOverdueValue : null;

    // AppId opens the dashboard that owns the application, filtered to just that id: Intake-stage
    // tasks go to Application Intake (SUBMISSION), all others to the Application Dashboard. Status,
    // priority and My Only are cleared so the request carries only filter[applicationId].
    const linkableApplicationId = toLinkableApplicationId(application.applicationId);
    const intakeStage = isIntakeStage(application.stageName);
    const openApplicationDashboard = () => {
      if (linkableApplicationId === undefined) return;
      if (intakeStage) {
        void navigate({
          to: '/ou-workflow/prelim-dashboard',
          search: { q: '', status: 'all', page: 0, applicationId: linkableApplicationId },
        });
        return;
      }
      void navigate({
        to: '/ou-workflow/ncrc-dashboard',
        search: {
          q: '',
          status: 'all',
          priority: 'all',
          page: 0,
          myOnly: false,
          applicationId: linkableApplicationId,
        },
      });
    };

    const handleTaskApplicationClick = () => {
      if (onOpenApplicationDetails) {
        const target = getTaskDetailsTarget(application);
        if (target) onOpenApplicationDetails(target);
        return;
      }

      if (!application.applicationId) {
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

        <td className="px-6 py-4 align-top text-sm tabular-nums">
          {daysOverdue === null ? (
            <span className="text-gray-400">-</span>
          ) : daysOverdue > 0 ? (
            <span className="font-medium text-red-600">{daysOverdue}</span>
          ) : (
            <span className="text-gray-700">{daysOverdue}</span>
          )}
        </td>

        <td className="px-6 py-4 align-top text-sm text-gray-700 tabular-nums">
          {linkableApplicationId !== undefined ? (
            <button
              type="button"
              onClick={openApplicationDashboard}
              // Same chip as the My Messages "App" button, so it reads as clickable at a glance.
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title={`Open application ${linkableApplicationId} on the ${intakeStage ? 'Application Intake' : 'Application Dashboard'}`}
            >
              <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              {linkableApplicationId}
            </button>
          ) : (
            application.applicationId || <span className="text-gray-400">-</span>
          )}
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
            {/* Started / Completed / Capacity / Completed By show on hover or keyboard focus. */}
            <StatusBadgeWithDetails
              status={application.status}
              daysActive={application.daysActive}
              details={getStatusDetails(application)}
            />
          </div>
        </td>
      </tr>
    );
  }
);

TaskRow.displayName = 'TaskRow';
