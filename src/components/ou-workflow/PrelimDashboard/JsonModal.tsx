import { useState } from 'react'
import { JsonEditorView } from './JsonEditorView'
import { VectorResultsTable } from './VectorResultsTable'
import { fetchVectorMatches, fetchCompanyDetails } from '@/api'
import { Search } from 'lucide-react'

export function JsonModal({
  open,
  onClose,
  data,
  isLoading,
  error,
}: any) {
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [vectorResults, setVectorResults] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [companyDetails, setCompanyDetails] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)

  if (!open) return null

  const handleFind = async () => {
    if (selectedNode == null) return

    setSearching(true)
    setVectorResults([])
    setSelectedCompanyId(null)
    setCompanyDetails(null)

    try {
      const result = await fetchVectorMatches({ source: selectedNode })
      setVectorResults(result)
    } finally {
      setSearching(false)
    }
  }

  const handleSelectCompany = async (companyId: number) => {
    setSelectedCompanyId(companyId)
    setLoadingCompany(true)

    try {
      const details = await fetchCompanyDetails(companyId);
      setCompanyDetails(details?.[0] ?? null)
    } finally {
      setLoadingCompany(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-[85vw] max-h-[85vh] rounded-lg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-lg">Application JSON</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {isLoading && (
          <div className="h-[60vh] flex items-center justify-center">
            Loading…
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-3 gap-3 h-[65vh]">
            {/* Left – Preliminary Data */}
            <JsonEditorView
              value={data}
              title="Preliminary Data"
              onSelect={setSelectedNode}
              headerAction={
                <button
                  onClick={handleFind}
                  disabled={selectedNode == null || searching}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  <Search size={14} />
                  {searching ? 'Finding…' : 'Find'}
                </button>
              }
            />

            {/* Middle – Vector Matches (TABLE) */}
            <div className="flex flex-col h-full border rounded bg-white">
              <div className="px-3 py-2 border-b bg-gray-50 text-sm font-semibold">
                Vector Search Data
              </div>
              <VectorResultsTable
                results={vectorResults}
                selectedCompanyId={selectedCompanyId}
                onSelect={handleSelectCompany}
              />
            </div>

            {/* Right – KASH DB JSON */}
            <JsonEditorView
              value={
                loadingCompany
                  ? { loading: true }
                  : companyDetails ?? { message: 'Select a company' }
              }
              title="KASH DB Data"
            />
          </div>
        )}
      </div>
    </div>
  )
}
