import { useMemo } from 'react'
import { PrelimAppExpandedStageTasks } from './PrelimAppExpandedStageTasks'
import { Clock } from 'lucide-react';

type Stage = {
  status?: string
  progress?: number
  tasks?: any[]
}

type Props = {
  company: {
    applicationId: number
    company: string
    status?: string
    createdDate?: string
    stages?: Record<string, Stage>
  }
  onViewApplication: () => void
  expanded: boolean
  setExpanded: (id: string | null) => void
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
}: Props) {
  // 🔹 Stages from backend
  const stageEntries = useMemo(
    () => Object.entries(company.stages ?? {}),
    [company.stages]
  )

  // 🔹 Prevent accidental modal open
  /*const handleCardClick = (e: React.MouseEvent) => {
    if (
      !(e.target as HTMLElement).closest('button') &&
      !(e.target as HTMLElement).closest('.expanded-panel')
    ) {
      onClick()
    }
  }*/

  return (
    <div className="rounded-lg border bg-white shadow-sm transition hover:shadow-md p-4">
      <div className="cursor-pointer">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-gray-800 truncate">
            {company.company}
          </h3>

          {/* 🔹 Dynamic Stage Buttons */}
          <div className="flex items-center gap-2">
            {stageEntries.map(([stageName, stage]) => (
              <button
                key={stageName}
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(
                    expanded ? null : String(company.applicationId)
                  )
                }}
                className={`px-4 py-1.5 rounded text-xs font-medium text-white transition-all
                  ${expanded ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                style={{ backgroundColor: getStageColor(stage.status) }}
                title={`View ${stageName} tasks`}
              >
                {stageName}
              </button>
            ))}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

          {company?.daysOverdue > 0 && (
            <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded">
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="text-sm font-medium">{company.daysOverdue} days overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* 🔹 Expanded Stage Panel */}
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
      <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-700 font-medium">{/*Next: {applicant.nextAction}*/}</p>
            <div className="flex space-x-2">
              <button
                onClick={onViewApplication}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                View Application
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}
