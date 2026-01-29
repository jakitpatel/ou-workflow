type Props = {
  results: any[]
  onSelect: (companyId: number) => void
  selectedCompanyId?: number | null
}

export function VectorResultsTable({
  results,
  onSelect,
  selectedCompanyId,
}: Props) {
  if (!Array.isArray(results) || results.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No matches found
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-100 border-b">
          <tr>
            <th className="text-left px-3 py-2">Company</th>
            <th className="text-left px-3 py-2">Category</th>
            <th className="text-right px-3 py-2">Match</th>
          </tr>
        </thead>

        <tbody>
          {results.map((row) => {
            const isSelected = row.CompanyID === selectedCompanyId

            return (
              <tr
                key={row.CompanyID}
                onClick={() => onSelect(row.CompanyID)}
                className={`cursor-pointer border-b hover:bg-blue-50 ${
                  isSelected ? 'bg-blue-100' : ''
                }`}
              >
                {/* Company + extra info */}
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800">
                    {row.name}
                  </div>

                  {/* 🔹 Extra info (small + muted) */}
                  <div className="mt-0.5 text-xs text-gray-500 leading-snug">
                    {row.street && (
                      <div>
                        {row.street}
                        {row.city && `, ${row.city}`}
                        {row.state && `, ${row.state}`}
                        {row.zip && ` ${row.zip}`}
                      </div>
                    )}

                    {row.website && (
                      <div className="truncate">
                        <span className="text-gray-400">Website:</span>{' '}
                        <span className="text-blue-600">
                          {row.website}
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Category */}
                <td className="px-3 py-2 align-top">
                  <span className="inline-block rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs">
                    {row.category}
                  </span>
                </td>

                {/* Match */}
                <td className="px-3 py-2 text-right align-top">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      row.match >= 80
                        ? 'bg-green-100 text-green-700'
                        : row.match >= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {row.match}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
