import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { CheckCircle2, Paperclip, X } from 'lucide-react'
import { ModalSurface } from '@/components/ui/ModalSurface'
import { useUser } from '@/context/UserContext'
import { getBuildInfo } from '@/lib/utils'
import { getRecentErrors } from '@/shared/diagnostics/recentErrors'
import { useSubmitIssueReport } from '../hooks/useSubmitIssueReport'
import { addIssueAttachments, formatAttachmentSize } from '../lib/issueReportAttachments'
import { buildIssueReportContext } from '../lib/issueReportContext'
import {
  ATTACHMENT_ACCEPT,
  ISSUE_CATEGORIES,
  ISSUE_DESCRIPTION_MAX_LENGTH,
  ISSUE_SEVERITIES,
  ISSUE_SUMMARY_MAX_LENGTH,
  MAX_ATTACHMENTS,
} from '../model/issueReport'
import type { IssueReportDraft } from '../model/issueReport'

const EMPTY_DRAFT: IssueReportDraft = {
  category: 'bug',
  severity: 'medium',
  summary: '',
  description: '',
  includeRecentErrors: true,
}

/**
 * Above every drawer and drawer modal (they go up to z-[70]); pointer-events-auto keeps the form
 * usable when an open drawer has set pointer-events: none on <body>.
 */
export const REPORT_ISSUE_OVERLAY_CLASS =
  'fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center bg-black/40 p-4'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50'

