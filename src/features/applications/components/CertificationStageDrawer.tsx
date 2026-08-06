import { Check, Clock3, FileText, Mail, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCertificationStageDrawerState } from '@/features/applications/hooks/useCertificationStageDrawerState'
import type { Applicant, Task } from '@/types/application'

type Props = {
  open: boolean
  applicant?: Applicant
  task?: Task
  onClose: () => void
}

const steps = [
  { id: 'waiting', label: 'Wait for Bichel' },
  { id: 'welcome-email', label: 'Generate Welcome Email' },
  { id: 'certified', label: 'Certified' },
] as const

export function CertificationStageDrawer({ open, applicant, task, onClose }: Props) {
  const state = useCertificationStageDrawerState({ applicant, task, enabled: open })
  if (!open) return null

  const activeIndex = steps.findIndex((step) => step.id === state.stage)
  const company = applicant?.company || 'Application'
  const accountNumber = String(applicant?.companyId ?? '').trim()

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <aside
        className="fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl xl:max-w-[82vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b bg-gray-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sky-300">
                <FileText className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Certification Stage
                </span>
              </div>
              <h2 className="mt-1 truncate text-xl font-semibold text-white">{company}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                {task?.name ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">{task.name}</span>
                ) : null}
                {applicant?.plant ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">
                    Plant: {applicant.plant}
                  </span>
                ) : null}
                {state.applicationId ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">
                    App: {state.applicationId}
                  </span>
                ) : null}
                {accountNumber ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">
                    Company: {accountNumber}
                  </span>
                ) : null}
                {applicant?.region ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">
                    Region: {applicant.region}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
              aria-label="Close certification drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 border-b bg-white">
          {steps.map((step, index) => {
            const complete = index < activeIndex
            const active = index === activeIndex
            return (
              <div
                key={step.id}
                className={`flex items-center justify-center gap-2 px-3 py-4 text-xs font-semibold ${active ? 'text-blue-700' : complete ? 'text-green-700' : 'text-gray-400'}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : complete ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                >
                  {complete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span>{step.label}</span>
              </div>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-5">
          {state.stage === 'waiting' ? (
            <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900">Wait for Bichel Email</h3>
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800">
                  <Clock3 className="h-4 w-4" /> Waiting for the Bichel email…
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">
                  The workflow waits for the certification confirmation from Kashrus at
                  productAutomation@ou.org.
                </p>
                <button
                  type="button"
                  disabled={state.isSaving}
                  onClick={async () => {
                    try {
                      await state.recordBichelReceived()
                      toast.success('Bichel email recorded')
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : 'Unable to record Bichel email',
                      )
                    }
                  }}
                  className="mt-5 w-full rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                >
                  {state.isSaving ? 'Recording…' : 'Record Bichel Email Received'}
                </button>
              </section>
              <section className="flex min-h-72 items-center justify-center rounded-xl border bg-white p-8 text-center shadow-sm">
                <div>
                  <Clock3 className="mx-auto h-9 w-9 text-gray-300" />
                  <div className="mt-3 font-semibold text-gray-600">
                    Waiting for the Bichel email
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    It will appear here when it arrives from Kashrus.
                  </p>
                </div>
              </section>
            </div>
          ) : null}

          {state.stage === 'welcome-email' ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(380px,0.9fr)_minmax(480px,1.1fr)]">
              <section className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <strong>Bichel Email Received</strong>
                  <div className="mt-1 text-xs">
                    Received {state.bichelReceivedAt} via productAutomation@ou.org.
                  </div>
                </div>
                <label className="mt-4 block text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">Template</span>
                  <select
                    value={state.template}
                    onChange={(event) =>
                      state.selectTemplate(event.target.value as 'new' | 'existing')
                    }
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  >
                    <option value="new">New Company &amp; Plant</option>
                    <option value="existing">Existing Company - New Plant</option>
                  </select>
                </label>
                <label className="mt-3 block text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">To</span>
                  <input
                    type="email"
                    value={state.to}
                    onChange={(event) => state.setTo(event.target.value)}
                    placeholder={state.detailLoading ? 'Loading contact…' : 'customer@example.com'}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  />
                </label>
                {state.detailError ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Contacts could not be loaded; enter a recipient manually.
                  </p>
                ) : null}
                <label className="mt-3 block text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Additional recipients
                  </span>
                  <input
                    value={state.cc}
                    onChange={(event) => state.setCc(event.target.value)}
                    placeholder="Separate emails with commas"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="mt-3 block text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">Subject</span>
                  <input
                    value={state.subject}
                    onChange={(event) => state.setSubject(event.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="mt-3 block text-sm">
                  <span className="text-xs font-semibold uppercase text-gray-500">Body</span>
                  <textarea
                    value={state.body}
                    onChange={(event) => state.setBody(event.target.value)}
                    rows={13}
                    className="mt-1 w-full resize-y rounded border border-gray-300 px-3 py-2 leading-6"
                  />
                </label>
                <div className="mt-3">
                  <span className="text-xs font-semibold uppercase text-gray-500">Attachments</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {state.attachments.map((file, index) => (
                      <span
                        key={`${file}-${index}`}
                        className="inline-flex items-center gap-1 rounded border bg-gray-50 px-2 py-1 text-xs"
                      >
                        <Paperclip className="h-3 w-3" />
                        {file}
                        <button
                          type="button"
                          onClick={() =>
                            state.setAttachments(
                              state.attachments.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          aria-label={`Remove ${file}`}
                        >
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="file"
                    multiple
                    className="mt-2 block w-full text-xs"
                    onChange={(event) =>
                      state.setAttachments([
                        ...state.attachments,
                        ...Array.from(event.target.files ?? []).map((file) => file.name),
                      ])
                    }
                  />
                </div>
                <button
                  type="button"
                  disabled={
                    state.isSaving ||
                    !state.to.trim() ||
                    !state.subject.trim() ||
                    !state.body.trim()
                  }
                  onClick={async () => {
                    try {
                      await state.sendWelcomeEmail()
                      toast.success('Welcome email sent and application certified')
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : 'Unable to send welcome email',
                      )
                    }
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                  <Mail className="h-4 w-4" />
                  {state.isSaving ? 'Sending…' : 'Send Welcome Email & Certify'}
                </button>
              </section>
              <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="border-b bg-gray-50 px-5 py-4">
                  <h3 className="font-semibold text-gray-900">
                    Bichel / Certification Confirmation
                  </h3>
                  <div className="mt-3 grid grid-cols-[75px_1fr] gap-y-1 text-xs">
                    <span className="text-gray-500">From</span>
                    <span>Kashrus</span>
                    <span className="text-gray-500">To</span>
                    <span>productAutomation@ou.org</span>
                    <span className="text-gray-500">Captured</span>
                    <span>{state.bichelReceivedAt}</span>
                    <span className="text-gray-500">App</span>
                    <span>{state.applicationId}</span>
                  </div>
                </div>
                <div className="p-5 text-sm leading-7 text-gray-700">
                  The Bichel for <strong>{applicant?.plant || 'this plant'}</strong> ({company}) has
                  been completed in Kashrus. The welcome email can now be sent and the certification
                  task completed.
                </div>
              </section>
            </div>
          ) : null}

          {state.stage === 'certified' ? (
            <section className="mx-auto max-w-2xl rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-700" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-green-900">
                Certified - Stage complete
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                The Bichel email was received, the welcome email was sent, and the certificate task
                was completed.
              </p>
              {state.sentAt ? (
                <p className="mt-3 text-xs text-gray-500">Welcome email sent {state.sentAt}.</p>
              ) : null}
            </section>
          ) : null}
        </div>

        <footer className="flex items-center justify-between border-t bg-white px-5 py-3">
          <span className="text-sm text-gray-600">
            {state.stage === 'waiting'
              ? 'Waiting for Bichel confirmation.'
              : state.stage === 'welcome-email'
                ? 'Bichel received. Review and send the welcome email.'
                : 'Certification workflow complete.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </footer>
      </aside>
    </div>
  )
}
