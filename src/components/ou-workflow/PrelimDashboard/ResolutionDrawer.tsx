import { useState, useEffect } from 'react'
import { X, Building2, Factory, Check, Plus, Edit } from 'lucide-react'

type CompanyData = {
  companyName: string
  companyAddress: string
  companyAddress2?: string
  companyCity: string
  companyState: string
  ZipPostalCode: string
  companyCountry: string
  companyPhone?: string
  companyWebsite?: string
  numberOfPlants?: number
  whichCategory?: string
}

type PlantData = {
  plantName: string
  plantAddress: string
  plantCity: string
  plantState: string
  plantZip: string
  plantCountry: string
  plantNumber?: number
}

type Match = {
  Id: string
  companyName?: string
  plantName?: string
  Address: string
  matchRating?: number
  matchReason?: string
  OWNSID?: string
  WFID?: string
  PlantID?: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  type: 'company' | 'plant'
  data: CompanyData | PlantData
  matches: Match[]
  onAssign: (match: Match) => void
  selectedId?: string
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
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(
    matches.find((m) => m.Id === selectedId) ||
      (matches.length > 0 ? matches[0] : null)
  )

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

  const handleMatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const matchId = e.target.value
    if (matchId === 'create-new') {
      setSelectedMatch(null)
    } else {
      const match = matches.find((m) => m.Id === matchId)
      setSelectedMatch(match || null)
    }
  }

  const handleConfirmMatch = () => {
    if (selectedMatch) {
      onAssign(selectedMatch)
      onClose()
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
          fixed right-0 top-0 h-full w-full max-w-4xl
          bg-white shadow-2xl z-50
          translate-x-0
          transition-transform duration-300 ease-in-out
          overflow-hidden flex flex-col
        "
      >
        {/* Header */}
        <div className="bg-indigo-900 text-white px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                {isCompany ? (
                  <Building2 className="w-5 h-5 text-white" />
                ) : (
                  <Factory className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {isCompany ? 'Resolve Company' : 'Resolve Plant'}
                </h2>
                <p className="text-sm text-indigo-200">
                  {isCompany
                    ? companyData.companyName
                    : plantData.plantName}{' '}
                  — Match {type} to existing or create new
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Match Selector */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Field Comparison</h3>
            <select
              value={selectedMatch?.Id || 'create-new'}
              onChange={handleMatchChange}
              className="bg-indigo-800 text-white rounded-lg px-4 py-2 text-sm font-medium border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {matches.map((match, idx) => (
                <option key={match.Id} value={match.Id}>
                  Match {idx + 1}:{' '}
                  {isCompany ? match.companyName : match.plantName} — #
                  {match.Id} ({match.matchRating}%)
                </option>
              ))}
              <option value="create-new">
                + No Match — Create New {isCompany ? 'Company' : 'Plant'}
              </option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="p-6">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4">
                    <div className="col-span-3">Field</div>
                    <div className="col-span-4">Submitted (Application)</div>
                    <div className="col-span-4">Database (Kashrus)</div>
                    <div className="col-span-1 text-center">Status</div>
                    </div>

                    {isCompany ? (
                    <>
                        {/* Company Information Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Company Information</h4>
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
                            dbValue={selectedMatch ? `${companyData.companyCity}, ${companyData.companyState} ${companyData.ZipPostalCode}` : 'Not on file'}
                            status={selectedMatch ? 'match' : 'not-on-file'}
                        />
                        
                        <ComparisonRow
                            field="Website"
                            appValue={companyData.companyWebsite || ''}
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        </div>

                        {/* Company Contact Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                            PRIMARY
                            </span>
                            <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Company Contact</h4>
                        </div>
                        
                        <ComparisonRow
                            field="Name"
                            appValue="Sarah Cohen"
                            dbValue={selectedMatch ? "Sarah Cohen" : "Not on file"}
                            status={selectedMatch ? 'match' : 'not-on-file'}
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue={companyData.companyPhone || ''}
                            dbValue={selectedMatch ? companyData.companyPhone || '' : "Not on file"}
                            status={selectedMatch ? 'match' : 'not-on-file'}
                        />
                        </div>
                    </>
                    ) : (
                    <>
                        {/* Plant Information Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Plant Information</h4>
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
                            dbValue={selectedMatch ? `${plantData.plantCity}, ${plantData.plantState} ${plantData.plantZip}` : 'Not on file'}
                            status={selectedMatch ? 'match' : 'not-on-file'}
                        />
                        
                        <ComparisonRow
                            field="Process Description"
                            appValue="Cold-press extraction of jojoba oil from raw seeds; bottling and labeling on-site"
                            dbValue="Not on file"
                            status="not-on-file"
                        />
                        </div>

                        {/* Plant Contact Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                            PRIMARY
                            </span>
                            <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Plant Contact</h4>
                        </div>
                        
                        <ComparisonRow
                            field="Name"
                            appValue="Tom Wilson"
                            dbValue={selectedMatch ? "James Cooper" : "Not on file"}
                            status={selectedMatch ? 'mismatch' : 'not-on-file'}
                        />
                        
                        <ComparisonRow
                            field="Title"
                            appValue="Plant Manager"
                            dbValue={selectedMatch ? "QA Manager" : "Not on file"}
                            status={selectedMatch ? 'mismatch' : 'not-on-file'}
                        />
                        
                        <ComparisonRow
                            field="Phone"
                            appValue="(602) 555-0199"
                            dbValue={selectedMatch ? "602-555-0199" : "Not on file"}
                            status={selectedMatch ? 'match' : 'not-on-file'}
                        />
                        
                        <ComparisonRow
                            field="Email"
                            appValue="t.wilson@jojobadesert.com"
                            dbValue={selectedMatch ? "j.cooper@jojobainc.com" : "Not on file"}
                            status={selectedMatch ? 'mismatch' : 'not-on-file'}
                        />
                        </div>

                        {/* Marketing Contact Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                            MARKETING
                            </span>
                            <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Contact</h4>
                            <span className="text-xs text-gray-500 italic">— Not currently in Kashrus</span>
                        </div>
                        
                        <ComparisonRow
                            field="Name"
                            appValue="Lisa Park"
                            dbValue="No matching contact"
                            status="not-on-file"
                        />
                        </div>
                    </>
                    )}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            <div className="flex gap-3">
              <button
                disabled={selectedMatch !== null}
                className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg ${
                  selectedMatch === null
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                Create New
              </button>

              <button
                disabled={!selectedMatch}
                className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg ${
                  selectedMatch
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Edit className="w-4 h-4" />
                Confirm & Edit
              </button>

              <button
                onClick={handleConfirmMatch}
                disabled={!selectedMatch}
                className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg ${
                  selectedMatch
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                Confirm Match
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Comparison Row Component
function ComparisonRow({ 
  field, 
  appValue, 
  dbValue, 
  status 
}: { 
  field: string
  appValue: string
  dbValue: string
  status: ComparisonStatus
}) {
  const getStatusColor = () => {
    if (status === 'match') return 'text-green-600'
    if (status === 'mismatch') return 'text-red-600'
    if (status === 'not-on-file') return 'text-orange-500'
    return 'text-gray-400'
  }

  const getStatusIcon = () => {
    if (status === 'match') return '✓'
    if (status === 'mismatch') return '✗'
    if (status === 'not-on-file') return '+'
    return ''
  }

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="col-span-3 text-sm font-medium text-gray-700">
        {field}
      </div>
      <div className="col-span-4 text-sm text-gray-900">
        {appValue || <span className="text-gray-400 italic">Empty</span>}
      </div>
      <div className="col-span-4 text-sm text-gray-600">
        {dbValue === 'Not on file' ? (
          <span className="italic text-gray-400">{dbValue}</span>
        ) : (
          dbValue || <span className="text-gray-400 italic">Empty</span>
        )}
      </div>
      <div className={`col-span-1 text-center text-lg font-bold ${getStatusColor()}`}>
        {getStatusIcon()}
      </div>
    </div>
  )
}