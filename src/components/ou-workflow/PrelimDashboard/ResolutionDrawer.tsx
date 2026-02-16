import { useState, useEffect } from 'react'
import { X, Check, Plus, Edit } from 'lucide-react'

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
}: Props) {
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
    if (selectedMatch) {
      onAssign(selectedMatch)
      onClose()
    }
  }

  const handleCreateNew = () => {
    setSelectedMatch(null)
  }

  const handleConfirmEdit = () => {
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
                            dbValue={selectedMatch?.companyName || 'Not on file'}
                            status={getComparisonStatus(companyData.companyName, selectedMatch?.companyName)}
                        />
                        
                        <ComparisonRow
                            field="DBA / Trade Name"
                            appValue={companyData.companyName}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Street Address"
                            appValue={companyData.companyAddress}
                            dbValue={selectedMatch?.Address || 'Not on file'}
                            status={getComparisonStatus(companyData.companyAddress, selectedMatch?.Address)}
                        />
                        
                        <ComparisonRow
                            field="City / State / ZIP"
                            appValue={`${companyData.companyCity}, ${companyData.companyState} ${companyData.ZipPostalCode}`}
                            dbValue={selectedMatch?.City || 'Not on file'}
                            status={getComparisonStatus(companyData.companyCity, selectedMatch?.City)}
                        />
                        
                        <ComparisonRow
                            field="Website"
                            appValue={companyData.companyWebsite || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
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
                            dbValue="Not on file"
                            status="not-on-file"
                        />

                        <ComparisonRow
                            field="Title"
                            appValue={companyData.primaryContact?.title || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={companyData.primaryContact?.phone || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={companyData.primaryContact?.email || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
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
                            dbValue="Not on file"
                            status="not-on-file"
                        />

                        <ComparisonRow
                            field="Title"
                            appValue={companyData.billingContact?.title || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={companyData.billingContact?.phone || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={companyData.billingContact?.email || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
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
                            dbValue={selectedMatch?.plantName || 'Not on file'}
                            status={getComparisonStatus(plantData.plantName, selectedMatch?.plantName)}
                        />
                        
                        <ComparisonRow
                            field="Street Address"
                            appValue={plantData.plantAddress}
                            dbValue={selectedMatch?.Address || 'Not on file'}
                            status={getComparisonStatus(plantData.plantAddress, selectedMatch?.Address)}
                        />
                        
                        <ComparisonRow
                            field="City / State / ZIP"
                            appValue={`${plantData.plantCity}, ${plantData.plantState} ${plantData.plantZip}`}
                            dbValue={selectedMatch?.City || 'Not on file'}
                            status={getComparisonStatus(plantData.plantCity, selectedMatch?.City)}
                        />
                        
                        <ComparisonRow
                            field="Process Description"
                            appValue={plantData.processDescription || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
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
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Title"
                            appValue={plantData.primaryContact?.title || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={plantData.primaryContact?.phone || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={plantData.primaryContact?.email || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
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
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Title"
                            appValue={plantData.marketingContact?.title || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={plantData.marketingContact?.phone || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue={plantData.marketingContact?.email || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        <SectionActions
                          selectedMatch={selectedMatch}
                          onCreateNew={handleCreateNew}
                          onConfirmEdit={handleConfirmEdit}
                          onConfirmMatch={handleConfirmMatch}
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

function SectionActions({
  selectedMatch,
  onCreateNew,
  onConfirmEdit,
  onConfirmMatch,
}: {
  selectedMatch: Match | null
  onCreateNew: () => void
  onConfirmEdit: () => void
  onConfirmMatch: () => void
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-gray-100 bg-[#f8fafc] px-4 py-2.5">
      <button
        onClick={onCreateNew}
        className="inline-flex items-center gap-1.5 rounded-[7px] border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[13px] font-semibold text-indigo-600 hover:bg-indigo-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Create New
      </button>

      <button
        onClick={onConfirmEdit}
        disabled={!selectedMatch}
        className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
          selectedMatch
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
        }`}
      >
        <Edit className="h-3.5 w-3.5" />
        Confirm & Edit
      </button>

      <button
        onClick={onConfirmMatch}
        disabled={!selectedMatch}
        className={`inline-flex items-center gap-1.5 rounded-[7px] border px-4 py-1.5 text-[13px] font-semibold ${
          selectedMatch
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

