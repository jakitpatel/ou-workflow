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

interface StatCard {
  key: keyof ApplicantStats
  label: string
  colorScheme: {
    bg: string
    border: string
    text: string
    labelText: string
  }
}

const statCards: StatCard[] = [
  {
    key: 'new',
    label: 'NEW',
    colorScheme: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-600',
      labelText: 'text-blue-700',
    },
  },
  {
    key: 'inProgress',
    label: 'IN PROCESS',
    colorScheme: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-600',
      labelText: 'text-purple-700',
    },
  },
  {
    key: 'withdrawn',
    label: 'WITHDRAWN',
    colorScheme: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-600',
      labelText: 'text-red-700',
    },
  },
  {
    key: 'completed',
    label: 'COMPLETED',
    colorScheme: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-600',
      labelText: 'text-green-700',
    },
  },
  {
    key: 'others',
    label: 'OTHERS',
    colorScheme: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      labelText: 'text-gray-700',
    },
  },
]

export const PrelimApplicantStatsCards: React.FC<ApplicantStatsCardsProps> = ({ stats }) => {
  return (
    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {statCards.map(({ key, label, colorScheme }) => (
        <div
          key={key}
          className={`${colorScheme.bg} p-3 rounded-lg border ${colorScheme.border} transition-transform hover:scale-105`}
          role="article"
          aria-label={`${label}: ${stats[key]} applicants`}
        >
          <div className={`text-2xl font-bold ${colorScheme.text}`}>
            {stats[key].toLocaleString()}
          </div>
          <div className={`text-sm font-medium ${colorScheme.labelText}`}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}