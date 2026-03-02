import { useMemo, useState } from 'react'
import { PrelimAppExpandedStageTasks } from './PrelimAppExpandedStageTasks'
import { Clock, CircleX } from 'lucide-react'
import type { Applicant, Task } from '@/types/application'
import { ResolvedSection } from '@/components/ou-workflow/PrelimDashboard/ResolvedSection'
import { useUser } from '@/context/UserContext'
import { CancelApplicationDialog } from '@/components/ou-workflow/modal/CancelApplicationDialog'

type Props = {
  company: Applicant
  onViewApplication: () => void
  expanded: boolean
  setExpanded: (id: string | null) => void
  handleCancelTask: (application: Applicant, action: Task, reason: string) => Promise<void> | void
  handleTaskAction?: (
    e: React.MouseEvent,
    application: any,
    action: any
  ) => void
}

const STATUS_COLORS: Record<string, string> = {
  new: '#808080',
  completed: '#10b981',
  in_progress: '#3b82f6',
  overdue: '#ef4444',
  blocked: '#9ca3af',
  unknown: '#d1d5db',
}

function normalizeStatus(status?: string): string {
  return status?.toLowerCase().trim().replace(/\s+/g, '_') ?? 'unknown'
}

function getStageColor(status?: string): string {
  return STATUS_COLORS[normalizeStatus(status)] ?? STATUS_COLORS.unknown
}

export function CompanyCard({
  company,
  onViewApplication,
  expanded,
  setExpanded,
  handleTaskAction,
  handleCancelTask,
}: Props) {
  const { username, role, roles } = useUser()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  const stageEntries = useMemo(
    () => Object.entries(company.stages ?? {}),
    [company.stages]
  )

  const userRoles = useMemo(() => {
    if (role?.toUpperCase() === 'ALL') {
      return (roles ?? []).map((r) => r.name?.toLowerCase()).filter(Boolean)
    }
    return role ? [role.toLowerCase()] : []
  }, [role, roles])

  function normalizeTaskRoles(taskRoles: any): string[] {
    if (Array.isArray(taskRoles)) {
      return taskRoles
        .map((r: any) => (typeof r === 'string' ? r : r?.taskRole))
        .filter(Boolean)
        .map((s: string) => s.toLowerCase())
    }
    if (typeof taskRoles === 'string') {
      return [taskRoles.toLowerCase()]
    }
    return []
  }

  const hasCancelPermission = (task: Task | null): boolean => {
    if (!task) return false

    const taskRoles = normalizeTaskRoles(task.taskRoles)
    if (taskRoles.length === 0) return false

    const matchingRoles = userRoles.filter((r) => taskRoles.includes(r))
    if (matchingRoles.length === 0) return false

    const assignedRoles = Array.isArray(company?.assignedRoles) ? company.assignedRoles : []
    return assignedRoles.some((ar: any) =>
      matchingRoles.some(
        (matchedRole) =>
          ar?.[matchedRole.toUpperCase()]?.toLowerCase() === username?.toLowerCase()
      )
    )
  }

  const pendingCancelTask = useMemo(() => {
    const globalStageEntry = Object.entries(company.stages ?? {}).find(
      ([stageKey]) => stageKey.toLowerCase() === 'global'
    )
    const globalTasks = globalStageEntry?.[1]?.tasks ?? []

    return (
      globalTasks.find(
        (task) =>
          task?.name?.toLowerCase() === 'cancel application' &&
          task?.status?.toLowerCase() === 'pending' &&
          hasCancelPermission(task)
      ) ?? null
    )
  }, [company.stages, company.assignedRoles, userRoles, username])

  const canCancelApplication = useMemo(() => {
    return hasCancelPermission(pendingCancelTask)
  }, [pendingCancelTask, company.assignedRoles, userRoles, username])

  const handleConfirmCancel = async () => {
    if (!pendingCancelTask || !canCancelApplication || !cancelReason.trim() || isSubmittingCancel) return

    setIsSubmittingCancel(true)
    try {
      await Promise.resolve(handleCancelTask(company, pendingCancelTask, cancelReason.trim()))
      setShowCancelDialog(false)
      setCancelReason('')
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm transition hover:shadow-md p-4">
      <div className="cursor-pointer">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-semibold text-gray-800 truncate">
              {company.company}
            </h3>
            {company.externalReferenceId != null && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 flex-shrink-0">
                Ref: {company.externalReferenceId}
              </span>
            )}
            {company.applicationId != null && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 flex-shrink-0">
                AppId: {company.applicationId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stageEntries
              .filter(([stageName]) => stageName.toLowerCase() !== 'global')
              .map(([stageName, stage]) => (
              <button
                key={stageName}
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(expanded ? null : String(company.applicationId))
                }}
                className={`px-4 py-1.5 rounded text-xs font-medium text-white transition-all ${
                  expanded ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                }`}
                style={{ backgroundColor: getStageColor(stage.status) }}
                title={`View ${stageName} tasks`}
              >
                {stageName}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!canCancelApplication) return
                setShowCancelDialog(true)
              }}
              disabled={!canCancelApplication}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                canCancelApplication
                  ? 'text-red-600 hover:text-white hover:bg-red-600 border-red-300 focus:ring-red-500'
                  : 'text-gray-400 border-gray-300 cursor-not-allowed focus:ring-gray-400'
              }`}
              title={canCancelApplication ? 'Cancel Application' : "You don't have permission to cancel application"}
              aria-label={canCancelApplication ? 'Cancel Application' : "You don't have permission to cancel application"}
            >
              <CircleX className="w-4 h-4" aria-hidden="true" />
            </button>
            {company.status && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {company.status}
              </span>
            )}
            {company.createdDate && (
              <span className="text-xs text-gray-400">
                {new Date(company.createdDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded">
            <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
            <span className="text-sm font-medium">{company.daysInProcess} days elapsed</span>
          </div>

          <div className="flex items-center gap-2">
            {company?.daysOverdue > 0 && (
              <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded">
                <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
                <span className="text-sm font-medium">{company.daysOverdue} days overdue</span>
              </div>
            )}
            <button
              onClick={onViewApplication}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              View Application
            </button>
          </div>
        </div>
      </div>

      {showCancelDialog && (
        <CancelApplicationDialog
          companyName={company.company}
          reason={cancelReason}
          saving={isSubmittingCancel}
          onReasonChange={setCancelReason}
          onClose={() => {
            if (isSubmittingCancel) return
            setShowCancelDialog(false)
            setCancelReason('')
          }}
          onConfirm={handleConfirmCancel}
        />
      )}

      {expanded && stageEntries.length > 0 && (
        <div className="expanded-panel">
          <PrelimAppExpandedStageTasks
            expandedStage={stageEntries[0][0]}
            setExpandedStage={(stage) =>
              setExpanded(stage ? String(company.applicationId) : null)
            }
            applicant={company}
            handleTaskAction={handleTaskAction}
          />
        </div>
      )}
      <ResolvedSection
        application={company}
        loading={false}
        defaultVisible={normalizeStatus(company.status) !== 'completed'}
      />
    </div>
  )
}
