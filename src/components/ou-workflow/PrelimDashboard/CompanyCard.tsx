// components/CompanyCard.tsx
type Props = {
  company: {
    JotFormId: number
    whichCategory?: string
    companyName: string
    companyWebsite?: string
    companyAddress?: string
    companyAddress2?: string
    companyCity?: string
    companyState?: string
    ZipPostalCode?: string
    companyCountry?: string
    status?: string
    submission_date?: string
    numberOfPlants?: number
  }
  onClick: () => void
}

export function CompanyCard({ company, onClick }: Props) {
  const hasAddress =
    company.companyAddress || company.companyCity || company.companyState || company.ZipPostalCode

  const addressParts = [
    company.companyAddress,
    company.companyAddress2,
    company.companyCity,
    company.companyState,
    company.ZipPostalCode,
  ].filter(Boolean)

  const addressLine = addressParts.join(', ')

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      {/* First Row */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-800 truncate">
          {company.companyName}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {company.status && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 whitespace-nowrap">
              {company.status}
            </span>
          )}
          {company.numberOfPlants !== undefined && company.numberOfPlants > 0 && (
            <span className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700 whitespace-nowrap">
              {company.numberOfPlants} {company.numberOfPlants === 1 ? 'Plant' : 'Plants'}
            </span>
          )}
          {company.submission_date && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(company.submission_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="mt-1 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {company.whichCategory && (
            <span className="text-gray-500">{company.whichCategory}</span>
          )}
          {company.companyWebsite && (
            <span className="text-blue-600 truncate">{company.companyWebsite}</span>
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