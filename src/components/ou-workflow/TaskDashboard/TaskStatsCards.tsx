import React from 'react'

interface TaskStats {
  total: number
  new: number
  inProgress: number
  overdue: number
  completed: number
}

interface TaskStatsCardsProps {
  stats: TaskStats
}

export const TaskStatsCards: React.FC<TaskStatsCardsProps> = ({ stats }) => {
  return (
    <div className="mt-6 grid grid-cols-5 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
        <div className="text-sm text-blue-700">Total Tasks</div>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="text-2xl font-bold text-yellow-600">{stats.new}</div>
        <div className="text-sm text-yellow-700">New</div>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
        <div className="text-sm text-purple-700">Pending</div>
      </div>
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
        <div className="text-sm text-red-700">Overdue</div>
      </div>
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        <div className="text-sm text-green-700">Completed</div>
      </div>
    </div>
  )
}