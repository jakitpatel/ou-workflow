import { useId } from 'react'

type Props = {
  applicationId?: number
  onApply: (applicationId: number | undefined) => void
}

export function ApplicationIdFilter({ applicationId, onApply }: Props) {
  const inputId = useId()
  return (
    <details className="mt-4 border-t border-gray-200 pt-4" open={applicationId !== undefined || undefined}>
      <summary className="cursor-pointer text-sm font-medium text-blue-700">Advanced filters</summary>
      <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault()
        const input = event.currentTarget.elements.namedItem('applicationId') as HTMLInputElement
        const value = input.value.trim()
        const parsed = value ? Number(value) : undefined
        if (parsed !== undefined && (!Number.isSafeInteger(parsed) || parsed <= 0)) {
          input.setCustomValidity('Enter a positive whole-number Application ID.')
          input.reportValidity()
          return
        }
        onApply(parsed)
      }}>
        <div>
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">Application ID</label>
          <input
            key={applicationId ?? 'all'}
            id={inputId}
            name="applicationId"
            type="number"
            min="1"
            step="1"
            max={Number.MAX_SAFE_INTEGER}
            defaultValue={applicationId ?? ''}
            placeholder="e.g. 3719"
            onInput={(event) => event.currentTarget.setCustomValidity('')}
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Apply</button>
        <button type="button" onClick={(event) => {
          const form = event.currentTarget.form
          if (form) {
            const input = form.elements.namedItem('applicationId') as HTMLInputElement
            input.value = ''
            input.setCustomValidity('')
          }
          onApply(undefined)
        }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Clear</button>
      </form>
    </details>
  )
}
