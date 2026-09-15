import { useState } from 'react'
import { getInvalidEmailAddresses } from '@/shared/email/addressValidation'

export function ScheduleRoundEmailCopies({
  cc = '', bcc = '', readOnly, onChange,
}: {
  cc?: string
  bcc?: string
  readOnly?: boolean
  onChange: (field: 'cc' | 'bcc', value: string) => void
}) {
  const [showCopies, setShowCopies] = useState(false)
  return (
    <div className="space-y-1.5">
      <div className="text-right">
        <button type="button" aria-expanded={showCopies}
          onClick={() => setShowCopies(!showCopies)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800">
          {showCopies ? 'Hide Cc/Bcc' : 'Show Cc/Bcc'}
        </button>
      </div>
      {showCopies && (['cc', 'bcc'] as const).map((field) => {
        const value = field === 'cc' ? cc : bcc
        const label = field === 'cc' ? 'Cc' : 'Bcc'
        const invalid = getInvalidEmailAddresses(value)
        return (
          <div key={field}>
            <label className="flex items-center gap-2 text-xs">
              <span className="w-12 shrink-0 font-medium text-blue-500">{label}</span>
              <input type="text" aria-label={`Email ${label}`} value={value}
                onChange={(event) => onChange(field, event.target.value)} readOnly={readOnly}
                placeholder="Separate emails with commas" aria-invalid={invalid.length > 0}
                className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-blue-900 outline-none focus:ring-1 focus:ring-blue-400" />
            </label>
            {invalid.length > 0 && <p className="mt-1 text-xs text-red-600">Invalid email: {invalid.join(', ')}</p>}
          </div>
        )
      })}
    </div>
  )
}
