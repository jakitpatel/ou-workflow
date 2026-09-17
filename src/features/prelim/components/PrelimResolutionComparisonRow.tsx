import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ComparisonStatus } from '@/features/prelim/model/resolution'

export function ComparisonRow({
  field,
  appValue,
  dbValue,
  status,
  editable = false,
  onAppValueChange,
  editor,
}: {
  field: string
  appValue: string
  dbValue: string
  status: ComparisonStatus
  editable?: boolean
  onAppValueChange?: (value: string) => void
  editor?: ReactNode
}) {
  return (
    <div className="grid grid-cols-12 gap-4 border-b border-gray-100 px-4 py-[14px] transition-colors hover:bg-gray-50">
      <div className="col-span-3 bg-[#fafbfc] text-sm font-medium text-gray-700">{field}</div>
      <div className="col-span-4 min-w-0 break-words text-[15px] text-gray-900 [overflow-wrap:anywhere]">
        {editable && editor ? (
          editor
        ) : editable && onAppValueChange ? (
          <input
            value={appValue}
            onChange={(e) => onAppValueChange(e.target.value)}
            className="w-full min-w-0 rounded border-[1.5px] border-[#fbbf24] bg-amber-50 px-2.5 py-1.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        ) : (
          appValue || <span className="text-gray-400 italic">Empty</span>
        )}
      </div>
      <div className="col-span-4 min-w-0 break-words text-[15px] text-gray-600 [overflow-wrap:anywhere]">
        {dbValue === 'Not on file' ? (
          <span className="italic text-gray-400">{dbValue}</span>
        ) : (
          dbValue || <span className="text-gray-400 italic">Empty</span>
        )}
      </div>
      <div className="col-span-1 flex items-center justify-center">
        {status === 'match' && (
          <Check className="h-5 w-5 text-green-600" aria-label="Values match" />
        )}
      </div>
    </div>
  )
}
