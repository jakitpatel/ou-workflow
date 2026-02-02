// components/CompanyCard.tsx
type Props = {
  company: {
    PreliminaryApplicationID: number
    category?: string
    name: string
    website?: string
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    status?: string
    submissionDate?: string
  }
  onClick: () => void
}

export function CompanyCard({ company, onClick }: Props) {
  const hasAddress =
    company.street || company.city || company.state || company.zip

  const addressLine = [
    company.street,
    company.city,
    company.state,
    company.zip,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      {/* First Row */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-800 truncate">
          {company.name}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {company.status && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 whitespace-nowrap">
              {company.status}
            </span>
          )}
          {company.submissionDate && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(company.submissionDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="mt-1 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {company.category && (
            <span className="text-gray-500">{company.category}</span>
          )}
          {company.website && (
            <span className="text-blue-600 truncate">{company.website}</span>
          )}
        </div>
        {hasAddress && (
          <span className="text-gray-600 truncate flex-shrink-0 max-w-xs">
            {addressLine}
          </span>
        )}
      </div>
    </div>
  )
}