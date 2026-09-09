type Props = {
  checked: boolean
  disabled: boolean
  databaseWebContact?: string
  onChange: (checked: boolean) => void
}

export function PrelimCompanyWebContactRow({ checked, disabled, databaseWebContact, onChange }: Props) {
  const isDatabaseWebContact = ['y', 'yes', '1', 'true'].includes(
    (databaseWebContact ?? '').trim().toLowerCase(),
  )
  return (
    <div className="grid grid-cols-12 gap-4 border-b border-gray-100 px-4 py-[14px] transition-colors hover:bg-gray-50">
      <div className="col-span-3 bg-[#fafbfc] text-sm font-medium text-gray-700">Web Contact</div>
      <div className="col-span-4 min-w-0 text-sm text-gray-900">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-indigo-600 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
          />
          <span>Create this person as Web Contact</span>
        </label>
      </div>
      <div className="col-span-4 min-w-0 text-[15px] text-gray-600">
        {isDatabaseWebContact ? 'Web Contact' : <span className="italic text-gray-400">Not on file</span>}
      </div>
      <div className="col-span-1" />
    </div>
  )
}
