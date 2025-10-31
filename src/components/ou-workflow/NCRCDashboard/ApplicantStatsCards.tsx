import React from 'react'

interface ApplicantStats {
  others: number
  new: number
  inProgress: number
  withdrawn: number
  completed: number
}

interface ApplicantStatsCardsProps {
  stats: ApplicantStats
}

export const ApplicantStatsCards: React.FC<ApplicantStatsCardsProps> = ({ stats }) => {
  return (
    <div className="mt-6 grid grid-cols-5 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
        <div className="text-sm text-blue-700">NEW</div>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
        <div className="text-sm text-purple-700">INPROCESS</div>
      </div>
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="text-2xl font-bold text-red-600">{stats.withdrawn}</div>
        <div className="text-sm text-red-700">WITHDRAWN</div>
      </div>
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        <div className="text-sm text-green-700">CERTIFIED</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="text-2xl font-bold text-gray-600">{stats.others}</div>
        <div className="text-sm text-gray-700">OTHERS</div>
      </div>
    </div>
  )
}