import { useState, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ApplicantProgressBar } from './ApplicantProgressBar';
import { ApplicationExpandedStage } from './ApplicationExpandedStage';
import { CancelApplicationDialog } from '@/components/ou-workflow/modal/CancelApplicationDialog';
import {
  Bell,
  FileText,
  Clock,
  Bot,
  ClipboardList,
  Package,
  ListTodo,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { Task, Applicant } from '@/types/application';
import { Route as DashboardRoute } from '@/routes/ou-workflow/ncrc-dashboard';
import { Route as TaskDashboardRoute } from '@/routes/ou-workflow/tasks-dashboard';
import { Route as TaskDashboardWithAppRoute } from '@/routes/ou-workflow/tasks-dashboard/$applicationId';
import { useUser } from '@/context/UserContext';
import { normalizeTaskRoles } from '@/lib/utils/taskHelpers';

type Props = {
  applicant: Applicant;
  handleTaskAction: (e: React.MouseEvent, application: Applicant, action: Task) => void;
  handleCancelTask: (application: Applicant, action: Task, reason: string) => Promise<void> | void;
};

// Move configs outside component to prevent recreation on each render
type PriorityKey = 'urgent' | 'high' | 'medium' | 'low' | 'normal';
type StatusKey = 'new' | 'contract_sent' | 'under_review' | 'inspection_scheduled' | 'payment_pending' | 'certified';

const PRIORITY_CONFIG: Record<PriorityKey, { label: string; color: string; textColor: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500', textColor: 'text-white' },
  high: { label: 'High', color: 'bg-orange-500', textColor: 'text-white' },
  medium: { label: 'Medium', color: 'bg-blue-500', textColor: 'text-white' },
  low: { label: 'Low', color: 'bg-gray-500', textColor: 'text-white' },
  normal: { label: 'Normal', color: 'bg-blue-500', textColor: 'text-white' },
};

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; step: number }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800', step: 1 },
  contract_sent: { label: 'Contract Sent', color: 'bg-blue-100 text-blue-800', step: 2 },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', step: 3 },
  inspection_scheduled: { label: 'Inspection Scheduled', color: 'bg-purple-100 text-purple-800', step: 4 },
  payment_pending: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800', step: 5 },
  certified: { label: 'Certified', color: 'bg-green-100 text-green-800', step: 6 },
};

const DEFAULT_STATUS = (status: string) => ({
  label: status,
  color: 'bg-blue-100 text-blue-800',
  step: 0,
});

// Document type configuration
const DOCUMENT_TYPES = [
  { key: 'APP', label: 'Application Details', icon: ClipboardList },
  { key: 'ING', label: 'Ingredients List', icon: Package },
  { key: 'PROD', label: 'Product Details', icon: FileText },
] as const;

const saveScrollPosition = (applicationId: string | number) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('ncrc-paged-scroll', String(window.scrollY));
  }
  sessionStorage.setItem(
    'ncrc-infinite-scroll',
    JSON.stringify({
      scrollY: window.scrollY,
      anchorId: applicationId ?? null,
    })
  );
};

