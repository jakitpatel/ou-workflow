import { useState } from 'react'
import { ChevronDown, ChevronRight, Building2, Factory } from 'lucide-react'
import type { ResolvedData } from '@/types/application';

type Props = {
  resolved?: ResolvedData
  loading?: boolean
}

export function ResolvedSection({ resolved, loading }: Props) {
  const [open, setOpen] = useState(true)

  if (!loading && !resolved) return null

  return (
    <div className="mt-4 rounded-md border bg-gray-50">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
      >
        <span>Resolved</span>
        {open ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company */}
          {loading ? (
            <CompanySkeleton />
          ) : (
            resolved?.company && (
              <div className="bg-white rounded border p-3">
                <h5 className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-2">
                  <Building2 className="w-3 h-3" />
                  Company
                </h5>

                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Name:</span>{' '}
                    {resolved.company.companyName}
                  </div>
                  <div>
                    <span className="font-medium">ID:</span>{' '}
                    {resolved.company.Id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {resolved.company.Address}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Plants */}
          {loading ? (
            <PlantsSkeleton />
          ) : (
            resolved?.plants &&
            resolved.plants.length > 0 && (
              <div className="bg-white rounded border p-3">
                <h5 className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-2">
                  <Factory className="w-3 h-3" />
                  Plants
                </h5>

                <div className="space-y-3">
                  {resolved.plants.map((p, idx) => (
                    <div
                      key={idx}
                      className="border rounded p-2 text-sm"
                    >
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>OwnsID: {p.ownsID}</span>
                        <span>WFID: {p.WFID}</span>
                      </div>

                      <div className="font-medium">
                        {p.plant?.plantName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.plant?.plantAddress}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Skeletons ---------------- */

function CompanySkeleton() {
  return (
    <div className="bg-white rounded border p-3 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-200 rounded" />
      </div>
    </div>
  )
}

function PlantsSkeleton() {
  return (
    <div className="bg-white rounded border p-3 animate-pulse space-y-3">
      <div className="h-3 w-24 bg-gray-200 rounded" />
      {[1, 2].map((i) => (
        <div key={i} className="border rounded p-2 space-y-2">
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-3/4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}
