import { useState } from 'react'
import type { ApplicantAppVars } from '@/types/application'
import { useApplicationDetail } from '../hooks/useApplicationDetail'
import { useScheduleEir } from '../hooks/useScheduleEir'
import { useScheduleAScratchpad } from '../hooks/useScheduleAIngredients'
import { ScheduleAEirDetailsTab } from './ScheduleAEirDetailsTab'
import { ScheduleAEirNewTab } from './ScheduleAEirNewTab'

type Props = {
  applicationId: number
  appVars?: ApplicantAppVars | null
  taskInstanceId?: string | number | null
  taskStatusDetails?: unknown
}

export function ApplicationEirPanel({
  applicationId,
  appVars,
  taskInstanceId,
  taskStatusDetails,
}: Props) {
  const [tab, setTab] = useState<'details' | 'eir'>('details')
  const detail = useApplicationDetail(String(applicationId))
  const { applicationItem, inspectionStatus, eirNewUrl } = useScheduleEir(
    String(applicationId),
    detail.data?.VisitId,
  )
  const scratchpadApi = useScheduleAScratchpad(applicationId, taskInstanceId, taskStatusDetails)

  if (detail.isLoading) return <p className="p-6 text-sm text-gray-500">Loading EIR...</p>
  if (detail.isError)
    return (
      <div role="alert" className="p-6 text-sm text-red-700">
        <p>Unable to load EIR details.</p>
        <button type="button" onClick={() => void detail.refetch()} className="mt-2 underline">
          Retry
        </button>
      </div>
    )

  return (
    <section aria-label="EIR">
      <div className="mb-4 flex gap-2" aria-label="EIR sections">
        {(['details', 'eir'] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700'}`}
          >
            {id === 'details' ? 'EIR Details' : 'EIR'}
          </button>
        ))}
      </div>
      {tab === 'details' ? (
        <ScheduleAEirDetailsTab
          applicationDetail={detail.data}
          applicationAppVars={applicationItem?.appvars}
          appVars={appVars}
          scratchpadApi={scratchpadApi}
          readOnly
        />
      ) : (
        <ScheduleAEirNewTab url={eirNewUrl} inspectionStatus={inspectionStatus} />
      )}
    </section>
  )
}
