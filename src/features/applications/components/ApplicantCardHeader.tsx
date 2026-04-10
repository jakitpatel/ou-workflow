import { AlertTriangle, Clock } from 'lucide-react'
import type { Applicant } from '@/types/application'

type Props = {
  applicant: Applicant
  isCritical: boolean
  onViewApplicationDetails: (id?: string | number) => void
  priority: { label: string; color: string; textColor: string }
}

export function ApplicantCardHeader({
  applicant,
  isCritical,
  onViewApplicationDetails,
  priority,
}: Props) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <button
            onClick={() => onViewApplicationDetails(applicant.applicationId)}
            className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            title={`Click to view application details for ${applicant.company}`}
            aria-label={`View application details for ${applicant.company}`}
          >
            {applicant.company}
          </button>
          {applicant.applicationId != null && (
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 flex-shrink-0">
              AppId: {applicant.applicationId}
            </span>
          )}
        </div>

        <p className="text-gray-600 text-sm">
          {applicant.plant} &bull; {applicant.region}
        </p>
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color} ${priority.textColor}`}
            aria-label={`Priority: ${priority.label}`}
          >
            {priority.label}
          </span>
          {isCritical && (
            <div className="flex items-center text-red-600" role="alert" aria-label="Critical status">
              <AlertTriangle className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="text-xs font-medium">CRITICAL</span>
            </div>
          )}

          <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded">
            <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
            <span className="text-sm font-medium">{applicant.daysInProcess} days elapsed</span>
          </div>

          {applicant?.daysOverdue > 0 && (
            <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded">
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="text-sm font-medium">{applicant.daysOverdue} days overdue</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
