import { X } from 'lucide-react'
import type { CompanyData, Match, PlantData } from '@/features/prelim/model/resolution'

type Props = {
  isCompany: boolean
  type: 'company' | 'plant'
  companyData: CompanyData
  plantData: PlantData
  selectedMatch: Match | null
  isCreatedMatch: boolean
  bestMatch: Match | null
  confirmedMatch: Match | null
  onClose: () => void
}

export function PrelimResolutionDrawerHeader({
  isCompany,
  type,
  companyData,
  plantData,
  selectedMatch,
  isCreatedMatch,
  bestMatch,
  confirmedMatch,
  onClose,
}: Props) {
  const headerBgClass = isCompany ? 'bg-[#1e1e2e]' : 'bg-[#312e81]'

  return (
    <div className={`${headerBgClass} text-white px-6 py-[18px]`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[19px] font-semibold leading-6">
            {isCompany ? 'Resolve Company' : 'Resolve Plant'}
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {isCompany ? companyData.companyName : plantData.plantName} - Match {type} to
            existing or create new
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
              WF 26-00415
            </span>
            {isCompany ? (
              <>
                <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                  {isCreatedMatch ? 'Created' : 'Best match'}: Co #
                  {isCreatedMatch ? selectedMatch?.Id || 'N/A' : bestMatch?.Id || 'N/A'}
                </span>
                {!isCreatedMatch && confirmedMatch && (
                  <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                    Selected: Co #{confirmedMatch.Id}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                  Co #{selectedMatch?.OWNSID || '182456'}
                </span>
                <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                  {isCreatedMatch ? 'Created' : 'Best match'}: Plant#
                  {isCreatedMatch ? selectedMatch?.Id || 'N/A' : bestMatch?.Id || 'N/A'}
                </span>
                {!isCreatedMatch && confirmedMatch && (
                  <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                    Selected: Plant#{confirmedMatch.Id}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded border border-white/20 bg-white/15 px-3 py-1 text-[12.5px] font-medium text-white/90">
              Prior Kosher: No
            </span>
            <span className="inline-flex items-center rounded border border-white/20 bg-white/15 px-3 py-1 text-[12.5px] font-medium text-white/90">
              OU Certified: No
            </span>
            <span className="inline-flex items-center rounded border border-white/20 bg-white/15 px-3 py-1 text-[12.5px] font-medium text-white/90">
              Production: Own Brand
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
