import React from 'react'
import { StageProgressBar } from './StageProgressBar'
import { Package, Mail, ExternalLink } from 'lucide-react'

type Applicant = {
  id: string
  companyName: string
  contact: string
  email: string
  priority: 'high' | 'medium' | 'low'
  status: 'in-progress' | 'approved' | 'rejected' | 'pending'
  currentStage: number
  totalStages: number
  lastUpdated: string
}

type Props = {
  applicant: Applicant
  setShowIngredientsManager: (val: boolean) => void
  setSelectedIngredientApp: (val: Applicant) => void
}

export function ApplicantCard({ applicant, setShowIngredientsManager, setSelectedIngredientApp }: Props) {
  const statusColors: Record<string, string> = {
    'in-progress': 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-800',
  }

  const priorityColors: Record<string, string> = {
    high: 'text-red-600 font-semibold',
    medium: 'text-yellow-600',
    low: 'text-green-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{applicant.companyName}</h3>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[applicant.status]}`}
        >
          {applicant.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
        <div>
          <span className="font-medium">Contact:</span> {applicant.contact}
        </div>
        <div>
          <span className="font-medium">Email:</span> {applicant.email}
        </div>
        <div>
          <span className="font-medium">Priority:</span>{' '}
          <span className={priorityColors[applicant.priority]}>{applicant.priority}</span>
        </div>
        <div>
          <span className="font-medium">Updated:</span> {applicant.lastUpdated}
        </div>
      </div>

      <StageProgressBar currentStage={applicant.currentStage} totalStages={applicant.totalStages} />

      <div className="flex justify-end space-x-3 mt-4">
        <button
          onClick={() => {
            setSelectedIngredientApp(applicant)
            setShowIngredientsManager(true)
          }}
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
        >
          <Package className="w-4 h-4" />
          <span>Ingredients</span>
        </button>

        <button className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
          <Mail className="w-4 h-4" />
          <span>Email</span>
        </button>

        <button className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
          <ExternalLink className="w-4 h-4" />
          <span>View</span>
        </button>
      </div>
    </div>
  )
}
