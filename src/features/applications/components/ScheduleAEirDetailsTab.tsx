import { AlertCircle, FileText, Plus, Check } from 'lucide-react'
import type { ApplicationDetail, ApplicantAppVars } from '@/types/application'
import { getDesignatedRfrName } from '../utils/designatedRfrName'
import {
  getDaysSinceVisit,
  resolveScheduleADocumentUrl,
  useScheduleAScratchpad,
} from '../hooks/useScheduleAIngredients'

type Props = {
  applicationDetail?: ApplicationDetail
  applicationAppVars?: ApplicantAppVars | null
  appVars?: ApplicantAppVars | null
  scratchpadApi: ReturnType<typeof useScheduleAScratchpad>
  readOnly?: boolean
}

const textValue = (value: unknown) => String(value ?? '').trim()

const formatDisplayDate = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getDocumentFilename = (value?: string | null) => {
  const trimmed = textValue(value)
  if (!trimmed) return 'Inspection report'
  const normalized = trimmed.replace(/\\/g, '/')
  return normalized.split('/').pop() || 'Inspection report'
}

export function ScheduleAEirDetailsTab({
  applicationDetail,
  applicationAppVars,
  appVars,
  scratchpadApi,
  readOnly = false,
}: Props) {
  const { scratchpad } = scratchpadApi
  const assignedRfr = getDesignatedRfrName(applicationDetail?.DesignatedRFR)
  const effectiveAppVars = { ...applicationAppVars, ...appVars }
  const visitIdLabel = textValue(applicationDetail?.VisitId)
  const inspectionDate = formatDisplayDate(applicationDetail?.InspectionDate)
  const reportedInspectionDate = formatDisplayDate(applicationDetail?.ReportedInspectionDate)
  const daysSinceVisit = getDaysSinceVisit(applicationDetail?.InspectionDate)
  const eirWorkflowFileId = textValue(effectiveAppVars.wf_file_id)
  const eirDocumentPath = textValue(applicationDetail?.RFRFileUrl)
  const eirDisplayName = eirDocumentPath ? getDocumentFilename(eirDocumentPath) : ''
  const eirDocumentUrl = resolveScheduleADocumentUrl(applicationDetail?.RFRFileUrl)
  const hasWorkflowEirDocument = Boolean(eirDisplayName && (eirWorkflowFileId || eirDocumentUrl))
  const effectiveEirNotRequired = scratchpad.eirNotRequired && !hasWorkflowEirDocument
  const effectiveEirReceived = hasWorkflowEirDocument || scratchpad.eirReceived
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold text-gray-900">Inspection Report (EIR)</h2>

      {!effectiveEirReceived && !effectiveEirNotRequired ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-semibold text-red-800">
            Awaiting EIR Submission - NCRC will be notified on receipt to review and forward to the
            IA Manager
          </p>
        </div>
      ) : null}

      {effectiveEirNotRequired ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-gray-500" />
          <p className="text-sm font-semibold text-gray-800">
            EIR marked not required for this application.
          </p>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm font-medium text-gray-600">Inspection Status</span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                effectiveEirNotRequired
                  ? 'border-gray-200 bg-gray-100 text-gray-700'
                  : scratchpad.eirReviewComplete
                    ? 'border-green-200 bg-green-100 text-green-800'
                    : effectiveEirReceived
                      ? 'border-blue-200 bg-blue-100 text-blue-800'
                      : 'border-yellow-200 bg-yellow-100 text-yellow-800'
              }`}
            >
              {effectiveEirNotRequired
                ? 'Not Required'
                : scratchpad.eirReviewComplete
                  ? 'Review Complete'
                  : effectiveEirReceived
                    ? 'Report Received'
                    : 'Awaiting Report'}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm font-medium text-gray-600">RFR Assigned</span>
            <span className="text-sm font-semibold text-gray-900">{assignedRfr || '-'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm font-medium text-gray-600">Visit ID</span>
            <span className="font-mono text-sm font-semibold text-gray-900">
              {visitIdLabel || '-'}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 py-2">
            <span className="text-sm font-medium text-gray-600">Proposed Visit Date</span>
            <span className="text-sm font-semibold text-gray-900">{reportedInspectionDate || '-'}</span>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2">
            <span className="text-sm font-medium text-gray-600">Actual Visit Date</span>
            <span className="text-right text-sm font-semibold text-gray-900">
              {inspectionDate || '-'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 py-2">
            <span className="text-sm font-medium text-gray-600">Days Since Visit</span>
            <span
              className={
                effectiveEirReceived || effectiveEirNotRequired
                  ? 'text-sm font-semibold text-gray-900'
                  : 'text-sm font-semibold text-red-600'
              }
            >
              {daysSinceVisit === null
                ? '-'
                : `${daysSinceVisit} day${daysSinceVisit === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>
      </div>

      {effectiveEirReceived && !scratchpad.eirReviewComplete && !readOnly ? (
        <div className="mt-5 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-purple-300 text-[10px] font-semibold text-purple-600">
              IA
            </span>
            <p className="text-sm font-semibold text-purple-900">IA Manager - EIR Review</p>
          </div>
          <p className="mb-3 text-xs text-purple-800">
            The IA Manager reads the EIR and directs the IAR to update Schedule A. IAR executes on
            direction.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={scratchpadApi.requestEirIngredientEntry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Request IAR add ingredient
            </button>
            <button
              type="button"
              onClick={scratchpadApi.markEirReviewComplete}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
            >
              <Check className="h-3.5 w-3.5" />
              Mark EIR review complete
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        {effectiveEirNotRequired && !readOnly ? (
          <button
            type="button"
            onClick={scratchpadApi.clearEirNotRequired}
            className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear not required
          </button>
        ) : null}
      </div>
    </div>
  )
}
