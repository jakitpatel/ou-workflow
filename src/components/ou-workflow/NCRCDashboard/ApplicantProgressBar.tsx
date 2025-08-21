import React, { useState } from 'react'
import { Package, X } from 'lucide-react'

type Task = {
  name: string
  status: 'completed' | 'in_progress' | 'overdue' | 'blocked' | 'pending'
  assignee: string
  required: boolean
  daysActive: number
}

type Stage = {
  status: string
  progress: number
  tasks: Task[]
}

type Applicant = {
  id: string
  stages: Record<string, Stage>
}

type Props = {
  applicant: Applicant
  showDetails?: boolean
  handleTaskAction?: (
    e: React.MouseEvent,
    task: Task,
    action: string,
    applicantId: string
  ) => void
}

export function ApplicantProgressBar({
  applicant,
  showDetails = false,
  handleTaskAction
}: Props) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null)

  const handleStageClick = (stageKey: string) => {
    if (showDetails) {
      setExpandedStage(expandedStage === stageKey ? null : stageKey)
    }
  }

  const handleTaskActionLocal = (
    e: React.MouseEvent,
    task: Task,
    action: string
  ) => {
    e.stopPropagation()
    e.preventDefault()
    handleTaskAction?.(e, task, action, applicant.id)
  }

  const stageOrder = [
    { key: 'initial', name: 'Initial' },
    { key: 'nda', name: 'NDA' },
    { key: 'inspection', name: 'Inspection' },
    { key: 'ingredients', name: 'Ingredients' },
    { key: 'products', name: 'Products' },
    { key: 'contract', name: 'Contract' },
    { key: 'certification', name: 'Certification' }
  ]

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981'
      case 'in_progress':
        return '#3b82f6'
      case 'overdue':
        return '#ef4444'
      case 'blocked':
        return '#9ca3af'
      default:
        return '#d1d5db'
    }
  }

  return (
    <div className="mt-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex space-x-1">
          {stageOrder.map((stage) => (
            <button
              key={stage.key}
              onClick={() => handleStageClick(stage.key)}
              className={`flex-1 h-6 rounded cursor-pointer hover:opacity-80 transition-all ${
                expandedStage === stage.key
                  ? 'ring-2 ring-blue-400 ring-offset-1'
                  : ''
              }`}
              style={{
                backgroundColor: getStageColor(applicant.stages[stage.key]?.status)
              }}
              title={`Click to see ${stage.name} tasks`}
            >
              <span className="text-white text-xs leading-6">{stage.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Stage Details */}
      {showDetails &&
        expandedStage &&
        applicant.stages[expandedStage]?.tasks?.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900 capitalize text-lg">
                {expandedStage} Stage Tasks
              </h4>
              <button
                onClick={() => setExpandedStage(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem'
              }}
            >
              {applicant.stages[expandedStage].tasks.map((task, index) => (
                <div
                  key={index}
                  className={`bg-white rounded border-l-4 p-3 shadow-sm ${
                    task.status === 'completed'
                      ? 'border-l-green-500'
                      : task.status === 'in_progress'
                      ? 'border-l-blue-500'
                      : task.status === 'overdue'
                      ? 'border-l-red-500'
                      : task.status === 'blocked'
                      ? 'border-l-gray-400'
                      : 'border-l-yellow-500'
                  }`}
                >
                  <div className="mb-2">
                    <span className="text-sm font-semibold text-gray-900 block leading-tight">
                      {task.name}
                    </span>
                    {task.required && (
                      <span className="text-xs text-red-600 bg-red-50 px-1 py-0.5 rounded mt-1 inline-block">
                        Required
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : task.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : task.status === 'blocked'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {task.status === 'completed'
                        ? 'Completed'
                        : task.status === 'in_progress'
                        ? 'In Progress'
                        : task.status === 'overdue'
                        ? 'Needs Attention'
                        : task.status === 'blocked'
                        ? 'Blocked'
                        : 'Pending'}
                    </span>
                  </div>

                  {task.daysActive > 0 && (
                    <div className="mb-2">
                      <span
                        className={`text-xs font-medium ${
                          task.status === 'overdue'
                            ? 'text-red-600'
                            : task.daysActive > 7
                            ? 'text-orange-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {task.daysActive} days{' '}
                        {task.status === 'overdue' ? 'overdue' : 'active'}
                      </span>
                    </div>
                  )}

                  <div className="flex space-x-1">
                    {task.status === 'pending' && task.assignee === 'Pending' && (
                      <>
                        {(task.name.includes('Assign to RC') ||
                          task.name.includes('Review Completed by RC')) && (
                          <button
                            onClick={(e) =>
                              handleTaskActionLocal(e, task, 'assign_rc')
                            }
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Assign RC
                          </button>
                        )}
                        {(task.name.includes('Products Dept') ||
                          task.name.includes('IAR') ||
                          task.name.includes('RFR')) && (
                          <button
                            onClick={(e) =>
                              handleTaskActionLocal(e, task, 'assign_department')
                            }
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Assign Dept
                          </button>
                        )}
                      </>
                    )}

                    {task.status !== 'completed' &&
                      task.assignee !== 'Pending' && (
                        <button
                          onClick={(e) =>
                            handleTaskActionLocal(e, task, 'update_status')
                          }
                          className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          Update
                        </button>
                      )}

                    {task.status === 'completed' && (
                      <div className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded text-center font-medium">
                        Completed ✓
                      </div>
                    )}

                    {(task.name.includes('IAR') ||
                      expandedStage === 'ingredients') && (
                      <button
                        onClick={(e) =>
                          handleTaskActionLocal(e, task, 'manage_ingredients')
                        }
                        className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        <Package className="w-3 h-3 inline mr-1" />
                        Ingredients
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}