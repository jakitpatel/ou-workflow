import { useMemo } from 'react'
import type React from 'react'
import { Check, FileText, Mail, Search, UserRoundCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { InspectionInvoicePreview } from '@/features/applications/components/InspectionInvoicePreview'
import {
  formatCurrency,
  getApplicantAccountNumber,
  useInspectionInvoiceDrawerState,
} from '@/features/applications/hooks/useInspectionInvoiceDrawerState'
import type { Applicant } from '@/types/application'

type Props = {
  open: boolean
  applicant?: Applicant
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
  onClose: () => void
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode
  title: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-900">{title}</div>
      {children}
    </section>
  )
}

function YesNoGroup({
  disabled,
  value,
  onChange,
}: {
  disabled?: boolean
  value: boolean | null
  onChange: (value: boolean) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-gray-300">
      {[
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
            value === option.value
              ? option.value
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ProgressStrip({ stage }: { stage: string }) {
  const steps = [
    { id: 'setup', label: 'Setup' },
    { id: 'generated', label: 'Generate' },
    { id: 'sent-captured', label: 'Send Email' },
    { id: 'paid', label: 'Paid' },
  ]
  const activeIndex =
    stage === 'setup' || stage === 'configured'
      ? 0
      : stage === 'generated' || stage === 'outlook-opened'
        ? 1
        : stage === 'sent-captured'
          ? 2
          : 3

  return (
    <div className="grid grid-cols-4 border-b bg-white">
      {steps.map((step, index) => {
        const isActive = index <= activeIndex
        return (
          <div
            key={step.id}
            className={`flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold ${
              isActive ? 'text-blue-700' : 'text-gray-400'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function InspectionInvoiceDrawer({
  open,
  applicant,
  applicationId,
  applicationName,
  taskInstanceId,
  taskName,
  onClose,
}: Props) {
  const state = useInspectionInvoiceDrawerState({
    applicant,
    applicationId,
    applicationName,
    enabled: open,
    taskInstanceId,
    taskName,
  })
  const accountNumber = getApplicantAccountNumber(applicant) || String(applicationId ?? '')
  const resolvedName = applicationName || applicant?.company || 'Application'
  const emailSubject = useMemo(() => {
    const feeType = state.isApplicationFeeOnly ? 'Application Fee' : 'Initial Inspection'
    return `OU Kosher - ${feeType} Invoice for ${applicant?.plant || resolvedName} [${accountNumber || 'App'}]`
  }, [accountNumber, applicant?.plant, resolvedName, state.isApplicationFeeOnly])

  if (!open) return null

  const primaryActionLabel =
    state.isGeneratingInvoice
      ? 'Generating...'
      : state.stage === 'setup' || state.stage === 'configured'
        ? 'Generate Invoice'
      : state.stage === 'generated' || state.stage === 'outlook-opened'
        ? 'Review Email'
        : state.stage === 'sent-captured'
          ? 'Mark Paid'
          : 'Paid'

  const emailAttachment = `Invoice_${state.invoiceId ?? 'DRAFT'}.pdf`
  const emailMessageText = `To Customer,

Thank you for your interest in OU Kosher. Please find the ${
    state.isApplicationFeeOnly ? 'application fee' : 'initial inspection'
  } invoice enclosed for your review. Payment can be made online through OUDirect by ACH or credit card.

Company: ${resolvedName}
Plant: ${applicant?.plant || '-'}
Account Number: ${accountNumber || '-'}`

  const onPrimaryClick = async () => {
    if (state.stage === 'setup' || state.stage === 'configured') {
      try {
        const invoiceId = await state.generateInvoice()
        if (invoiceId) {
          toast.success(`Invoice ${invoiceId} generated`)
        } else {
          toast.error('Complete the required invoice fields first')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to generate invoice'
        toast.error(message)
      }
      return
    }

    if (state.stage === 'generated' || state.stage === 'outlook-opened') {
      state.openEmailPreview()
      return
    }

    if (state.stage === 'sent-captured') {
      try {
        await state.markPaid()
        toast.success('Invoice marked paid')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to mark invoice paid'
        toast.error(message)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-[98vw] flex-col overflow-hidden bg-white shadow-2xl xl:max-w-[82vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b bg-gray-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-300" />
                <h3 className="text-lg font-semibold">Inspection Invoice</h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                {taskName ? <span className="rounded-full bg-white/10 px-2.5 py-1">{taskName}</span> : null}
                <span className="rounded-full bg-white/10 px-2.5 py-1">{resolvedName}</span>
                {accountNumber ? <span className="rounded-full bg-white/10 px-2.5 py-1">App #{accountNumber}</span> : null}
                {applicant?.plant ? <span className="rounded-full bg-white/10 px-2.5 py-1">Plant: {applicant.plant}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
              aria-label="Close inspection invoice drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ProgressStrip stage={state.stage} />

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
          <div className="min-h-0 space-y-4 overflow-y-auto bg-gray-50 p-5">
            <Section title="1. Inspection">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">Inspection needed?</div>
                  <p className="mt-1 text-xs text-gray-500">If yes, pick the RFR who will inspect.</p>
                </div>
                <YesNoGroup disabled={state.isLocked} value={state.inspectionNeeded} onChange={state.setInspection} />
              </div>

              {state.inspectionNeeded === true ? (
                <div className="mt-4">
                  {state.selectedRfr ? (
                    <div className="rounded border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-blue-950">{state.selectedRfr.name}</div>
                          {state.selectedRfr.userName ? (
                            <div className="mt-1 text-xs text-blue-800">{state.selectedRfr.userName}</div>
                          ) : null}
                          {state.selectedRfr.email ? (
                            <div className="mt-1 text-xs text-blue-700">{state.selectedRfr.email}</div>
                          ) : null}
                          {state.selectedRfr.state ? (
                            <div className="mt-1 text-xs text-blue-700">State: {state.selectedRfr.state}</div>
                          ) : null}
                          {state.selectedRfr.pctOfTotalApps > 0 || state.selectedRfr.pctOfTotalAppsAtWork > 0 ? (
                            <div className="mt-1 text-xs text-blue-700">
                              {state.selectedRfr.pctOfTotalApps > 0 ? `${state.selectedRfr.pctOfTotalApps}% total` : ''}
                              {state.selectedRfr.pctOfTotalApps > 0 && state.selectedRfr.pctOfTotalAppsAtWork > 0 ? ' | ' : ''}
                              {state.selectedRfr.pctOfTotalAppsAtWork > 0 ? `${state.selectedRfr.pctOfTotalAppsAtWork}% at work` : ''}
                            </div>
                          ) : null}
                        </div>
                        {!state.isLocked ? (
                          <button
                            type="button"
                            onClick={state.changeRfr}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            Change
                          </button>
                        ) : null}
                      </div>
                      {state.awaitPayment ? (
                        <div className="mt-3 rounded border border-blue-200 bg-white px-3 py-2 text-xs text-blue-800">
                          RFR notification waits until payment is received.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          value={state.rfrSearch}
                          onChange={(event) => state.setRfrSearch(event.target.value)}
                          placeholder="Search by name or region..."
                          className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
                        {state.isRfrListLoading ? (
                          <div className="rounded border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500">
                            Loading RFR list...
                          </div>
                        ) : state.isRfrListError ? (
                          <div className="rounded border border-red-200 bg-red-50 px-3 py-6 text-center text-sm text-red-700">
                            Unable to load RFR list.
                          </div>
                        ) : state.filteredRfrs.length === 0 ? (
                          <div className="rounded border border-gray-200 bg-white px-3 py-6 text-center text-sm text-gray-500">
                            No RFR matches found.
                          </div>
                        ) : (
                          state.filteredRfrs.map((rfr) => (
                            <button
                              key={rfr.lookupKey}
                              type="button"
                              onClick={() => state.pickRfr(rfr)}
                              className="w-full rounded border border-gray-200 bg-white p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium text-gray-900">{rfr.name}</div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    {[rfr.userName, rfr.email].filter(Boolean).join(' - ') || '-'}
                                  </div>
                                  {rfr.state ? (
                                    <div className="mt-1 text-xs text-gray-500">State: {rfr.state}</div>
                                  ) : null}
                                  {rfr.pctOfTotalApps > 0 || rfr.pctOfTotalAppsAtWork > 0 ? (
                                    <div className="mt-1 text-xs text-gray-500">
                                      {rfr.pctOfTotalApps > 0 ? `${rfr.pctOfTotalApps}% total` : ''}
                                      {rfr.pctOfTotalApps > 0 && rfr.pctOfTotalAppsAtWork > 0 ? ' | ' : ''}
                                      {rfr.pctOfTotalAppsAtWork > 0 ? `${rfr.pctOfTotalAppsAtWork}% at work` : ''}
                                    </div>
                                  ) : null}
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${rfr.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {rfr.status === 'available' ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {state.isLocked ? (
                    <div className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      RFR is locked after invoice generation. Use edit to revise and regenerate.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {state.inspectionNeeded === false ? (
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase text-gray-500">Reason</label>
                  <select
                    value={state.noInspectionReason}
                    disabled={state.isLocked}
                    onChange={(event) => state.setNoInspectionReason(event.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Select reason</option>
                    <option>Known group plant - inspection on file</option>
                    <option>Additional facility of existing certified plant</option>
                    <option>Waived per RC approval</option>
                    <option>Other - explain in notes</option>
                  </select>
                </div>
              ) : null}
            </Section>

            <Section title="2. Inspection Fee">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">Inspection fee needed?</div>
                  <p className="mt-1 text-xs text-gray-500">The application fee is always charged.</p>
                </div>
                <YesNoGroup disabled={state.isLocked} value={state.feeRequired} onChange={state.setFeeRequiredValue} />
              </div>

              {state.feeRequired === false ? (
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase text-gray-500">Why no inspection fee?</label>
                  <select
                    value={state.noFeeReason}
                    disabled={state.isLocked}
                    onChange={(event) => state.setNoFeeReason(event.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Select reason</option>
                    <option>OU group plant - inspection fee waived</option>
                    <option>Additional facility of existing certified company</option>
                    <option>Inspection fee deferred per RC approval</option>
                    <option>Other - explain in notes</option>
                  </select>
                </div>
              ) : null}
            </Section>

            {state.inspectionNeeded === true && state.feeRequired === true ? (
              <Section title="3. Notification">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Wait for payment before notifying RFR?</div>
                    <p className="mt-1 text-xs text-gray-500">Default yes. Choose no only for rush or trusted cases.</p>
                  </div>
                  <YesNoGroup disabled={state.isLocked} value={state.awaitPayment} onChange={state.setAwaitPayment} />
                </div>
              </Section>
            ) : null}

            <Section
              title={
                <div className="flex items-center justify-between gap-3">
                  <span>4. Invoice Details</span>
                  {state.isLocked ? (
                    <button
                      type="button"
                      onClick={state.unlockForEdit}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              }
            >
              {state.isLocked ? (
                <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Invoice generated. Editing will invalidate the current invoice ID.
                </div>
              ) : null}
              {state.isApplicationFeeOnly ? (
                <div className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  Application Fee only: standard $300 application fee.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">Fee</span>
                  <input
                    value={state.feeAmount}
                    disabled={state.isLocked}
                    onChange={(event) => state.setFeeAmount(event.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">Expenses</span>
                  <input
                    value={state.expenseAmount}
                    disabled={state.isLocked}
                    onChange={(event) => state.setExpenseAmount(event.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">Invoice Date</span>
                  <input
                    type="date"
                    value={state.invoiceDate}
                    disabled={state.isLocked}
                    onChange={(event) => state.setInvoiceDate(event.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">Invoice ID</span>
                  <input
                    value={state.invoiceId ?? 'Auto-generated on save'}
                    readOnly
                    className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
                  />
                </label>
              </div>
              <label className="mt-3 block text-sm">
                <span className="text-xs font-semibold uppercase text-gray-500">Internal notes</span>
                <textarea
                  value={state.internalNotes}
                  disabled={state.isLocked}
                  onChange={(event) => state.setInternalNotes(event.target.value)}
                  rows={3}
                  placeholder="Visible only to NCRC / admin. Not included in invoice PDF."
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                />
              </label>
            </Section>

            <Section title="5. Email Recipients">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-gray-500">To customer contact</span>
                <select
                  value={state.recipient}
                  onChange={(event) => state.setRecipient(event.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Primary contact</option>
                  <option value="billing">Billing contact</option>
                  <option value="new">Add new contact...</option>
                </select>
              </label>
              <div className="mt-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-6 text-gray-700">
                <div><strong>RC:</strong> Assigned RC</div>
                <div><strong>NCRC:</strong> Current user</div>
                <div><strong>RC Coord:</strong> Assigned coordinator</div>
                <div className="text-gray-500">BCC: productAutomation@ou.org</div>
              </div>
              <label className="mt-3 block text-sm">
                <span className="text-xs font-semibold uppercase text-gray-500">Letter template</span>
                <select
                  value={state.letterTemplate}
                  onChange={(event) => state.setLetterTemplate(event.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option>Initial Inspection Fee - New Plant</option>
                  <option>Initial Inspection Fee - Additional Facility</option>
                  <option>Application Fee - New Plant</option>
                </select>
              </label>
              {state.sentAt ? (
                <div className="mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                  Invoice sent - {state.sentAt}
                </div>
              ) : null}
            </Section>

            <Section title="6. Payment Status">
              {state.paidAt ? (
                <div className="rounded border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
                    <Check className="h-4 w-4" />
                    Paid in full
                  </div>
                  <div className="mt-1 text-xs text-green-700">
                    {formatCurrency(state.subtotal)} received. Posted {state.paidAt}.
                  </div>
                </div>
              ) : (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Awaiting payment. This would auto-update from Kashrus once connected.
                </div>
              )}
            </Section>
          </div>

          <InspectionInvoicePreview
            applicant={applicant}
            expenseAmount={state.expenses}
            feeAmount={state.fee}
            invoiceDate={state.invoiceDate}
            invoiceDownloadLink={state.invoiceDownloadLink}
            invoiceId={state.invoiceId}
            isApplicationFeeOnly={state.isApplicationFeeOnly}
            paid={state.stage === 'paid'}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t bg-white px-5 py-3">
          <div className="min-w-0 text-sm text-gray-600">
            {state.stage === 'paid'
              ? 'Invoice paid. Assignment can proceed when applicable.'
              : state.canGenerate
                ? state.invoiceId
                  ? state.invoiceDownloadLink
                    ? `Invoice ${state.invoiceId} generated. PDF is ready to download.`
                    : `Invoice ${state.invoiceId} generated.`
                  : 'Ready to generate. Invoice ID is assigned on generate.'
                : 'Complete required selections to generate the invoice.'}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onPrimaryClick}
              disabled={
                state.isGeneratingInvoice ||
                state.isMarkingPaid ||
                ((state.stage === 'setup' || state.stage === 'configured') && !state.canGenerate) ||
                state.stage === 'paid'
              }
              className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {state.stage === 'generated' || state.stage === 'outlook-opened' ? <Mail className="h-4 w-4" /> : null}
              {state.isMarkingPaid ? 'Marking paid...' : primaryActionLabel}
            </button>
          </div>
        </div>

        {state.showEmailPreview ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl">
              <div className="border-b px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Review Email</h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Review the message details before sending the invoice PDF.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => state.setShowEmailPreview(false)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100"
                    aria-label="Close email preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4 px-5 py-4">
                <div className="rounded border border-gray-200">
                  <div className="grid grid-cols-[80px_1fr] border-b px-3 py-2 text-sm">
                    <span className="font-medium text-gray-500">To</span>
                    <span>{state.recipient === 'billing' ? 'Billing contact' : 'Primary contact'}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] border-b px-3 py-2 text-sm">
                    <span className="font-medium text-gray-500">Subject</span>
                    <span>{emailSubject}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] px-3 py-2 text-sm">
                    <span className="font-medium text-gray-500">Attach</span>
                    <span>{emailAttachment}</span>
                  </div>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {emailMessageText.split('\n').map((line, index) =>
                    line ? (
                      <p key={`${line}-${index}`} className={index === 0 ? undefined : 'mt-3'}>
                        {line}
                      </p>
                    ) : null,
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
                <button
                  type="button"
                  onClick={() => state.setShowEmailPreview(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={state.isSendingEmail}
                  onClick={async () => {
                    try {
                      await state.sendEmail({
                        attachments: emailAttachment,
                        messageText: emailMessageText,
                        subject: emailSubject,
                        toUser: state.recipient === 'billing' ? 'Billing contact' : 'Primary contact',
                      })
                      toast.success('Email sent')
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'Unable to send email'
                      toast.error(message)
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <UserRoundCheck className="h-4 w-4" />
                  {state.isSendingEmail ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