export function ApplicantCard({ applicant, handleTaskAction, handleCancelTask }: Props) {
  const { username, role, roles } = useUser();
  const navigate = useNavigate();
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const dashboardSearch = DashboardRoute.useSearch();

  // Memoize computed values
  const status = useMemo(() => {
    const normalized = applicant.status?.toLowerCase() ?? '';
    return STATUS_CONFIG[normalized as StatusKey] ?? DEFAULT_STATUS(applicant.status);
  }, [applicant.status]);

  const priority = useMemo(() => {
    const priorityKey = (applicant.priority?.toLowerCase() ?? 'low') as PriorityKey;
    return PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.low;
  }, [applicant.priority]);

  const filesByType = useMemo(() => {
    return applicant.files?.reduce((acc, file) => {
      acc[file.fileType] = file;
      return acc;
    }, {} as Record<string, typeof applicant.files[0]>);
  }, [applicant.files]);

  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map((r) => r.name?.toLowerCase()).filter(Boolean);
    }
    return role ? [role.toLowerCase()] : [];
  }, [role, roles]);

  const isCritical = useMemo(() => {
    return (
      applicant.overdue ||
      applicant.stages?.['Inspection']?.tasks?.find((t) => t.name === 'KIM Paid')?.status === 'overdue'
    );
  }, [applicant.overdue, applicant.stages]);

  const hasCancelPermission = (task: Task | null): boolean => {
    if (!task) return false

    const taskRoles = normalizeTaskRoles(task.taskRoles)
    if (taskRoles.length === 0) return false

    const matchingRoles = userRoles
      .map(r => r.toLowerCase())
      .filter(r => taskRoles.includes(r))

    if (matchingRoles.length === 0) return false

    const assignedRoles = Array.isArray(applicant?.assignedRoles)
      ? applicant.assignedRoles
      : []

    return assignedRoles.some((ar: any) =>
      matchingRoles.some(
        role =>
          ar?.[role.toUpperCase()]?.toLowerCase() === username?.toLowerCase()
      )
    )
  }

  const pendingCancelTask = useMemo(() => {
    const globalStageEntry = Object.entries(applicant.stages ?? {}).find(
      ([stageKey]) => stageKey.toLowerCase() === 'global'
    )

    const globalTasks = globalStageEntry?.[1]?.tasks ?? []

    return (
      globalTasks.find(
        task =>
          task?.name?.toLowerCase() === 'cancel application' &&
          task?.status?.toLowerCase() === 'pending'
      ) ?? null
    )
  }, [applicant.stages])

  const canCancelApplication = useMemo(() => {
    return hasCancelPermission(pendingCancelTask)
  }, [pendingCancelTask, applicant.assignedRoles, userRoles, username])

  const handleViewTasks = (applicationId?: string | number) => {
    saveScrollPosition(applicationId ?? '');
    // 🔹 No applicationId → base tasks dashboard
    if (!applicationId) {
      navigate({
        to: TaskDashboardRoute.to,
        search: () => ({
          qs: '',
          days: 'pending',
        }),
      });
      return;
    }

    // 🔹 With applicationId → param route
    navigate({
      to: TaskDashboardWithAppRoute.to,
      params: { applicationId: String(applicationId) },
      search: () => ({
        qs: '',
        days: 'pending',
      }),
    });
  };

  const toggleAIAssistant = () => setShowAIAssistant((prev) => !prev);

  const handleStageClick = (stageName: string) => {
    setExpandedStage(expandedStage === stageName ? null : stageName)
  }

  const handleConfirmCancel = async () => {
    if (!pendingCancelTask || !canCancelApplication || !cancelReason.trim() || isSubmittingCancel) return;

    setIsSubmittingCancel(true);
    try {
      await Promise.resolve(handleCancelTask(applicant, pendingCancelTask, cancelReason.trim()));
      setShowCancelDialog(false);
      setCancelReason('');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div data-app-id={applicant.applicationId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
      {/* Header + Progress (Horizontal) */}
      <div className="flex items-start gap-6">
        {/* Left: Header */}
        <div className="flex-[2] min-w-[280px] max-w-[420px]">
          <CardHeader
            applicant={applicant}
            priority={priority}
            isCritical={isCritical}
            //onViewTasks={handleViewTasks}
            onViewApplicationDetails={(id) => {
              navigate({
                to: '/ou-workflow/ncrc-dashboard/$applicationId',
                params: { applicationId: String(id) }
              });
            }}
            //onToggleAI={toggleAIAssistant}
          />
        </div>

        {/* Right: Progress Bar */}
        <div className="flex-[4] min-w-[420px]">
          <ApplicantProgressBar
            applicant={applicant}
            onStageClick={handleStageClick}
            expandedStage={expandedStage}
          />
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {showAIAssistant && (
            <button
              onClick={toggleAIAssistant}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="AI Assistant - Powered by Gemini"
              aria-label="Toggle AI Assistant"
            >
              <Bot className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}
            aria-label={`Status: ${status.label}`}
          >
            {status.label}
          </span>
        </div>
      </div>
      {/* Expanded Stage Details */}
      <ApplicationExpandedStage expandedStage={expandedStage} setExpandedStage={setExpandedStage} applicant={applicant} handleTaskAction={handleTaskAction} />

      {/* AI Assistant Panel */}
      {showAIAssistant && <AIAssistantPanel applicant={applicant} />}

      {/* Cancel Application Dialog */}
      {showCancelDialog && (
        <CancelApplicationDialog
          companyName={applicant.company}
          reason={cancelReason}
          saving={isSubmittingCancel}
          onReasonChange={setCancelReason}
          onClose={() => {
            if (isSubmittingCancel) return;
            setShowCancelDialog(false);
            setCancelReason('');
          }}
          onConfirm={handleConfirmCancel}
        />
      )}

      {/* Stats Section */}
      <CardStats applicant={applicant} />

      {/* Documents + Actions Section */}
      <CardFooter
        applicant={applicant}
        onViewTasks={handleViewTasks}
        dashboardSearch={dashboardSearch}
        filesByType={filesByType}
        canCancelApplication={canCancelApplication}
        onCancelApplication={() => {
          if (!canCancelApplication) return;
          setShowCancelDialog(true);
        }}
      />
    </div>
  );
}

// Subcomponents for better organization
interface CardHeaderProps {
  applicant: Applicant;
  priority: { label: string; color: string; textColor: string };
  //status: { label: string; color: string; step: number };
  isCritical: boolean;
  //showAIAssistant: boolean;
  //onViewTasks: (id?: string | number) => void;
  onViewApplicationDetails: (id?: string | number) => void;
  //onToggleAI: () => void;
}

function CardHeader({
  applicant,
  priority,
  isCritical,
  onViewApplicationDetails
}: CardHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="flex items-center flex-wrap gap-2 mb-2">
          {/*
          <button
            onClick={() => onViewTasks(applicant.applicationId)}
            className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            title={`Click to view tasks for ${applicant.company}`}
            aria-label={`View tasks for ${applicant.company}`}
          >
            {applicant.company}
          </button>
          */}
          <button
            onClick={() => {
              saveScrollPosition(applicant.applicationId ?? '');
              onViewApplicationDetails(applicant.applicationId);
            }}
            className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            title={`Click to view application details for ${applicant.company}`}
            aria-label={`View application details for ${applicant.company}`}
          >
            {applicant.company}
          </button>
          {applicant.applicationId != null && (
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 flex-shrink-0">
              AppId: {applicant.applicationId}
            </span>
          )}
        </div>

        <p className="text-gray-600 text-sm">
          {applicant.plant} • {applicant.region}
        </p>
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color} ${priority.textColor}`}
            aria-label={`Priority: ${priority.label}`}
          >
            {priority.label}
          </span>
          {isCritical && (
            <div className="flex items-center text-red-600" role="alert" aria-label="Critical status">
              <AlertTriangle className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="text-xs font-medium">CRITICAL</span>
            </div>
          )}

          <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded">
            <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
            <span className="text-sm font-medium">{applicant.daysInProcess} days elapsed</span>
          </div>

          {applicant?.daysOverdue > 0 && (
            <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded">
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="text-sm font-medium">{applicant.daysOverdue} days overdue</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AIAssistantPanel({ applicant }: { applicant: Applicant }) {
  const todoItems = applicant?.aiSuggestions?.todoItems ?? [];

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Sparkles className="w-4 h-4 text-blue-600 mr-2" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-blue-900">AI Assistant</h4>
          <span className="text-xs text-blue-600 ml-2 bg-blue-100 px-2 py-1 rounded">
            Powered by Gemini
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {todoItems.length > 0 && (
          <div>
            <div className="flex items-center mb-2">
              <ListTodo className="w-3 h-3 text-blue-600 mr-1" aria-hidden="true" />
              <span className="text-xs font-medium text-blue-800">Smart Actions</span>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              {todoItems.slice(0, 2).map((item: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {applicant?.aiSuggestions?.criticalPath && (
          <div>
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-3 h-3 text-orange-600 mr-1" aria-hidden="true" />
              <span className="text-xs font-medium text-orange-800">Critical Path</span>
            </div>
            <p className="text-xs text-gray-700">{applicant.aiSuggestions.criticalPath}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CardStats({ applicant }: { applicant: Applicant }) {
  const withdrawnReason = (applicant as any)?.withdrawn_reason;
  const isWithdrawn =
    applicant?.status?.toLowerCase() === 'withdrawn' ||
    applicant?.status?.toLowerCase() === 'wth';

  return (
    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center space-x-4">
        <span className="flex items-center">
          <FileText className="w-4 h-4 mr-1" aria-hidden="true" />
          <span className="sr-only">Documents:</span>
          {applicant.documents} docs
        </span>
        <span className="flex items-center">
          <Bell className="w-4 h-4 mr-1" aria-hidden="true" />
          <span className="sr-only">Notes:</span>
          {applicant.notes} notes
        </span>
        {isWithdrawn && withdrawnReason && (
          <span className="flex items-center">
            <span className="font-medium">Withdrawn Reason:</span>&nbsp;{withdrawnReason}
          </span>
        )}
      </div>
      {applicant.lastUpdate && (
        <span className="text-xs">
          Updated: <time dateTime={applicant.lastUpdate}>{applicant.lastUpdate.split('.')[0]}</time>
        </span>
      )}
    </div>
  );
}

interface CardActionsProps {
  applicant: Applicant;
  onViewTasks: (id?: string | number) => void;
  dashboardSearch: Record<string, unknown>;
  canCancelApplication?: boolean;
  onCancelApplication?: () => void;
}

function CardFooter({
  applicant,
  onViewTasks,
  dashboardSearch,
  filesByType,
  canCancelApplication,
  onCancelApplication,
}: CardActionsProps & { filesByType?: Record<string, any> }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
      <DocumentLinks filesByType={filesByType} />
      <CardActions
        applicant={applicant}
        onViewTasks={onViewTasks}
        dashboardSearch={dashboardSearch}
        canCancelApplication={canCancelApplication}
        onCancelApplication={onCancelApplication}
      />
    </div>
  );
}

function CardActions({
  applicant,
  onViewTasks,
  dashboardSearch,
  canCancelApplication = false,
  onCancelApplication,
}: CardActionsProps) {
  const normalizedStatus = applicant?.status?.toLowerCase();
  const isWithdrawn = normalizedStatus === 'withdrawn' || normalizedStatus === 'wth';
  const canWithdrawApplication = canCancelApplication && !isWithdrawn;

  return (
    <div className="flex items-center space-x-2 ml-auto">
      <Link
        to="/ou-workflow/ncrc-dashboard/$applicationId"
        params={{ applicationId: String(applicant.applicationId) }}
        search={dashboardSearch}
        onClick={() => saveScrollPosition(applicant.applicationId)}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        View Details
      </Link>
      <button
        onClick={() => onViewTasks(applicant.applicationId)}
        disabled={isWithdrawn}
        className={`px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isWithdrawn
            ? 'bg-green-100 text-green-300 cursor-not-allowed focus:ring-green-200'
            : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
        }`}
        title={isWithdrawn ? 'Tasks are disabled because this application is withdrawn.' : 'View Tasks'}
      >
        View Tasks {'->'}
      </button>
      <button
        onClick={onCancelApplication}
        disabled={!canWithdrawApplication}
        className={`px-3 py-1 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          canWithdrawApplication
            ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
            : 'bg-red-100 text-red-300 cursor-not-allowed focus:ring-red-200'
        }`}
        title={
          canWithdrawApplication
            ? 'Cancel Application'
            : isWithdrawn
              ? 'This application is already withdrawn.'
              : "This application cannot be canceled due to its current status or your permissions."
        }
        aria-label={
          canWithdrawApplication
            ? 'Cancel Application'
            : isWithdrawn
              ? 'This application is already withdrawn.'
              : "This application cannot be canceled due to its current status or your permissions."
        }
      >
        Withdraw Application
      </button>
    </div>
  );
}

function DocumentLinks({ filesByType }: { filesByType?: Record<string, any> }) {
  if (!filesByType) return null;

  const availableDocs = DOCUMENT_TYPES.filter((doc) => filesByType[doc.key]);

  if (availableDocs.length === 0) return null;

  return (
    <div className="flex items-center gap-3 min-w-0 overflow-hidden whitespace-nowrap">
      <span className="text-xs text-gray-500 font-medium shrink-0">Pre-NCRC Documentation:</span>
      {availableDocs.map(({ key, label, icon: Icon }) => {
        const file = filesByType[key];
        return (
          <a
            key={key}
            href={file.filePath}
            target="_blank"
            rel="noopener noreferrer"
            title={file.fileName}
            className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded whitespace-nowrap"
          >
            <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
            {label}
            <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
            <span className="sr-only">(opens in new tab)</span>
          </a>
        );
      })}
    </div>
  );
}