export function ReportIssueDialog({ onClose }: { onClose: () => void }) {
  const ids = useId()
  const { username, role } = useUser()
  const location = useRouterState({ select: (state) => state.location })
  const submit = useSubmitIssueReport()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<IssueReportDraft>(EMPTY_DRAFT)
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([])
  const [showValidation, setShowValidation] = useState(false)

  const saving = submit.isPending
  const recentErrors = getRecentErrors()
  const buildContext = () =>
    buildIssueReportContext({
      pathname: location.pathname,
      search: typeof location.searchStr === 'string' ? location.searchStr : '',
      pageTitle: document.title,
      username,
      role,
      build: getBuildInfo(),
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
      now: new Date(),
      recentErrors,
      includeRecentErrors: draft.includeRecentErrors,
    })
  const preview = buildContext()

  const summaryMissing = !draft.summary.trim()
  const descriptionMissing = !draft.description.trim()
  const update = <K extends keyof IssueReportDraft>(key: K, value: IssueReportDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const handleFiles = (picked: FileList | null) => {
    if (!picked) return
    const result = addIssueAttachments(attachments, Array.from(picked))
    setAttachments(result.files)
    setAttachmentErrors(result.errors)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (summaryMissing || descriptionMissing) {
      setShowValidation(true)
      return
    }
    submit.mutate({
      payload: {
        category: draft.category,
        severity: draft.severity,
        summary: draft.summary.trim(),
        description: draft.description.trim(),
        context: buildContext(),
        attachmentNames: attachments.map((file) => file.name),
      },
      attachments,
    })
  }

  if (submit.isSuccess) {
    return (
      <div className={REPORT_ISSUE_OVERLAY_CLASS}>
        <ModalSurface onClose={onClose} label="Issue reported" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" aria-hidden="true" />
            <div>
              <h3 aria-hidden="true" className="text-lg font-semibold text-gray-900">Thank you</h3>
              <p className="mt-1 text-sm text-gray-700" role="status">
                Your report was sent. Reference number: <span className="font-semibold">{submit.data.reportId}</span>
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Close
            </button>
          </div>
        </ModalSurface>
      </div>
    )
  }

  return (
    <div className={REPORT_ISSUE_OVERLAY_CLASS}>
      <ModalSurface
        onClose={onClose}
        label="Report an Issue"
        dismissible={!saving}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
      >
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 aria-hidden="true" className="text-lg font-semibold text-gray-900">Report an Issue</h3>
            <button type="button" onClick={onClose} disabled={saving} aria-label="Close"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${ids}-category`} className="mb-1 block text-sm font-medium text-gray-700">Type of issue</label>
                <select id={`${ids}-category`} value={draft.category} disabled={saving} className={inputClass}
                  onChange={(e) => update('category', e.target.value as IssueReportDraft['category'])}>
                  {ISSUE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`${ids}-severity`} className="mb-1 block text-sm font-medium text-gray-700">Impact</label>
                <select id={`${ids}-severity`} value={draft.severity} disabled={saving} className={inputClass}
                  onChange={(e) => update('severity', e.target.value as IssueReportDraft['severity'])}>
                  {ISSUE_SEVERITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={`${ids}-summary`} className="mb-1 block text-sm font-medium text-gray-700">Summary</label>
              <input id={`${ids}-summary`} value={draft.summary} disabled={saving} maxLength={ISSUE_SUMMARY_MAX_LENGTH}
                placeholder="e.g. Contract task will not open" className={inputClass}
                aria-invalid={showValidation && summaryMissing}
                aria-describedby={showValidation && summaryMissing ? `${ids}-summary-error` : undefined}
                onChange={(e) => update('summary', e.target.value)} />
              {showValidation && summaryMissing && (
                <p id={`${ids}-summary-error`} className="mt-1 text-xs text-red-600">Enter a short summary.</p>
              )}
            </div>

            <div>
              <label htmlFor={`${ids}-description`} className="mb-1 block text-sm font-medium text-gray-700">What happened?</label>
              <textarea id={`${ids}-description`} value={draft.description} disabled={saving} rows={5}
                maxLength={ISSUE_DESCRIPTION_MAX_LENGTH} className={inputClass}
                placeholder="What were you doing, what did you expect, and what happened instead?"
                aria-invalid={showValidation && descriptionMissing}
                aria-describedby={showValidation && descriptionMissing ? `${ids}-description-error` : undefined}
                onChange={(e) => update('description', e.target.value)} />
              {showValidation && descriptionMissing && (
                <p id={`${ids}-description-error`} className="mt-1 text-xs text-red-600">Describe the issue.</p>
              )}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Screenshots or files (optional)</span>
              <input ref={fileInputRef} id={`${ids}-files`} type="file" multiple accept={ATTACHMENT_ACCEPT}
                className="sr-only" disabled={saving || attachments.length >= MAX_ATTACHMENTS}
                onChange={(e) => handleFiles(e.target.files)} />
              <label htmlFor={`${ids}-files`}
                className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 ${
                  saving || attachments.length >= MAX_ATTACHMENTS ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
                }`}>
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                Attach files
              </label>
              <span className="ml-2 text-xs text-gray-500">Up to {MAX_ATTACHMENTS} images, PDF or text files, 10 MB each.</span>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1" aria-label="Attached files">
                  {attachments.map((file) => (
                    <li key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-md bg-gray-50 px-2 py-1 text-sm">
                      <span className="truncate text-gray-700">{file.name} <span className="text-xs text-gray-500">({formatAttachmentSize(file.size)})</span></span>
                      <button type="button" disabled={saving} aria-label={`Remove ${file.name}`}
                        className="ml-2 rounded p-0.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                        onClick={() => setAttachments((current) => current.filter((item) => item !== file))}>
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {attachmentErrors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-red-600" role="alert">
                  {attachmentErrors.map((message) => <li key={message}>{message}</li>)}
                </ul>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" className="mt-0.5" checked={draft.includeRecentErrors} disabled={saving}
                onChange={(e) => update('includeRecentErrors', e.target.checked)} />
              <span>
                Include recent error messages ({recentErrors.length})
                <span className="block text-xs text-gray-500">Personal details and tokens are removed.</span>
              </span>
            </label>

            <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <summary className="cursor-pointer font-medium text-gray-700">Information sent automatically</summary>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt>Page</dt><dd className="break-all">{preview.page}</dd>
                {preview.applicationId && <><dt>Application</dt><dd>{preview.applicationId}</dd></>}
                <dt>Version</dt><dd>{[preview.appVersion, preview.appCommit, preview.appEnvironment].filter(Boolean).join(' · ') || 'unknown'}</dd>
                <dt>User</dt><dd>{[preview.username, preview.role].filter(Boolean).join(' / ')}</dd>
                <dt>Browser</dt><dd className="break-all">{preview.userAgent}</dd>
                <dt>Screen</dt><dd>{preview.viewport} · {preview.timeZone}</dd>
              </dl>
              {preview.recentErrors.length > 0 && (
                <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto border-t border-gray-200 pt-2 font-mono">
                  {preview.recentErrors.map((entry, index) => (
                    <li key={`${entry.time}-${index}`} className="break-all">{entry.source}: {entry.message}</li>
                  ))}
                </ul>
              )}
            </details>

            {submit.isError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                The report could not be sent: {submit.error instanceof Error ? submit.error.message : 'unknown error'}. Your text is kept; please try again.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Sending…' : 'Send Report'}
            </button>
          </div>
        </form>
      </ModalSurface>
    </div>
  )
}
