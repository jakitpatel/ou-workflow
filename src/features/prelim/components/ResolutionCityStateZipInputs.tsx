type AddressFields = { city: string; state: string; zip: string }

export function ResolutionCityStateZipInputs({
  city,
  state,
  zip,
  onChange,
}: AddressFields & { onChange: (field: keyof AddressFields, value: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {(
        [
          ['city', 'City', city],
          ['state', 'State', state],
          ['zip', 'ZIP', zip],
        ] as const
      ).map(([field, label, value]) => (
        <label key={field} className="block text-xs font-medium text-gray-700">
          {label}
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(field, event.target.value)}
            className="mt-1 w-full min-w-0 rounded border-[1.5px] border-[#fbbf24] bg-amber-50 px-2.5 py-1.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
      ))}
    </div>
  )
}
