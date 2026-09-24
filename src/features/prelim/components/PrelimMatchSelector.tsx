import { useState, type ChangeEvent } from 'react'
import { Search } from 'lucide-react'
import { CompanySearchDialog } from './CompanySearchDialog'
import type { Match } from '../model/resolution'

type Props = {
  isCompany: boolean
  companyName: string
  matches: Match[]
  selectedMatch: Match | null
  isManualCompanyIdEntry: boolean
  isManualPlantIdEntry: boolean
  isCreatedCompany: boolean
  isCreatedPlant: boolean
  onMatchChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onSearchCompanySelect?: (match: Match) => void
  searchDisabled: boolean
}

export function PrelimMatchSelector({
  isCompany,
  companyName,
  matches,
  selectedMatch,
  isManualCompanyIdEntry,
  isManualPlantIdEntry,
  isCreatedCompany,
  isCreatedPlant,
  onMatchChange,
  onSearchCompanySelect,
  searchDisabled,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const selectedMatchIsListed =
    selectedMatch != null && matches.some((match) => String(match.Id) === String(selectedMatch.Id))
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[540px] sm:flex-row sm:items-center">
      {isCompany && onSearchCompanySelect && (
        <button
          type="button"
          disabled={searchDisabled}
          onClick={() => setSearchOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          <Search className="h-4 w-4" /> Search Company
        </button>
      )}
      <select
        value={
          isManualCompanyIdEntry || isManualPlantIdEntry
            ? isCompany
              ? 'manual-company-id'
              : 'manual-plant-id'
            : selectedMatch
              ? String(selectedMatch.Id)
              : 'create-new'
        }
        aria-label="Matching list"
        onChange={onMatchChange}
        className="w-full min-w-0 flex-1 rounded-[7px] border border-gray-200 bg-white px-[14px] py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {matches.map((match, idx) => (
          <option key={String(match.Id)} value={String(match.Id)}>
            Match {idx + 1}: {isCompany ? match.companyName : match.plantName} - #{match.Id} (
            {match.matchRating}%)
            {match.status ? ` - ${match.status}` : ''}
          </option>
        ))}
        {selectedMatch &&
          !selectedMatchIsListed &&
          !isManualCompanyIdEntry &&
          !isManualPlantIdEntry && (
            <option value={String(selectedMatch.Id)}>
              {(isCompany ? isCreatedCompany : isCreatedPlant) ? 'Created' : 'Selected'}:{' '}
              {isCompany ? selectedMatch.companyName : selectedMatch.plantName} - #
              {selectedMatch.Id}
            </option>
          )}
        {isCompany && <option value="manual-company-id">+ Add a Company ID to the intake</option>}
        {!isCompany && <option value="manual-plant-id">+ Add a Plant ID to the intake</option>}
        <option value="create-new">
          + No Match - Create New {isCompany ? 'Company' : 'Plant'}
        </option>
      </select>
      {isCompany && searchOpen && onSearchCompanySelect && (
        <CompanySearchDialog
          companyName={companyName}
          onClose={() => setSearchOpen(false)}
          onSelect={onSearchCompanySelect}
        />
      )}
    </div>
  )
}
