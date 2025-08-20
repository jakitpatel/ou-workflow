import React from 'react'

type Props = {
  currentStage: number
  totalStages: number
}

export function StageProgressBar({ currentStage, totalStages }: Props) {
  const percentage = (currentStage / totalStages) * 100

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>
          Stage {currentStage} of {totalStages}
        </span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
