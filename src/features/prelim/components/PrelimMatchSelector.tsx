import { useState, type ChangeEvent } from 'react'
import { CompanySearchDialog } from './CompanySearchDialog'
import { PlantSearchDialog } from './PlantSearchDialog'
import type { Match } from '../model/resolution'

type Props = {
  isCompany: boolean
  companyName: string
  plantName?: string
  onSearchPlantSelect?: (match: Match) => void
  matches: Match[]
  selectedMatch: Match | null
  isManualCompanyIdEntry: boolean
  isManualPlantIdEntry: boolean
  isCreatedCompany: boolean
  isCreatedPlant: boolean
  onMatchChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onSearchCompanySelect?: (match: Match) => void
  searchDisabled: boolean
  completed?: boolean
  resolvedMatch?: Match | null
}

export function PrelimMatchSelector({
  isCompany,
  companyName,
  plantName = '',
  onSearchPlantSelect,
  matches,
  selectedMatch,
  isManualCompanyIdEntry,
  isManualPlantIdEntry,
  isCreatedCompany,
  isCreatedPlant,
  onMatchChange,
  onSearchCompanySelect,
  searchDisabled,
  completed = false,
  resolvedMatch,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const selectedMatchIsListed =
    selectedMatch != null && matches.some((match) => String(match.Id) === String(selectedMatch.Id))
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[540px] sm:flex-row sm:items-center">
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
        onChange={(event) => {
          if (event.target.value === 'search-company') {
            if (isCompany && onSearchCompanySelect && (!searchDisabled || completed)) setSearchOpen(true)
            return
          }
          if (event.target.value === 'search-plant') {
            if (!isCompany && onSearchPlantSelect && (!searchDisabled || completed)) setSearchOpen(true)
            return
          }
          if (!searchDisabled || completed) onMatchChange(event)
        }}
        className="w-full min-w-0 flex-1 rounded-[7px] border border-gray-200 bg-white px-[14px] py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {matches.map((match, idx) => (
          <option key={String(match.Id)} value={String(match.Id)} disabled={searchDisabled && !completed}>
            Match {idx + 1}: {isCompany ? match.companyName : match.plantName} - #{match.Id} (
            {match.matchRating}%)
            {match.status ? ` - ${match.status}` : ''}
          </option>
        ))}
        {completed && resolvedMatch &&
          !matches.some((match) => String(match.Id) === String(resolvedMatch.Id)) &&
          String(selectedMatch?.Id) !== String(resolvedMatch.Id) && (
            <option value={String(resolvedMatch.Id)}>
              Resolved: {isCompany ? resolvedMatch.companyName : resolvedMatch.plantName} - #{resolvedMatch.Id}
            </option>
          )}
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
        {isCompany && onSearchCompanySelect && (
          <option value="search-company" disabled={searchDisabled && !completed}>
            + Search Company
          </option>
        )}
        {isCompany && <option value="manual-company-id" disabled={searchDisabled && !completed}>+ Add a Company ID to the intake</option>}
        {!isCompany && <option value="manual-plant-id" disabled={searchDisabled && !completed}>+ Add a Plant ID to the intake</option>}
        {!isCompany && onSearchPlantSelect && (
          <option value="search-plant" disabled={searchDisabled && !completed}>
            + Search Plant
          </option>
        )}
        <option value="create-new" disabled={searchDisabled && !completed}>
          + No Match - Create New {isCompany ? 'Company' : 'Plant'}
        </option>
      </select>
      {isCompany && searchOpen && onSearchCompanySelect && (
        <CompanySearchDialog
          companyName={companyName}
          readOnly={completed}
          resolvedMatch={completed ? resolvedMatch : selectedMatch}
          onClose={() => setSearchOpen(false)}
          onSelect={onSearchCompanySelect}
        />
      )}
      {!isCompany && searchOpen && onSearchPlantSelect && (
        <PlantSearchDialog
          plantName={plantName}
          readOnly={completed}
          resolvedMatch={completed ? resolvedMatch : selectedMatch}
          onClose={() => setSearchOpen(false)}
          onSelect={onSearchPlantSelect}
        />
      )}
    </div>
  )
}
