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
  handleTaskAction?: (e: React.MouseEvent, task: Task, action: string, applicantId: string) => void
}

export function StageProgressBar({ applicant, showDetails = false, handleTaskAction }: Props) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null)

  const getStageColor = (stage: Stage) => {
    switch (stage?.status) {
      case 'completed':
        return 'bg-green-500'
      case 'in_progress':
        return 'bg-blue-500'
      case 'overdue':
        return 'bg-red-500'
      case 'blocked':
        return 'bg-gray-400'
      default:
        return 'bg-gray-300'
    }
  }

  const handleStageClick = (stageName: string) => {
    if (showDetails) {
      setExpandedStage(expandedStage === stageName ? null : stageName)
    }
  }

  const handleTaskActionLocal = (
    e: React.MouseEvent,
    task: Task,
    action: string
  ) => {
    e.stopPropagation()
    e.preventDefault()
    if (handleTaskAction) {
      handleTaskAction(e, task, action, applicant.id)
    }
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

  return (
    <div className="mt-3">
      {/* Stage Bar */}
      <div className="space-y-3">
        <div className="flex space-x-1 h-10 rounded-lg overflow-hidden border border-gray-200">
          {stageOrder.map((stage) => (
            <div
              key={stage.key}
              className={`flex-1 ${getStageColor(applicant.stages[stage.key])} ${
                showDetails ? 'cursor-pointer hover:opacity-80' : ''
              } transition-opacity relative ${
                showDetails && expandedStage === stage.key
                  ? 'ring-2 ring-blue-500 ring-inset'
                  : ''
              } flex items-center justify-center`}
              onClick={() => handleStageClick(stage.key)}
              title={`${stage.name} Stage`}
            >
              <span className="text-white text-sm font-bold text-center px-1">
                {stage.name}
              </span>
              {showDetails && expandedStage === stage.key && (
                <div className="absolute inset-0 bg-white bg-opacity-30 border-2 border-blue-400 rounded-sm"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Stage Details */}
      {showDetails && expandedStage && applicant.stages[expandedStage] && (
        <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-900 capitalize text-xl">
              {expandedStage} Stage Tasks
            </h4>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  applicant.stages[expandedStage].status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : applicant.stages[expandedStage].status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : applicant.stages[expandedStage].status === 'overdue'
                    ? 'bg-red-100 text-red-800'
                    : applicant.stages[expandedStage].status === 'blocked'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {applicant.stages[expandedStage].progress}% Complete
              </span>
              <button
                onClick={() => setExpandedStage(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Task Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem'
            }}
          >
            {applicant.stages[expandedStage].tasks.map((task, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-shadow ${
                  task.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : task.status === 'in_progress'
                    ? 'border-blue-200 bg-blue-50'
                    : task.status === 'overdue'
                    ? 'border-red-200 bg-red-50'
                    : task.status === 'blocked'
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-2">
                    <span
                      className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ${
                        task.status === 'completed'
                          ? 'bg-green-500'
                          : task.status === 'in_progress'
                          ? 'bg-blue-500'
                          : task.status === 'overdue'
                          ? 'bg-red-500'
                          : task.status === 'blocked'
                          ? 'bg-gray-400'
                          : 'bg-yellow-500'
                      }`}
                    ></span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm leading-tight">
                        {task.name}
                      </h5>
                      {task.required && (
                        <span className="inline-block text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`font-medium ${
                        task.status === 'completed'
                          ? 'text-green-600'
                          : task.status === 'in_progress'
                          ? 'text-blue-600'
                          : task.status === 'overdue'
                          ? 'text-red-600'
                          : task.status === 'blocked'
                          ? 'text-gray-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Assignee */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Assignee:</span>
                    <span className="font-medium text-gray-900 text-right">
                      {task.assignee}
                    </span>
                  </div>
                </div>

                {/* Duration */}
                {task.daysActive > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span
                        className={`font-medium ${
                          task.status === 'overdue'
                            ? 'text-red-600'
                            : task.daysActive > 7
                            ? 'text-orange-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {task.daysActive} days{' '}
                        {task.status === 'overdue' ? 'OVERDUE' : 'active'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex space-x-2">
                    {task.status === 'pending' && task.assignee === 'Pending' && (
                      <>
                        {(task.name.includes('Assign to RC') ||
                          task.name.includes('Review Completed by RC')) && (
                          <button
                            onClick={(e) =>
                              handleTaskActionLocal(e, task, 'assign_rc')
                            }
                            className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
                            className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
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
                          className="flex-1 px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          Update Status
                        </button>
                      )}
                    {task.status === 'completed' && (
                      <div className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded text-center font-medium">
                        Completed ✓
                      </div>
                    )}
                    {(task.name.includes('IAR') ||
                      expandedStage === 'ingredients') && (
                      <button
                        onClick={(e) =>
                          handleTaskActionLocal(e, task, 'manage_ingredients')
                        }
                        className="flex-1 px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        <Package className="w-3 h-3 inline mr-1" />
                        Ingredients
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Progress Summary */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            <div className="flex justify-between items-center text-sm bg-white rounded-lg p-4 border">
              <span className="text-gray-600 font-medium">
                Progress:{' '}
                {
                  applicant.stages[expandedStage].tasks.filter(
                    (t) => t.status === 'completed'
                  ).length
                }{' '}
                of {applicant.stages[expandedStage].tasks.length} tasks completed
              </span>
              <span className="text-gray-600 font-medium">
                {
                  applicant.stages[expandedStage].tasks.filter(
                    (t) => t.required && t.status !== 'completed'
                  ).length
                }{' '}
                required tasks remaining
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}