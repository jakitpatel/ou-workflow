import React from 'react'
import type { Applicant } from '@/types/application'
import { useUser } from '@/context/UserContext'

type Props = {
  applicant: Applicant
  onStageClick: (stageKey: string) => void
  expandedStage: string | null
}
const LEFT_STAGES = ['nda', 'inspection'];
const RIGHT_STAGES = ['ingredients', 'products'];
const VERTICAL_STAGE_KEYS = ['nda', 'inspection', 'ingredients', 'products'];
const FIRST_STAGE_KEY = 'initial';
const LAST_STAGE_KEYS = ['contract', 'certification'];
// 🔹 Constants moved outside component for better performance
const STAGE_ORDER = [
  { key: 'initial', name: 'Initial' },
  { key: 'nda', name: 'NDA' },
  { key: 'inspection', name: 'Inspection' },
  { key: 'ingredients', name: 'Ingredients' },
  { key: 'products', name: 'Products' },
  { key: 'contract', name: 'Contract' },
  { key: 'certification', name: 'Certification' }
] as const

const STATUS_COLORS: Record<string, string> = {
  new: '#808080',
  completed: '#10b981',
  in_progress: '#3b82f6',
  overdue: '#ef4444',
  blocked: '#9ca3af'
}

// 🔹 Utility functions extracted for clarity
function normalizeStatus(status?: string): string {
  return status?.toLowerCase().trim().replace(/\s+/g, '_') ?? 'unknown'
}

function getStageColor(status: string): string {
  const normalized = normalizeStatus(status)
  return STATUS_COLORS[normalized] ?? '#d1d5db'
}

export function ApplicantProgressBar({ applicant, expandedStage, onStageClick }: Props) {
  const { stageLayout } = useUser()
  const isVerticalLayout = stageLayout === 'mixed';

  const firstStage = STAGE_ORDER.find(s => s.key === FIRST_STAGE_KEY)
  const verticalStages = STAGE_ORDER.filter(s =>
    VERTICAL_STAGE_KEYS.includes(s.key)
  )
  const lastStages = STAGE_ORDER.filter(s =>
    LAST_STAGE_KEYS.includes(s.key)
  )

  return (
    <div className="space-y-2">
      {/* Stat Stages */}
      {!isVerticalLayout ? (
        /*  NORMAL HORIZONTAL LAYOUT */
        <div className="flex space-x-1">
          {STAGE_ORDER.map(stage => (
            <button
              key={stage.key}
              onClick={() => onStageClick(stage.key)}
              className={`flex-1 h-6 rounded cursor-pointer hover:opacity-80 transition-all ${
                expandedStage === stage.key
                  ? 'ring-2 ring-blue-400 ring-offset-1'
                  : ''
              }`}
              style={{
                backgroundColor: getStageColor(
                  applicant.stages[stage.key]?.status
                )
              }}
              title={`Click to see ${stage.name} tasks`}
            >
              <span className="text-white text-xs leading-6">
                {stage.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        /*  MIXED LAYOUT */
        <div className="flex items-center gap-4 w-full">

          {/* Column 1: Initial */}
          {firstStage && (
            <button
              onClick={() => onStageClick(firstStage.key)}
              className={`h-6 px-3 rounded cursor-pointer hover:opacity-80 transition-all whitespace-nowrap ${
                expandedStage === firstStage.key
                  ? 'ring-2 ring-blue-400 ring-offset-1'
                  : ''
              }`}
              style={{
                backgroundColor: getStageColor(
                  applicant.stages[firstStage.key]?.status
                )
              }}
            >
              <span className="text-white text-xs leading-6 truncate">
                {firstStage.name}
              </span>
            </button>
          )}

          {/* Arrow */}
          <div className="flex-shrink-0 text-gray-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          {/* Parallel Stages Box */}
          <div
            className="border-2 border-gray-300 rounded-lg px-3 py-3 bg-gray-50 flex-shrink-0"
            style={{ minWidth: '290px' }}
          >
            <div className="grid grid-cols-2 gap-x-3">

              {/* Left column */}
              <div className="flex flex-col space-y-2">
                {LEFT_STAGES.map((key) => {
                  const stage = verticalStages.find(s => s.key === key);
                  if (!stage) return null;

                  return (
                    <button
                      key={stage.key}
                      onClick={() => onStageClick(stage.key)}
                      className={`h-6 w-full px-2 rounded transition-all hover:opacity-80 ${
                        expandedStage === stage.key
                          ? 'ring-2 ring-blue-400 ring-offset-1'
                          : ''
                      }`}
                      style={{
                        backgroundColor: getStageColor(
                          applicant.stages[stage.key]?.status
                        ),
                      }}
                    >
                      <span className="text-white text-xs leading-6 truncate">
                        {stage.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right column */}
              <div className="flex flex-col space-y-2">
                {RIGHT_STAGES.map((key) => {
                  const stage = verticalStages.find(s => s.key === key);
                  if (!stage) return null;

                  return (
                    <button
                      key={stage.key}
                      onClick={() => onStageClick(stage.key)}
                      className={`h-6 w-full px-2 rounded transition-all hover:opacity-80 ${
                        expandedStage === stage.key
                          ? 'ring-2 ring-blue-400 ring-offset-1'
                          : ''
                      }`}
                      style={{
                        backgroundColor: getStageColor(
                          applicant.stages[stage.key]?.status
                        ),
                      }}
                    >
                      <span className="text-white text-xs leading-6 truncate">
                        {stage.name}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 text-gray-400">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>

          {/* Column 3: Last stages (2-step linear flow) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {lastStages.map((stage, index) => (
              <React.Fragment key={stage.key}>
                <button
                  onClick={() => onStageClick(stage.key)}
                  className={`h-6 px-3 rounded cursor-pointer hover:opacity-80 transition-all whitespace-nowrap ${
                    expandedStage === stage.key
                      ? 'ring-2 ring-blue-400 ring-offset-1'
                      : ''
                  }`}
                  style={{
                    backgroundColor: getStageColor(
                      applicant.stages[stage.key]?.status
                    ),
                  }}
                >
                  <span className="text-white text-xs leading-6 truncate">
                    {stage.name}
                  </span>
                </button>

                {/* Arrow BETWEEN stages */}
                {index < lastStages.length - 1 && (
                  <div className="flex-shrink-0 text-gray-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {/* End Stages */}
    </div>
  )
}