import React from 'react'
import type { Applicant } from '@/types/application'
import { useUser } from '@/context/UserContext'

type Props = {
  applicant: Applicant
  onStageClick: (stageKey: string) => void
  expandedStage: string | null
}

// ==========================================
// Constants
// ==========================================

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

const LAYOUT_CONFIG = {
  leftStages: ['nda', 'inspection'] as const,
  rightStages: ['ingredients', 'products'] as const,
  verticalStageKeys: ['nda', 'inspection', 'ingredients', 'products'] as const,
  firstStageKey: 'initial' as const,
  lastStageKeys: ['contract', 'certification'] as const
} as const

// ==========================================
// Utility Functions
// ==========================================

function normalizeStatus(status?: string): string {
  return status?.toLowerCase().trim().replace(/\s+/g, '_') ?? 'unknown'
}

function getStageColor(status?: string): string {
  const normalized = normalizeStatus(status)
  return STATUS_COLORS[normalized] ?? '#d1d5db'
}

// ==========================================
// Sub-Components
// ==========================================

type StageButtonProps = {
  stage: { key: string; name: string }
  isExpanded: boolean
  status?: string
  onClick: () => void
  className?: string
}

function StageButton({ stage, isExpanded, status, onClick, className = '' }: StageButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded cursor-pointer hover:opacity-80 transition-all ${
        isExpanded ? 'ring-2 ring-blue-400 ring-offset-1' : ''
      } ${className}`}
      style={{ backgroundColor: getStageColor(status) }}
      title={`Click to see ${stage.name} tasks`}
    >
      <span className="text-white text-xs font-medium truncate">
        {stage.name}
      </span>
    </button>
  )
}

function Arrow() {
  return (
    <div className="flex-shrink-0 text-gray-400">
      <svg
        className="w-6 h-6"
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
  )
}

type StageColumnProps = {
  stages: Array<{ key: string; name: string }>
  applicant: Applicant
  expandedStage: string | null
  onStageClick: (key: string) => void
}

function StageColumn({ stages, applicant, expandedStage, onStageClick }: StageColumnProps) {
  return (
    <div className="flex flex-col space-y-2">
      {stages.map((stage) => (
        <StageButton
          key={stage.key}
          stage={stage}
          isExpanded={expandedStage === stage.key}
          status={applicant.stages[stage.key]?.status}
          onClick={() => onStageClick(stage.key)}
          className="w-full"
        />
      ))}
    </div>
  )
}

// ==========================================
// Layout Components
// ==========================================

type HorizontalLayoutProps = {
  applicant: Applicant
  expandedStage: string | null
  onStageClick: (key: string) => void
}

function HorizontalLayout({ applicant, expandedStage, onStageClick }: HorizontalLayoutProps) {
  return (
    <div className="flex space-x-2">
      {STAGE_ORDER.map((stage) => (
        <StageButton
          key={stage.key}
          stage={stage}
          isExpanded={expandedStage === stage.key}
          status={applicant.stages[stage.key]?.status}
          onClick={() => onStageClick(stage.key)}
          className="flex-1"
        />
      ))}
    </div>
  )
}

type MixedLayoutProps = {
  applicant: Applicant
  expandedStage: string | null
  onStageClick: (key: string) => void
}

function MixedLayout({ applicant, expandedStage, onStageClick }: MixedLayoutProps) {
  const firstStage = STAGE_ORDER.find((s) => s.key === LAYOUT_CONFIG.firstStageKey)
  const verticalStages = STAGE_ORDER.filter((s) =>
    (LAYOUT_CONFIG.verticalStageKeys as readonly string[]).includes(s.key)
  )
  const lastStages = STAGE_ORDER.filter((s) =>
    (LAYOUT_CONFIG.lastStageKeys as readonly string[]).includes(s.key)
  )

  const leftStages = LAYOUT_CONFIG.leftStages
    .map((key) => verticalStages.find((s) => s.key === key))
    .filter(Boolean) as typeof verticalStages

  const rightStages = LAYOUT_CONFIG.rightStages
    .map((key) => verticalStages.find((s) => s.key === key))
    .filter(Boolean) as typeof verticalStages

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Initial Stage */}
      {firstStage && (
        <StageButton
          stage={firstStage}
          isExpanded={expandedStage === firstStage.key}
          status={applicant.stages[firstStage.key]?.status}
          onClick={() => onStageClick(firstStage.key)}
          className="whitespace-nowrap"
        />
      )}

      <Arrow />

      {/* Parallel Stages Box */}
      <div
        className="border-2 border-gray-300 rounded-lg px-3 py-3 bg-gray-50 flex-shrink-0"
        style={{ minWidth: '320px' }}
      >
        <div className="grid grid-cols-2 gap-x-3">
          <StageColumn
            stages={leftStages}
            applicant={applicant}
            expandedStage={expandedStage}
            onStageClick={onStageClick}
          />
          <StageColumn
            stages={rightStages}
            applicant={applicant}
            expandedStage={expandedStage}
            onStageClick={onStageClick}
          />
        </div>
      </div>

      <Arrow />

      {/* Final Stages */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {lastStages.map((stage, index) => (
          <React.Fragment key={stage.key}>
            <StageButton
              stage={stage}
              isExpanded={expandedStage === stage.key}
              status={applicant.stages[stage.key]?.status}
              onClick={() => onStageClick(stage.key)}
              className="whitespace-nowrap"
            />
            {index < lastStages.length - 1 && <Arrow />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ==========================================
// Main Component
// ==========================================

export function ApplicantProgressBar({ applicant, expandedStage, onStageClick }: Props) {
  const { stageLayout } = useUser()
  const isVerticalLayout = stageLayout === 'mixed'

  return (
    <div className="space-y-2">
      {isVerticalLayout ? (
        <MixedLayout
          applicant={applicant}
          expandedStage={expandedStage}
          onStageClick={onStageClick}
        />
      ) : (
        <HorizontalLayout
          applicant={applicant}
          expandedStage={expandedStage}
          onStageClick={onStageClick}
        />
      )}
    </div>
  )
}