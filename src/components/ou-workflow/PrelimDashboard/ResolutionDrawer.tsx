import { useState, useEffect } from 'react'
import { X, Check, Plus, Edit } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getCompanyDetailsFromKASH, getPlantDetailsFromKASH } from '@/api'
import { useUser } from '@/context/UserContext'
import type {
  KashrusAddress,
  KashrusCompanyDetail,
  KashrusPlantDetail,
  PlantFromApplicationContact,
} from '@/types/application'

type RawKashrusCompanyAddress = {
  TYPE?: string
  STREET1?: string
  STREET2?: string
  STREET3?: string
  CITY?: string
  STATE?: string
  ZIP?: string
  COUNTRY?: string
}

type RawKashrusCompanyDetails = {
  NAME?: string
}

type RawKashrusCompanyContact = PlantFromApplicationContact & {
  FirstName?: string
  LastName?: string
  EMail?: string
  Cell?: string
  Voice?: string
  Title?: string
  companytitle?: string
  PrimaryCT?: string
  BillingCT?: string
}

type CompanyDbRecord = KashrusCompanyDetail & {
  companyAddresses?: RawKashrusCompanyAddress[]
  companyContacts?: RawKashrusCompanyContact[]
  companytdetails?: RawKashrusCompanyDetails[]
}

type RawKashrusPlantAddress = {
  TYPE?: string
  STREET1?: string
  STREET2?: string
  STREET3?: string
  CITY?: string
  STATE?: string
  ZIP?: string
  COUNTRY?: string
}

type RawKashrusPlantDetails = {
  NAME?: string
}

type RawKashrusPlantContact = PlantFromApplicationContact & {
  FirstName?: string
  LastName?: string
  EMail?: string
  Cell?: string
  Voice?: string
  Title?: string
  companytitle?: string
  PrimaryCT?: string
  BillingCT?: string
}

type PlantDbRecord = KashrusPlantDetail & {
  plantAddresses?: RawKashrusPlantAddress[]
  plantContacts?: RawKashrusPlantContact[]
  plantdetails?: RawKashrusPlantDetails[]
}

type CompanyData = {
  companyName: string
  companyAddress: string
  companyAddress2?: string
  companyCity: string
  companyState?: string
  ZipPostalCode?: string
  companyCountry: string
  companyPhone?: string
  companyWebsite?: string
  numberOfPlants?: number
  whichCategory?: string
  primaryContact?: {
    name?: string
    title?: string
    phone?: string
    email?: string
  }
  billingContact?: {
    name?: string
    title?: string
    phone?: string
    email?: string
  }
}

type PlantData = {
  plantName: string
  plantAddress: string
  plantCity: string
  plantState?: string
  plantZip?: string
  plantCountry: string
  plantNumber?: number
  processDescription?: string
  primaryContact?: {
    name?: string
    title?: string
    phone?: string
    email?: string
  }
  marketingContact?: {
    name?: string
    title?: string
    phone?: string
    email?: string
  }
}

type Match = {
  Id: string | number
  companyName?: string
  plantName?: string
  Address: string
  City?: string
  Country?: string
  matchRating?: number
  matchReason?: string
  OWNSID?: string | number
  WFID?: string | number
  PlantID?: string | number
}

type Props = {
  isOpen: boolean
  onClose: () => void
  type: 'company' | 'plant'
  data: CompanyData | PlantData
  matches: Match[]
  onAssign: (match: Match) => void
  selectedId?: string | number
  isActionable?: boolean
}

type ComparisonStatus = 'match' | 'mismatch' | 'not-on-file' | 'empty'

