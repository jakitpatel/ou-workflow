import { useState } from 'react'
import { ChevronDown, ChevronRight, Building2, Factory } from 'lucide-react'
import type { Applicant } from '@/types/application'

type Props = {
  application?: Applicant
  loading?: boolean
}

export function ResolvedSection({ application, loading }: Props) {
  const [open, setOpen] = useState(true)

  // Extract resolved data from tasks
  const resolved = extractResolvedData(application)

  if (!loading && !resolved) return null

  return (
    <div className="mt-6">
      {/* Company Section */}
      {loading ? (
        <CompanySkeleton />
      ) : (
        resolved?.company && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="w-full flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-left transition-colors hover:bg-yellow-100 hover:border-yellow-300"
            >
              <div className="flex-shrink-0">
                {open ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </div>

              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-yellow-700" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 mb-0.5">
                  {resolved.company.companyName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs text-gray-600 border border-gray-200 whitespace-nowrap">
                    CompanyID: {resolved.company.Id}
                  </span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {resolved.company.Address}
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-wrap gap-1.5 justify-end">
                {resolved.company.executedBy && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap bg-green-50 text-green-700 border-green-200">
                    {resolved.company.executedBy}
                  </span>
                )}
                {resolved.company.CompletedDate && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap bg-green-50 text-green-700 border-green-200">
                    {new Date(resolved.company.CompletedDate).toLocaleString()}
                  </span>
                )}
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${
                  resolved.company.Id 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {resolved.company.Id ? 'ASSIGNED' : 'TO BE ASSIGNED'}
                </span>
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  {loading ? '...' : resolved?.plants?.length || 0} plants
                </span>
              </div>
            </button>
          </div>
        )
      )}

      {/* Plants Section */}
      {open && (
        <div className="space-y-3">
          {loading ? (
            <PlantsSkeleton />
          ) : (
            resolved?.plants?.map((p, idx) => (
              <div
                key={idx}
                className="ml-6 relative"
              >
                {/* Connection Line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-gray-300 to-transparent" 
                     style={{ height: idx === (resolved.plants?.length ?? 0) - 1 ? '50%' : '100%' }} 
                />
                <div className="absolute left-0 top-6 w-4 h-px bg-gray-300" />
                
                {/* Plant Card */}
                <div className="ml-6 flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Factory className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-sm font-medium text-gray-900">
                        {p.plant?.plantName}
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {p.plant?.executedBy && (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap bg-green-50 text-green-700 border-green-200">
                            {p.plant.executedBy}
                          </span>
                        )}
                        {p.plant?.CompletedDate && (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap bg-green-50 text-green-700 border-green-200">
                            {new Date(p.plant.CompletedDate).toLocaleString()}
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${
                          p.ownsID 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {p.ownsID ? 'ASSIGNED' : 'TO BE DONE'}
                        </span>
                        {p.ownsID && (
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-600 border border-gray-200 whitespace-nowrap">
                            OWNSID: {p.ownsID}
                          </span>
                        )}
                        {p.WFID && (
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-600 border border-gray-200 whitespace-nowrap">
                            WFID: {p.WFID}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>
                        Plant ID: <span className="font-mono">{p.plant?.plantID}</span>
                      </div>
                      {p.plant?.plantAddress && (
                        <div className="text-gray-400 truncate">
                          {p.plant.plantAddress}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- Helper Function ---------------- */
function extractResolvedData(application?: Applicant) {
  if (!application?.stages?.Preliminary?.tasks) return null

  const tasks = application.stages.Preliminary.tasks
  
  // Find ResolveCompany task
  const companyTask = tasks.find(task => task.name === 'ResolveCompany')
  
  // Find all ResolvePlant tasks
  const plantTasks = tasks.filter(task => task.name === 'ResolvePlant')

  if (!companyTask && plantTasks.length === 0) return null

  return {
    company: companyTask ? {
      companyName: companyTask.companySelected?.companyName || companyTask.companyFromApplication?.companyName || '',
      Id: companyTask.companySelected?.ID || companyTask.Result || '',
      Address: companyTask.companySelected?.Address || companyTask.companyFromApplication?.companyAddress || '',
      executedBy: companyTask.executedBy || '',
      CompletedDate: companyTask.CompletedDate || '',
    } : undefined,
    plants: plantTasks.map(task => ({
      ownsID: task.plantSelected?.OWNSID || '',
      WFID: task.plantSelected?.WFID || '',
      plant: {
        plantName: task.plantSelected?.plantName || task.plantFromApplication?.plantName || '',
        plantID: task.plantSelected?.PlantID || task.Result || '',
        plantAddress: task.plantSelected?.Address || task.plantFromApplication?.plantAddress || '',
        executedBy: task.executedBy || '',
        CompletedDate: task.CompletedDate || '',
      }
    }))
  }
}

/* ---------------- Skeletons ---------------- */
function CompanySkeleton() {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-yellow-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 w-1/3 bg-yellow-200 rounded mb-2" />
          <div className="h-3 w-2/3 bg-yellow-200 rounded" />
        </div>
      </div>
    </div>
  )
}

function PlantsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="ml-12 rounded-lg border border-gray-200 bg-white px-4 py-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-3/4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}