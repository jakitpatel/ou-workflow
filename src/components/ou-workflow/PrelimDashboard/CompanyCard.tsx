import { useMemo } from 'react'
import { PrelimAppExpandedStageTasks } from './PrelimAppExpandedStageTasks'

// components/CompanyCard.tsx
type Stage = {
  status?: string
  progress?: number
  tasks?: any[]
}

type Props = {
  company: {
    JotFormId: number
    companyName: string
    whichCategory?: string
    companyWebsite?: string
    companyAddress?: string
    companyAddress2?: string
    companyCity?: string
    companyState?: string
    ZipPostalCode?: string
    companyCountry?: string
    status?: string
    submission_date?: string
    numberOfPlants?: number
    stages?: Record<string, Stage>
  }
  onClick: () => void
  isExpanded: boolean
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
  onClick,
  expanded,
  setExpanded,
  handleTaskAction,
}: Props) {
  const hasAddress =
    company.companyAddress ||
    company.companyCity ||
    company.companyState ||
    company.ZipPostalCode

  const addressLine = [
    company.companyAddress,
    company.companyAddress2,
    company.companyCity,
    company.companyState,
    company.ZipPostalCode,
  ]
    .filter(Boolean)
    .join(', ')

  // 🔹 Stages from backend (dynamic)
  const stageEntries = useMemo(
    () => Object.entries(company.stages ?? {}),
    [company.stages]
  )

  // 🔹 Card click (JSON modal)
  const handleCardClick = (e: React.MouseEvent) => {
    if (
      !(e.target as HTMLElement).closest('button') &&
      !(e.target as HTMLElement).closest('.expanded-panel')
    ) {
      onClick()
    }
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm transition hover:shadow-md">
      {/* Clickable card area */}
      <div onClick={handleCardClick} className="cursor-pointer p-4">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-gray-800 truncate">
            {company.companyName}
          </h3>

          {/* 🔹 Stage Buttons */}
          <div className="flex items-center gap-2">
            {stageEntries.map(([stageName, stage]) => (
              <button
                key={stageName}
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(
                    expanded ? null : String(company.JotFormId)
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
            {company.numberOfPlants ? (
              <span className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                {company.numberOfPlants}{' '}
                {company.numberOfPlants === 1 ? 'Plant' : 'Plants'}
              </span>
            ) : null}
            {company.submission_date && (
              <span className="text-xs text-gray-400">
                {new Date(company.submission_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="mt-1 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {company.whichCategory && (
              <span className="text-gray-500">
                {company.whichCategory}
              </span>
            )}
            {company.companyWebsite && (
              <span className="text-blue-600 truncate">
                {company.companyWebsite}
              </span>
            )}
          </div>

          {hasAddress && (
            <span className="text-gray-600 truncate max-w-xs">
              {addressLine}
            </span>
          )}
        </div>
      </div>

      {/* 🔹 Expanded Stage Panel */}
      {expanded && stageEntries.length > 0 && (
        <div className="expanded-panel p-4">
          <PrelimAppExpandedStageTasks
            expandedStage={stageEntries[0][0]}
            setExpandedStage={(stage) =>
              setExpanded(stage ? String(company.JotFormId) : null)
            }
            applicant={company}
            handleTaskAction={handleTaskAction}
          />
        </div>
      )}
    </div>
  )
}
