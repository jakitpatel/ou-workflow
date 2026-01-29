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

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      {/* Company Name */}
      <h3 className="text-lg font-semibold text-gray-800">
        {company.name}
      </h3>

      {/* Category + Status */}
      {(company.category || company.status) && (
        <div className="mt-1 flex gap-2 text-xs text-gray-500">
          {company.category && <span>{company.category}</span>}
          {company.status && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
              {company.status}
            </span>
          )}
        </div>
      )}

      {/* Address */}
      {hasAddress && (
        <p className="mt-2 text-sm text-gray-600 leading-snug">
          {company.street}
          {company.street && company.city && ', '}
          {company.city}
          {company.city && company.state && ', '}
          {company.state} {company.zip}
        </p>
      )}

      {/* Website */}
      {company.website && (
        <p className="mt-1 text-xs text-blue-600 truncate">
          {company.website}
        </p>
      )}

      {/* Submission Date */}
      {company.submissionDate && (
        <p className="mt-2 text-xs text-gray-400">
          Submitted on{' '}
          {new Date(company.submissionDate).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
