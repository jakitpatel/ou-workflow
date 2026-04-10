import { AlertTriangle, ListTodo, Sparkles } from 'lucide-react'
import type { Applicant } from '@/types/application'

export function ApplicantAIAssistantPanel({ applicant }: { applicant: Applicant }) {
  const todoItems = applicant?.aiSuggestions?.todoItems ?? []

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Sparkles className="w-4 h-4 text-blue-600 mr-2" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-blue-900">AI Assistant</h4>
          <span className="text-xs text-blue-600 ml-2 bg-blue-100 px-2 py-1 rounded">
            Powered by Gemini
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {todoItems.length > 0 && (
          <div>
            <div className="flex items-center mb-2">
              <ListTodo className="w-3 h-3 text-blue-600 mr-1" aria-hidden="true" />
              <span className="text-xs font-medium text-blue-800">Smart Actions</span>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              {todoItems.slice(0, 2).map((item: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {applicant?.aiSuggestions?.criticalPath && (
          <div>
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-3 h-3 text-orange-600 mr-1" aria-hidden="true" />
              <span className="text-xs font-medium text-orange-800">Critical Path</span>
            </div>
            <p className="text-xs text-gray-700">{applicant.aiSuggestions.criticalPath}</p>
          </div>
        )}
      </div>
    </div>
  )
}