export function ResolutionDrawer({
  isOpen,
  onClose,
  type,
  data,
  matches,
  onAssign,
  selectedId,
  isActionable = true,
}: Props) {
  const { token } = useUser()
  const selectedIdNormalized = selectedId != null ? String(selectedId) : undefined
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(
    matches.find((m) => String(m.Id) === selectedIdNormalized) ||
      (matches.length > 0 ? matches[0] : null)
  )

  useEffect(() => {
    const nextMatch =
      matches.find((m) => String(m.Id) === selectedIdNormalized) ??
      (matches.length > 0 ? matches[0] : null)
    setSelectedMatch(nextMatch)
  }, [matches, selectedIdNormalized])

  /* ================= Scroll Lock (OPTIONAL FIX #1) ================= */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const isCompany = type === 'company'
  const companyData = data as CompanyData
  const plantData = data as PlantData
  const headerBgClass = isCompany ? 'bg-[#1e1e2e]' : 'bg-[#312e81]'
  const selectedMatchId = selectedMatch?.Id

  const { data: companyDbResponse } = useQuery({
    queryKey: ['kashrus-company-details', selectedMatchId, token],
    queryFn: () =>
      getCompanyDetailsFromKASH({
        companyID: selectedMatchId as string | number,
        token: token ?? undefined,
      }),
    enabled: isOpen && isCompany && selectedMatchId != null,
    //staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const { data: plantDbResponse } = useQuery({
    queryKey: ['kashrus-plant-details', selectedMatchId, token],
    queryFn: () =>
      getPlantDetailsFromKASH({
        PlantId: selectedMatchId as string | number,
        token: token ?? undefined,
      }),
    enabled: isOpen && !isCompany && selectedMatchId != null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const companyDb: CompanyDbRecord | undefined = getCompanyDbRecord(companyDbResponse)
  const plantDb: PlantDbRecord | undefined = getPlantDbRecord(plantDbResponse)

  const dbCompanyAddress = getPhysicalAddress(companyDb?.companyAddresses)
  const dbPlantAddress = getPhysicalAddress(plantDb?.plantAddresses)

  const dbCompanyPrimaryContact = getPrimaryContact(companyDb?.companyContacts)
  const dbCompanyBillingContact = getBillingContact(companyDb?.companyContacts)
  const dbPlantPrimaryContact = getPrimaryContact(plantDb?.plantContacts)
  const dbPlantMarketingContact = getBillingContact(plantDb?.plantContacts)

  const handleMatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const matchId = e.target.value
    if (matchId === 'create-new') {
      setSelectedMatch(null)
    } else {
      const match = matches.find((m) => String(m.Id) === matchId)
      setSelectedMatch(match || null)
    }
  }

  const handleConfirmMatch = () => {
    if (!isActionable) return
    if (selectedMatch) {
      onAssign(selectedMatch)
      onClose()
    }
  }

  const handleCreateNew = () => {
    if (!isActionable) return
    setSelectedMatch(null)
  }

  const handleConfirmEdit = () => {
    if (!isActionable) return
    if (selectedMatch) {
      onAssign(selectedMatch)
    }
  }

  const getComparisonStatus = (
    appValue: string | undefined,
    dbValue: string | undefined
  ): ComparisonStatus => {
    if (!appValue && !dbValue) return 'empty'
    if (!dbValue || dbValue === 'Not on file') return 'not-on-file'
    if (!appValue) return 'empty'

    const normalize = (str: string) =>
      str.toLowerCase().trim().replace(/[^\w\s]/g, '')
    return normalize(appValue) === normalize(dbValue)
      ? 'match'
      : 'mismatch'
  }

  return (
    <>
      {/* ================= Backdrop (FIX) ================= */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />

      {/* ================= Drawer ================= */}
      <div
        className="
          fixed right-0 top-0 h-full w-full max-w-[780px]
          bg-white shadow-2xl z-50
          translate-x-0
          transition-transform duration-300 ease-in-out
          overflow-hidden flex flex-col
        "
      >
        {/* Header */}
        <div className={`${headerBgClass} text-white px-6 py-[18px]`}>
          <div className="flex items-start justify-between">
            <div>
                <h2 className="text-[19px] font-semibold leading-6">
                  {isCompany ? 'Resolve Company' : 'Resolve Plant'}
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  {isCompany
                    ? companyData.companyName
                    : plantData.plantName}{' '}
                  - Match {type} to existing or create new
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                    WF 26-00415
                  </span>
                  {isCompany ? (
                    <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                      Best match: Co #{selectedMatch?.Id || 'N/A'}
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                        Co #{selectedMatch?.OWNSID || '182456'}
                      </span>
                      <span className="inline-flex items-center rounded-[5px] border border-white/20 bg-white/15 px-[10px] py-1 text-xs font-semibold text-white/90">
                        Best match: Pl #{selectedMatch?.Id || 'N/A'}
                      </span>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white px-7 py-7">
                    <div className="sticky top-0 z-10 -mt-3 mb-4 flex flex-col gap-3 border-b border-gray-100 bg-white py-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold text-[#1e1e2e]">Field Comparison</h3>
                    <select
                      value={selectedMatch ? String(selectedMatch.Id) : 'create-new'}
                      onChange={handleMatchChange}
                      className="w-full min-w-[220px] rounded-[7px] border border-gray-200 bg-white px-[14px] py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-auto"
                    >
                      {matches.map((match, idx) => (
                        <option key={String(match.Id)} value={String(match.Id)}>
                          Match {idx + 1}:{' '}
                          {isCompany ? match.companyName : match.plantName} - #
                          {match.Id} ({match.matchRating}%)
                        </option>
                      ))}
                      <option value="create-new">
                        + No Match - Create New {isCompany ? 'Company' : 'Plant'}
                      </option>
                    </select>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 mb-2 border-b border-gray-200 bg-gray-50 px-4 py-[14px] text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <div className="col-span-3">Field</div>
                    <div className="col-span-4">Submitted (Application)</div>
                    <div className="col-span-4">Database (Kashrus)</div>
                    <div className="col-span-1 text-center">Status</div>
                    </div>

                    {isCompany ? (
                    <>
                        {/* Company Information Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="border-y border-slate-200 bg-slate-100 px-4 py-2">
                            <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">Company Information</h4>
                        </div>
                        
                        <ComparisonRow
                            field="Company Name"
                            appValue={companyData.companyName}
                            dbValue={getCompanyName(companyDb) || selectedMatch?.companyName || 'Not on file'}
                            status={getComparisonStatus(companyData.companyName, getCompanyName(companyDb) || selectedMatch?.companyName)}
                        />
                        
                        <ComparisonRow
                            field="DBA / Trade Name"
                            appValue={companyData.companyName}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Street Address"
                            appValue={formatApplicationStreet(companyData.companyAddress, companyData.companyAddress2)}
                            dbValue={formatAddressStreet(dbCompanyAddress) || selectedMatch?.Address || 'Not on file'}
                            status={getComparisonStatus(
                              formatApplicationStreet(companyData.companyAddress, companyData.companyAddress2),
                              formatAddressStreet(dbCompanyAddress) || selectedMatch?.Address
                            )}
                        />
                        
                        <ComparisonRow
                            field="City / State / ZIP"
                            appValue={formatApplicationCityStateZip(
                              companyData.companyCity,
                              companyData.companyState,
                              companyData.ZipPostalCode
                            )}
                            dbValue={formatAddressCityStateZip(dbCompanyAddress) || selectedMatch?.City || 'Not on file'}
                            status={getComparisonStatus(companyData.companyCity, dbCompanyAddress?.city || selectedMatch?.City)}
                        />
                        
                        <ComparisonRow
                            field="Website"
                            appValue={companyData.companyWebsite || ''}
                            dbValue={companyDb?.companyWebsite || 'Not on file'}
                            status={getComparisonStatus(companyData.companyWebsite, companyDb?.companyWebsite)}
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
                          isActionable={isActionable}
                        />
                        </div>

                        {/* Company Contact Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="border-y border-slate-200 bg-slate-100 px-4 py-2 flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-blue-800">
                            PRIMARY
                            </span>
                            <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">Company Contact</h4>
                        </div>
                        
                        <ComparisonRow
                            field="Name"
                            appValue={companyData.primaryContact?.name || ''}
                            dbValue={formatContactName(dbCompanyPrimaryContact) || 'Not on file'}
                            status={getComparisonStatus(companyData.primaryContact?.name, formatContactName(dbCompanyPrimaryContact))}
                        />

                        <ComparisonRow
                            field="Title"
                            appValue={companyData.primaryContact?.title || ''}
                            dbValue={pickFirstNonEmpty(dbCompanyPrimaryContact?.companytitle, dbCompanyPrimaryContact?.Title) || 'Not on file'}
                            status={getComparisonStatus(
                              companyData.primaryContact?.title,
                              pickFirstNonEmpty(dbCompanyPrimaryContact?.companytitle, dbCompanyPrimaryContact?.Title)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={companyData.primaryContact?.phone || ''}
                            dbValue={pickFirstNonEmpty(dbCompanyPrimaryContact?.Cell, dbCompanyPrimaryContact?.Voice) || 'Not on file'}
                            status={getComparisonStatus(
                              companyData.primaryContact?.phone,
                              pickFirstNonEmpty(dbCompanyPrimaryContact?.Cell, dbCompanyPrimaryContact?.Voice)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={companyData.primaryContact?.email || ''}
                            dbValue={pickFirstNonEmpty(dbCompanyPrimaryContact?.EMail) || 'Not on file'}
                            status={getComparisonStatus(companyData.primaryContact?.email, pickFirstNonEmpty(dbCompanyPrimaryContact?.EMail))}
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
                          isActionable={isActionable}
                        />
                        </div>

                        {/* Billing Contact Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="border-y border-slate-200 bg-slate-100 px-4 py-2 flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-amber-800">
                            BILLING
                            </span>
                            <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">Contact</h4>
                        </div>
                        
                        <ComparisonRow
                            field="Name"
                            appValue={companyData.billingContact?.name || ''}
                            dbValue={formatContactName(dbCompanyBillingContact) || 'Not on file'}
                            status={getComparisonStatus(companyData.billingContact?.name, formatContactName(dbCompanyBillingContact))}
                        />

                        <ComparisonRow
                            field="Title"
                            appValue={companyData.billingContact?.title || ''}
                            dbValue={pickFirstNonEmpty(dbCompanyBillingContact?.companytitle, dbCompanyBillingContact?.Title) || 'Not on file'}
                            status={getComparisonStatus(
                              companyData.billingContact?.title,
                              pickFirstNonEmpty(dbCompanyBillingContact?.companytitle, dbCompanyBillingContact?.Title)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={companyData.billingContact?.phone || ''}
                            dbValue={pickFirstNonEmpty(dbCompanyBillingContact?.Cell, dbCompanyBillingContact?.Voice) || 'Not on file'}
                            status={getComparisonStatus(
                              companyData.billingContact?.phone,
                              pickFirstNonEmpty(dbCompanyBillingContact?.Cell, dbCompanyBillingContact?.Voice)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={companyData.billingContact?.email || ''}
                            dbValue={pickFirstNonEmpty(dbCompanyBillingContact?.EMail) || 'Not on file'}
                            status={getComparisonStatus(companyData.billingContact?.email, pickFirstNonEmpty(dbCompanyBillingContact?.EMail))}
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
                          isActionable={isActionable}
                        />
                        </div>
                    </>
                    ) : (
                    <>
                        {/* Plant Information Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="border-y border-slate-200 bg-slate-100 px-4 py-2">
                            <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">Plant Information</h4>
                        </div>
                        
                        <ComparisonRow
                            field="Plant Name"
                            appValue={plantData.plantName}
                            dbValue={getPlantName(plantDb) || selectedMatch?.plantName || 'Not on file'}
                            status={getComparisonStatus(plantData.plantName, getPlantName(plantDb) || selectedMatch?.plantName)}
                        />
                        
                        <ComparisonRow
                            field="Street Address"
                            appValue={plantData.plantAddress}
                            dbValue={plantDb?.Address || formatAddressStreet(dbPlantAddress) || selectedMatch?.Address || 'Not on file'}
                            status={getComparisonStatus(
                              plantData.plantAddress,
                              plantDb?.Address || formatAddressStreet(dbPlantAddress) || selectedMatch?.Address
                            )}
                        />
                        
                        <ComparisonRow
                            field="City / State / ZIP"
                            appValue={formatApplicationCityStateZip(
                              plantData.plantCity,
                              plantData.plantState,
                              plantData.plantZip
                            )}
                            dbValue={formatAddressCityStateZip(dbPlantAddress) || selectedMatch?.City || 'Not on file'}
                            status={getComparisonStatus(plantData.plantCity, dbPlantAddress?.city || selectedMatch?.City)}
                        />
                        
                        <ComparisonRow
                            field="Process Description"
                            appValue={plantData.processDescription || ''}
                            dbValue={plantDb?.brieflySummarize || 'Not on file'}
                            status={getComparisonStatus(plantData.processDescription, plantDb?.brieflySummarize)}
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
                          isActionable={isActionable}
                        />
                        </div>

                        {/* Plant Contact Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="border-y border-slate-200 bg-slate-100 px-4 py-2 flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-blue-800">
                            PRIMARY
                            </span>
                            <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">Plant Contact</h4>
                        </div>
                        
                        <ComparisonRow
                            field="Name"
                            appValue={plantData.primaryContact?.name || ''}
                            dbValue={formatContactName(dbPlantPrimaryContact) || 'Not on file'}
                            status={getComparisonStatus(plantData.primaryContact?.name, formatContactName(dbPlantPrimaryContact))}
                        />
                        
                        <ComparisonRow
                            field="Title"
                            appValue={plantData.primaryContact?.title || ''}
                            dbValue={pickFirstNonEmpty(dbPlantPrimaryContact?.companytitle, dbPlantPrimaryContact?.Title) || 'Not on file'}
                            status={getComparisonStatus(
                              plantData.primaryContact?.title,
                              pickFirstNonEmpty(dbPlantPrimaryContact?.companytitle, dbPlantPrimaryContact?.Title)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={plantData.primaryContact?.phone || ''}
                            dbValue={pickFirstNonEmpty(dbPlantPrimaryContact?.Cell, dbPlantPrimaryContact?.Voice) || 'Not on file'}
                            status={getComparisonStatus(
                              plantData.primaryContact?.phone,
                              pickFirstNonEmpty(dbPlantPrimaryContact?.Cell, dbPlantPrimaryContact?.Voice)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={plantData.primaryContact?.email || ''}
                            dbValue={pickFirstNonEmpty(dbPlantPrimaryContact?.EMail) || 'Not on file'}
                            status={getComparisonStatus(plantData.primaryContact?.email, pickFirstNonEmpty(dbPlantPrimaryContact?.EMail))}
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
                          isActionable={isActionable}
                        />
                        </div>

                        {/* Marketing Contact Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="border-y border-slate-200 bg-slate-100 px-4 py-2 flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-violet-700">
                            MARKETING
                            </span>
                            <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">Contact</h4>
                            <span className="text-xs italic text-gray-500">- Not currently in Kashrus</span>
                        </div>
                        
                        <ComparisonRow
                            field="Name"
                            appValue={plantData.marketingContact?.name || ''}
                            dbValue={formatContactName(dbPlantMarketingContact) || 'Not on file'}
                            status={getComparisonStatus(plantData.marketingContact?.name, formatContactName(dbPlantMarketingContact))}
                        />
                        
                        <ComparisonRow
                            field="Title"
                            appValue={plantData.marketingContact?.title || ''}
                            dbValue={pickFirstNonEmpty(dbPlantMarketingContact?.companytitle, dbPlantMarketingContact?.Title) || 'Not on file'}
                            status={getComparisonStatus(
                              plantData.marketingContact?.title,
                              pickFirstNonEmpty(dbPlantMarketingContact?.companytitle, dbPlantMarketingContact?.Title)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={plantData.marketingContact?.phone || ''}
                            dbValue={pickFirstNonEmpty(dbPlantMarketingContact?.Cell, dbPlantMarketingContact?.Voice) || 'Not on file'}
                            status={getComparisonStatus(
                              plantData.marketingContact?.phone,
                              pickFirstNonEmpty(dbPlantMarketingContact?.Cell, dbPlantMarketingContact?.Voice)
                            )}
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={plantData.marketingContact?.email || ''}
                            dbValue={pickFirstNonEmpty(dbPlantMarketingContact?.EMail) || 'Not on file'}
                            status={getComparisonStatus(plantData.marketingContact?.email, pickFirstNonEmpty(dbPlantMarketingContact?.EMail))}
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
                          isActionable={isActionable}
                        />
                        </div>
                    </>
                    )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-[#fafbfc] px-6 py-3.5">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="rounded-[7px] border border-gray-300 bg-[#f8fafc] px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

const pickFirstNonEmpty = (...values: Array<string | undefined>) =>
  values.find((value) => (value ?? '').trim() !== '') ?? ''

const toYesNo = (value?: string) => (value ?? '').trim().toUpperCase()

const getCompanyDbRecord = (companyDbResponse: unknown): CompanyDbRecord | undefined => {
  if (Array.isArray(companyDbResponse)) {
    return companyDbResponse[0] as CompanyDbRecord | undefined
  }

  if (
    companyDbResponse &&
    typeof companyDbResponse === 'object' &&
    Array.isArray((companyDbResponse as { data?: unknown[] }).data)
  ) {
    return (companyDbResponse as { data: CompanyDbRecord[] }).data[0]
  }

  return undefined
}

const getPlantDbRecord = (plantDbResponse: unknown): PlantDbRecord | undefined => {
  if (Array.isArray(plantDbResponse)) {
    return plantDbResponse[0] as PlantDbRecord | undefined
  }

  if (
    plantDbResponse &&
    typeof plantDbResponse === 'object' &&
    Array.isArray((plantDbResponse as { data?: unknown[] }).data)
  ) {
    return (plantDbResponse as { data: PlantDbRecord[] }).data[0]
  }

  return undefined
}

const mapAddress = (address: RawKashrusCompanyAddress): KashrusAddress => ({
  street: address.STREET1,
  line2: pickFirstNonEmpty(address.STREET2, address.STREET3),
  city: address.CITY,
  state: address.STATE,
  zip: address.ZIP,
  country: address.COUNTRY,
  type: address.TYPE,
})

const getPhysicalAddress = (addresses?: RawKashrusCompanyAddress[]): KashrusAddress | undefined => {
  if (!addresses?.length) return undefined
  const physicalAddress =
    addresses.find((addr) => (addr.TYPE ?? '').trim().toLowerCase() === 'physical') ??
    addresses[0]
  return mapAddress(physicalAddress)
}

const getCompanyName = (companyDb?: CompanyDbRecord) =>
  pickFirstNonEmpty(companyDb?.companytdetails?.[0]?.NAME, companyDb?.companyName)

const getPlantName = (plantDb?: PlantDbRecord) =>
  pickFirstNonEmpty(plantDb?.plantdetails?.[0]?.NAME, plantDb?.plantName)

const formatAddressStreet = (address?: KashrusAddress) =>
  [address?.street, address?.line2].filter((v) => (v ?? '').trim() !== '').join(', ')

const formatApplicationStreet = (street1?: string, street2?: string) =>
  [street1, street2].filter((v) => (v ?? '').trim() !== '').join(', ')

const formatApplicationCityStateZip = (
  city?: string,
  state?: string,
  zip?: string
) => {
  const cityState = [city, state].filter((v) => (v ?? '').trim() !== '').join(', ')
  return [cityState, zip].filter((v) => (v ?? '').trim() !== '').join(' ')
}

const formatAddressCityStateZip = (address?: KashrusAddress) => {
  if (!address) return ''
  return [address.city, address.state, address.zip]
    .filter((v) => (v ?? '').trim() !== '')
    .join(', ')
}

const formatContactName = (contact?: PlantFromApplicationContact) =>
  `${contact?.FirstName ?? ''} ${contact?.LastName ?? ''}`.trim()

const getPrimaryContact = (contacts?: PlantFromApplicationContact[]) => {
  if (!contacts?.length) return undefined
  return contacts.find((contact) => toYesNo(contact.PrimaryCT) === 'Y') ?? contacts[0]
}

const getBillingContact = (contacts?: PlantFromApplicationContact[]) => {
  if (!contacts?.length) return undefined
  return (
    contacts.find((contact) => toYesNo(contact.BillingCT) === 'Y') ??
    contacts.find((contact) => toYesNo(contact.PrimaryCT) !== 'Y') ??
    contacts[0]
  )
}

function SectionActions({
  selectedMatch,
  onCreateNew,
  onConfirmEdit,
  onConfirmMatch,
  isActionable,
}: {
  selectedMatch: Match | null
  onCreateNew: () => void
  onConfirmEdit: () => void
  onConfirmMatch: () => void
  isActionable: boolean
}) {
  const canConfirm = isActionable && !!selectedMatch

  return (
    <div className="flex justify-end gap-2 border-t border-gray-100 bg-[#f8fafc] px-4 py-2.5">
      <button
        onClick={onCreateNew}
        disabled={!isActionable}
        className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
          isActionable
            ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        Create New
      </button>

      <button
        onClick={onConfirmEdit}
        disabled={!canConfirm}
        className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
          canConfirm
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
        }`}
      >
        <Edit className="h-3.5 w-3.5" />
        Confirm & Edit
      </button>

      <button
        onClick={onConfirmMatch}
        disabled={!canConfirm}
        className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
          canConfirm
            ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
            : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
        }`}
      >
        <Check className="h-3.5 w-3.5" />
        Confirm Match
      </button>
    </div>
  )
}

// Comparison Row Component
function ComparisonRow({
  field,
  appValue,
  dbValue,
  status,
}: {
  field: string
  appValue: string
  dbValue: string
  status: ComparisonStatus
}) {
  const getStatusStyles = () => {
    if (status === 'match') {
      return {
        textClass: 'text-green-700',
        badgeClass: 'bg-green-100 text-green-600',
        icon: 'v',
      }
    }
    if (status === 'mismatch') {
      return {
        textClass: 'text-red-700',
        badgeClass: 'bg-red-100 text-red-500',
        icon: 'x',
      }
    }
    if (status === 'not-on-file') {
      return {
        textClass: 'text-blue-700',
        badgeClass: 'bg-blue-100 text-blue-500',
        icon: '+',
      }
    }
    return {
      textClass: 'text-gray-500',
      badgeClass: 'bg-gray-100 text-gray-400',
      icon: '.',
    }
  }

  const statusStyles = getStatusStyles()

  return (
    <div className="grid grid-cols-12 gap-4 border-b border-gray-100 px-4 py-[14px] transition-colors hover:bg-gray-50">
      <div className="col-span-3 bg-[#fafbfc] text-sm font-medium text-gray-700">
        {field}
      </div>
      <div className="col-span-4 text-[15px] text-gray-900">
        {appValue || <span className="text-gray-400 italic">Empty</span>}
      </div>
      <div className="col-span-4 text-[15px] text-gray-600">
        {dbValue === 'Not on file' ? (
          <span className="italic text-gray-400">{dbValue}</span>
        ) : (
          dbValue || <span className="text-gray-400 italic">Empty</span>
        )}
      </div>
      <div className={`col-span-1 flex items-center justify-center ${statusStyles.textClass}`}>
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${statusStyles.badgeClass}`}
        >
          {statusStyles.icon}
        </span>
      </div>
    </div>
  )
}

