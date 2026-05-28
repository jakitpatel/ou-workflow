import { Fragment, useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  Download,
  Eye,
  FileText,
  Flag,
  MessageSquare,
  Package,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useUser } from '@/context/UserContext'
import {
  createApplicationMessage,
  createScheduleAIngredient,
  type CreateScheduleAIngredientPayload,
} from '@/features/applications/api'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import {
  mapApplicationIngredientRow,
  mapKashIngredientRow,
  type ScheduleAIngredientRow,
  useScheduleACommunicationRounds,
  useScheduleAIngredients,
  useScheduleAIngredientsScratchpad,
} from '@/features/applications/hooks/useScheduleAIngredients'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'

type ScheduleATab = 'application' | 'kashrus' | 'communication' | 'eir' | 'signoff'

type Props = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number | null
  taskName?: string
  onClose: () => void
}

type ApplicationIngredientDraft = {
  name: string
  source: string
  brand: string
  rmc: string
  ukd: string
  attachment: string
}

const EMPTY_DRAFT: ApplicationIngredientDraft = {
  name: '',
  source: '',
  brand: '',
  rmc: '',
  ukd: '',
  attachment: '',
}

const TABS: Array<{ id: ScheduleATab; label: string }> = [
  { id: 'application', label: 'Application' },
  { id: 'kashrus', label: 'Kashrus' },
  { id: 'communication', label: 'Communication' },
  { id: 'eir', label: 'EIR' },
  { id: 'signoff', label: 'Sign-off' },
]

const formatValue = (value: unknown) => {
  const text = String(value ?? '').trim()
  return text || '-'
}

const activeRows = (
  rows: ScheduleAIngredientRow[],
  deleted: Record<string, boolean>,
) => rows.filter((row) => !deleted[row.id])

const downloadTextFile = (filename: string, text: string, type = 'text/csv;charset=utf-8;') => {
  const blob = new Blob(['\uFEFF' + text], { type })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}

const findPrimaryContactEmail = (contacts?: Array<Record<string, unknown>>) => {
  const primaryContact =
    contacts?.find((contact) => String(contact.type ?? contact.Type ?? '').toLowerCase() === 'primary contact') ??
    contacts?.find((contact) => String(contact.IsPrimaryContact ?? contact.isPrimaryContact ?? '').toLowerCase() === 'true')

  const email = primaryContact?.email ?? primaryContact?.Email ?? primaryContact?.EMail ?? primaryContact?.contactEmail
  return String(email ?? '').trim()
}

function StatusPill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' }) {
  const classes = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[tone]}`}>
      {children}
    </span>
  )
}

function AttachmentControl({
  row,
  disabled,
  filename,
  onAttach,
  onRemove,
}: {
  row: ScheduleAIngredientRow
  disabled?: boolean
  filename: string
  onAttach: (rowId: string, filename: string) => void
  onRemove: (rowId: string) => void
}) {
  if (filename) {
    return (
      <span className="inline-flex max-w-[150px] items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
        <Paperclip className="h-3 w-3 shrink-0" />
        <span className="truncate" title={filename}>{filename}</span>
        {!disabled ? (
          <button
            type="button"
            className="text-blue-400 hover:text-red-500"
            onClick={() => onRemove(row.id)}
            aria-label={`Remove attachment for ${row.name || row.rmc}`}
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </span>
    )
  }

  if (disabled) return <span className="text-xs text-gray-300">-</span>

  return (
    <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600">
      <Plus className="h-3 w-3" />
      Attach
      <input
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) onAttach(row.id, file.name)
          event.currentTarget.value = ''
        }}
      />
    </label>
  )
}

function ScheduleATable({
  applicationId,
  rows,
  allRows,
  variant,
  scratchpadApi,
  onViewApplication,
}: {
  applicationId?: string
  rows: ScheduleAIngredientRow[]
  allRows: ScheduleAIngredientRow[]
  variant: 'application' | 'kashrus'
  scratchpadApi: ReturnType<typeof useScheduleAIngredientsScratchpad>
  onViewApplication: (applicationId?: string | number) => void
}) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<ApplicationIngredientDraft | null>(null)
  const [submitError, setSubmitError] = useState('')
  const { scratchpad } = scratchpadApi
  const isFrozen = scratchpad.signedOff
  const activeCount = activeRows(rows, scratchpad.deleted).length
  const flaggedCount = allRows.filter((row) => scratchpad.flags[row.id]?.flagged && !scratchpad.deleted[row.id]).length

  const createIngredientMutation = useMutation({
    mutationFn: createScheduleAIngredient,
    onSuccess: async () => {
      setDraft(null)
      setSubmitError('')
      await queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.scheduleAIngredients(applicationId),
      })
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to add Schedule A ingredient.'
      setSubmitError(message)
    },
  })

  const updateDraft = (field: keyof ApplicationIngredientDraft, value: string) => {
    setDraft((current) => ({ ...(current ?? EMPTY_DRAFT), [field]: value }))
  }

  const saveDraft = () => {
    if (!draft?.name.trim() && !draft?.rmc.trim()) {
      setSubmitError('Enter at least a Name or RMC before saving.')
      return
    }

    const localRow = {
      name: draft.name.trim(),
      source: draft.source.trim(),
      brand: draft.brand.trim(),
      rmc: draft.rmc.trim(),
      ukd: draft.ukd.trim(),
      fn: '',
      group: '',
      attachment: draft.attachment.trim(),
    }

    if (!applicationId) {
      scratchpadApi.addLocalRow(localRow)
      setDraft(null)
      return
    }

    const payload: CreateScheduleAIngredientPayload = {
      ApplicationID: applicationId,
      ingredientLabelName: localRow.name || undefined,
      manufacturer: localRow.source || undefined,
      source: localRow.source || undefined,
      brandName: localRow.brand || undefined,
      rawMaterialCode: localRow.rmc || undefined,
      UKDID: localRow.ukd || undefined,
      attachment: localRow.attachment || undefined,
    }

    createIngredientMutation.mutate({ payload, token })
  }

  const downloadScratchpad = () => {
    const date = new Date().toISOString().slice(0, 10)
    downloadTextFile(`ScheduleA_${applicationId ?? 'application'}_Scratchpad_${date}.csv`, scratchpadApi.buildScratchpadCsv(allRows))
  }

  const inputClassName =
    'h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {variant === 'application' ? 'Application Ingredients' : 'Kashrus Ingredients'}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{activeCount} ingredient{activeCount === 1 ? '' : 's'}</span>
            <StatusPill tone={flaggedCount ? 'amber' : 'green'}>{flaggedCount} flagged</StatusPill>
            {isFrozen ? <StatusPill tone="green">Signed - frozen</StatusPill> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadScratchpad}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          {variant === 'application' ? (
            <>
              <button
                type="button"
                onClick={() => onViewApplication(applicationId)}
                disabled={!applicationId}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                <Eye className="h-3.5 w-3.5" />
                View Application
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(EMPTY_DRAFT)
                  setSubmitError('')
                }}
                disabled={Boolean(draft) || createIngredientMutation.isPending || isFrozen}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-start gap-2 border-b border-indigo-100 bg-indigo-50 px-5 py-2.5 text-xs text-indigo-700">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <p>
          <span className="font-semibold">Scratchpad mode</span> - flags, notes, added rows, attachments, and
          deletions are workflow state. They do not write to Kashrus.
        </p>
      </div>

      {submitError ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">{submitError}</div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-[4%] px-3 py-2.5">#</th>
              <th className="w-[18%] px-3 py-2.5">Name</th>
              <th className="w-[14%] px-3 py-2.5">Source</th>
              <th className="w-[13%] px-3 py-2.5">Brand</th>
              {variant === 'application' ? <th className="w-[10%] px-3 py-2.5">RMC</th> : null}
              <th className="w-[10%] px-3 py-2.5">UKDID</th>
              {variant === 'kashrus' ? (
                <>
                  <th className="w-[12%] px-3 py-2.5">Function</th>
                  <th className="w-[8%] px-3 py-2.5">Group</th>
                </>
              ) : null}
              <th className="w-[13%] px-3 py-2.5">Attachment</th>
              <th className="w-[10%] px-3 py-2.5">Status</th>
              <th className="w-[10%] px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {draft && variant === 'application' ? (
              <tr className="align-top bg-blue-50/50">
                <td className="px-3 py-3 text-xs text-blue-500">+</td>
                <td className="px-3 py-3"><input className={inputClassName} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Ingredient name" /></td>
                <td className="px-3 py-3"><input className={inputClassName} value={draft.source} onChange={(event) => updateDraft('source', event.target.value)} placeholder="Source" /></td>
                <td className="px-3 py-3"><input className={inputClassName} value={draft.brand} onChange={(event) => updateDraft('brand', event.target.value)} placeholder="Brand" /></td>
                <td className="px-3 py-3"><input className={inputClassName} value={draft.rmc} onChange={(event) => updateDraft('rmc', event.target.value)} placeholder="RMC" /></td>
                <td className="px-3 py-3"><input className={inputClassName} value={draft.ukd} onChange={(event) => updateDraft('ukd', event.target.value)} placeholder="UKDID" /></td>
                <td className="px-3 py-3">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-500">
                    <Paperclip className="h-3 w-3" />
                    {draft.attachment || 'Attach'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => updateDraft('attachment', event.currentTarget.files?.[0]?.name ?? '')}
                    />
                  </label>
                </td>
                <td className="px-3 py-3"><StatusPill tone="blue">New</StatusPill></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={saveDraft} className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white hover:bg-green-700" title="Save row">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setDraft(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50" title="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ) : null}

            {rows.length === 0 && !draft ? (
              <tr>
                <td colSpan={variant === 'application' ? 10 : 11} className="px-4 py-8 text-center text-sm text-gray-500">
                  No {variant === 'application' ? 'Application' : 'Kashrus'} ingredients found.
                </td>
              </tr>
            ) : null}

            {rows.map((row, index) => {
              const flagged = scratchpad.flags[row.id]?.flagged && !scratchpad.deleted[row.id]
              const halachaOpen = scratchpad.halacha[row.id]?.open && !scratchpad.deleted[row.id]
              const deleted = scratchpad.deleted[row.id]
              const resolved = scratchpad.rounds.some((round) => round.items.some((item) => item.ingId === row.id && item.resolved))
              const note = scratchpad.flags[row.id]?.note ?? ''
              const attachment = scratchpad.attachments[row.id] || row.attachment

              return (
                <Fragment key={row.id}>
                  <tr
                    className={`align-top ${deleted ? 'bg-gray-50 text-gray-400' : resolved ? 'bg-green-50' : flagged ? 'bg-amber-50' : halachaOpen ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-3 text-xs text-gray-400">{index + 1}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      <div className={`truncate ${deleted ? 'text-gray-400 line-through' : halachaOpen ? 'text-red-700' : ''}`} title={formatValue(row.name)}>
                        {formatValue(row.name)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.origin === 'IAR-added' ? <StatusPill tone="purple">Added</StatusPill> : null}
                        {resolved ? <StatusPill tone="green">Resolved</StatusPill> : null}
                        {halachaOpen ? <StatusPill tone="red">Halachic review</StatusPill> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700"><div className="truncate" title={formatValue(row.source)}>{formatValue(row.source)}</div></td>
                    <td className="px-3 py-3 text-gray-700"><div className="truncate" title={formatValue(row.brand)}>{formatValue(row.brand)}</div></td>
                    {variant === 'application' ? (
                      <td className="px-3 py-3 font-mono text-xs text-gray-600"><div className="truncate" title={formatValue(row.rmc)}>{formatValue(row.rmc)}</div></td>
                    ) : null}
                    <td className="px-3 py-3 font-mono text-xs text-gray-600"><div className="truncate" title={formatValue(row.ukd)}>{formatValue(row.ukd)}</div></td>
                    {variant === 'kashrus' ? (
                      <>
                        <td className="px-3 py-3 text-gray-700"><div className="truncate" title={formatValue(row.fn)}>{formatValue(row.fn)}</div></td>
                        <td className="px-3 py-3">{row.group ? <StatusPill tone={String(row.group) === '2' || String(row.group).includes('2') ? 'amber' : 'gray'}>{row.group}</StatusPill> : '-'}</td>
                      </>
                    ) : null}
                    <td className="px-3 py-3">
                      <AttachmentControl
                        row={row}
                        disabled={isFrozen || deleted}
                        filename={attachment}
                        onAttach={scratchpadApi.setAttachment}
                        onRemove={scratchpadApi.removeAttachment}
                      />
                    </td>
                    <td className="px-3 py-3"><StatusPill tone={deleted ? 'gray' : flagged ? 'amber' : 'green'}>{deleted ? 'Deleted' : row.status || 'Active'}</StatusPill></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {!deleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => scratchpadApi.toggleFlag(row.id)}
                              disabled={isFrozen}
                              className={`rounded p-1 ${flagged ? 'bg-amber-100 text-amber-600' : 'text-gray-300 hover:bg-amber-50 hover:text-amber-500'} disabled:cursor-not-allowed`}
                              title="Flag for follow-up"
                            >
                              <Flag className="h-4 w-4" fill={flagged ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              type="button"
                              onClick={() => scratchpadApi.toggleHalacha(row.id)}
                              disabled={isFrozen}
                              className={`rounded p-1 ${halachaOpen ? 'bg-red-100 text-red-600' : 'text-gray-300 hover:bg-red-50 hover:text-red-600'} disabled:cursor-not-allowed`}
                              title="Flag for halachic review"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : null}
                        {variant === 'application' ? (
                          <button
                            type="button"
                            onClick={() => scratchpadApi.toggleDeleted(row.id)}
                            disabled={isFrozen}
                            className={`rounded p-1 ${deleted ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 hover:bg-red-50 hover:text-red-500'} disabled:cursor-not-allowed`}
                            title={deleted ? 'Restore row' : 'Mark deleted'}
                          >
                            {deleted ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {flagged && !resolved ? (
                    <tr key={`${row.id}-note`} className="bg-amber-50">
                      <td colSpan={variant === 'application' ? 10 : 11} className="px-4 pb-3 pt-0">
                        <input
                          type="text"
                          value={note}
                          onChange={(event) => scratchpadApi.updateFlagNote(row.id, event.target.value)}
                          placeholder="Add follow-up note. This becomes the question sent to the company."
                          className="w-full rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs text-gray-800 outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </td>
                    </tr>
                  ) : null}
                  {halachaOpen ? (
                    <tr key={`${row.id}-halacha`} className="bg-red-50">
                      <td colSpan={variant === 'application' ? 10 : 11} className="px-4 pb-3 pt-0">
                        <div className="rounded-md border border-red-200 bg-white p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-red-700">Halachic review - R. Herbsman</span>
                            <button type="button" className="text-xs font-medium text-red-700 hover:underline" onClick={() => scratchpadApi.toggleHalacha(row.id)}>
                              Mark resolved
                            </button>
                          </div>
                          <textarea
                            value={scratchpad.halacha[row.id]?.note ?? ''}
                            onChange={(event) => scratchpadApi.updateHalachaNote(row.id, event.target.value)}
                            rows={2}
                            placeholder="Halachic note, question, sources, or conclusion."
                            className="w-full rounded-md border border-red-200 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-400"
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t bg-gray-50 px-5 py-2 text-xs text-gray-500">
        Group 2 items require a certified source or LOC before Schedule A can be completed.
      </div>
    </div>
  )
}

function CommunicationTab({
  rows,
  applicationName,
  applicationId,
  taskInstanceId,
  primaryContactEmail,
  isPrimaryContactLoading,
  scratchpadApi,
}: {
  rows: ScheduleAIngredientRow[]
  applicationName?: string
  applicationId?: string
  taskInstanceId?: string | number | null
  primaryContactEmail?: string
  isPrimaryContactLoading?: boolean
  scratchpadApi: ReturnType<typeof useScheduleAIngredientsScratchpad>
}) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const { scratchpad } = scratchpadApi
  const unresolved = rows.filter((row) => scratchpad.flags[row.id]?.flagged && !scratchpad.deleted[row.id])
  const [latestEmailId, setLatestEmailId] = useState<string | null>(null)
  const [toEmail, setToEmail] = useState('')
  const [sendError, setSendError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const latestEmail = latestEmailId
    ? scratchpad.rounds.find((round) => round.id === latestEmailId) ?? null
    : null
  const {
    data: backendEmails = [],
    isLoading: isRoundsLoading,
    error: roundsError,
  } = useScheduleACommunicationRounds({ applicationId, taskInstanceId })
  const roundCards = useMemo(
    () =>
      backendEmails
        .map((email) => {
          const subject = String(email.Subject ?? '')
          const roundNumber = Number(subject.match(/round\s+(\d+)/i)?.[1] ?? 0)
          return { email, subject, roundNumber }
        })
        .filter((round) => round.roundNumber > 0 && /ou schedule a/i.test(round.subject))
        .sort((a, b) => b.roundNumber - a.roundNumber || Number(b.email.MessageID ?? 0) - Number(a.email.MessageID ?? 0)),
    [backendEmails],
  )
  const nextRoundNumber = roundCards.length + 1

  useEffect(() => {
    if (latestEmail) {
      setToEmail(latestEmail.email.to || primaryContactEmail || '')
      setSendError('')
      setSentMessage('')
    }
  }, [latestEmail, primaryContactEmail])

  const sendEmailMutation = useMutation({
    mutationFn: createApplicationMessage,
    onSuccess: async () => {
      if (latestEmail) scratchpadApi.updateRoundStatus(latestEmail.id, 'awaiting')
      await queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.scheduleAMessages(
          applicationId,
          taskInstanceId === undefined || taskInstanceId === null ? undefined : String(taskInstanceId),
        ),
      })
      setLatestEmailId(null)
      setSendError('')
      setSentMessage('Email sent and captured in application messages.')
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to send email.'
      setSendError(message)
      setSentMessage('')
    },
  })

  const generateRound = () => {
    const round = scratchpadApi.generateRound({
      applicationName,
      recipientEmail: primaryContactEmail,
      rows,
      roundNumber: nextRoundNumber,
    })
    if (round) setLatestEmailId(round.id)
  }

  const sendRoundEmail = () => {
    if (!latestEmail) return
    const recipient = toEmail.trim()
    if (!recipient) {
      setSendError('Enter a recipient email before sending.')
      return
    }

    const email = buildHtmlEmailFromPlainText(latestEmail.email.body, {
      preheader: latestEmail.email.subject,
      title: 'OU Kosher Schedule A',
    })

    sendEmailMutation.mutate({
      payload: {
        MessageID: null,
        ApplicationID: applicationId ?? null,
        FromUser: 'projectflow@ou.org',
        ToUser: recipient,
        Subject: latestEmail.email.subject,
        MessageText: email.html,
        MessageTextPlain: email.text,
        PlainText: email.text,
        Text: email.text,
        MessageType: 'Email',
        Priority: 'NORMAL',
        SentDate: new Date().toISOString(),
        TemplateName: 'schedule-a-ingredients',
        TaskInstanceId: taskInstanceId ?? null,
        isPrivate: false,
        parentMessageId: null,
        toReply: null,
        isRead: false,
        tag: null,
        CCUser: null,
        BCCUser: 'productAutomation@ou.org',
        Attachments: null,
      },
      token,
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Company Communication</h2>
            <p className="mt-1 text-sm text-gray-600">Resolve ingredient info by requesting clarification, LOCs, or source details from the company.</p>
          </div>
          <StatusPill tone={roundCards.length ? 'blue' : 'gray'}>
            {roundCards.length ? `${roundCards.length} round${roundCards.length === 1 ? '' : 's'}` : 'No rounds yet'}
          </StatusPill>
        </div>
      </div>
      <div className="flex items-start gap-2 border-b border-indigo-100 bg-indigo-50 px-5 py-2.5 text-xs text-indigo-700">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <p><span className="font-semibold">Flag ingredients first.</span> Flagged items and their notes are bundled into the next round email.</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            {unresolved.length} unresolved flagged ingredient{unresolved.length === 1 ? '' : 's'} ready for a round.
          </div>
          <button
            type="button"
            onClick={generateRound}
            disabled={!unresolved.length || scratchpad.signedOff}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <MessageSquare className="h-4 w-4" />
            Generate Round {nextRoundNumber} Email
          </button>
        </div>

        {latestEmail ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-blue-800">Round {latestEmail.roundNumber} - email drafted</p>
              <span className="text-xs text-blue-600">{latestEmail.items.length} item{latestEmail.items.length === 1 ? '' : 's'}</span>
            </div>
            <div className="mb-2 grid gap-2 text-xs md:grid-cols-[70px_1fr]">
              <span className="font-medium text-blue-500">To</span>
              <input
                value={toEmail}
                onChange={(event) => setToEmail(event.target.value)}
                placeholder={isPrimaryContactLoading ? 'Loading primary contact...' : 'Primary contact email'}
                className="rounded border border-blue-200 bg-white px-2 py-1 text-blue-900 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="font-medium text-blue-500">Subject</span>
              <span className="rounded border border-blue-200 bg-white px-2 py-1 text-blue-900">{latestEmail.email.subject}</span>
            </div>
            {sendError ? <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{sendError}</div> : null}
            {sentMessage ? <div className="mb-2 rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">{sentMessage}</div> : null}
            <textarea readOnly rows={8} className="w-full resize-y rounded border border-blue-200 bg-white px-2 py-1.5 font-mono text-xs text-blue-900 outline-none" value={latestEmail.email.body} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={sendRoundEmail}
                disabled={sendEmailMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Send className="h-3.5 w-3.5" />
                {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`To: ${toEmail}\nSubject: ${latestEmail.email.subject}\n\n${latestEmail.email.body}`)}
                className="rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                Copy email
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {isRoundsLoading ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              Loading rounds...
            </p>
          ) : null}
          {roundsError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load rounds: {(roundsError as Error).message}
            </p>
          ) : null}
          {!isRoundsLoading && !roundsError && roundCards.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
              No rounds generated yet.
            </p>
          ) : null}
          {roundCards.map((round) => {
            const messageText =
              round.email.MessageTextPlain?.trim() ||
              round.email.PlainText?.trim() ||
              round.email.Text?.trim() ||
              round.email.MessageText?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
              ''
            return (
              <div key={round.email.MessageID ?? round.subject} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Round {round.roundNumber}</span>
                    <StatusPill tone="amber">Awaiting Response</StatusPill>
                  </div>
                  <span className="text-xs text-gray-400">{round.email.SentDate ? `Sent ${new Date(round.email.SentDate).toLocaleDateString()}` : 'Sent date unavailable'}</span>
                </div>
                <div className="space-y-2 px-4 py-3">
                  <div className="grid gap-1 text-xs text-gray-600 md:grid-cols-[70px_1fr]">
                    <span className="font-medium text-gray-500">To</span>
                    <span>{round.email.ToUser || '-'}</span>
                    <span className="font-medium text-gray-500">Subject</span>
                    <span className="break-words text-gray-900">{round.subject}</span>
                  </div>
                  {messageText ? (
                    <p className="line-clamp-4 whitespace-pre-line text-xs text-gray-600">{messageText}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="border-t bg-gray-50 px-5 py-2 text-xs text-gray-500">AppId: {applicationId ?? '-'}</div>
    </div>
  )
}

function EirTab({ scratchpadApi }: { scratchpadApi: ReturnType<typeof useScheduleAIngredientsScratchpad> }) {
  const { scratchpad } = scratchpadApi

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Inspection Report (EIR)</h2>
      {!scratchpad.eirReceived ? (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-semibold text-red-800">Awaiting EIR Submission - NCRC will be notified on receipt to review and forward to IAR</p>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <Check className="h-5 w-5 shrink-0 text-green-600" />
          <p className="text-sm font-semibold text-green-800">EIR received and ready for R. Herbsman review.</p>
        </div>
      )}
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-gray-100 py-2"><span className="font-medium text-gray-600">Inspection Status</span><StatusPill tone={scratchpad.eirReceived ? 'green' : 'amber'}>{scratchpad.eirReceived ? 'Report Received' : 'Awaiting Report'}</StatusPill></div>
          <div className="flex items-center justify-between border-b border-gray-100 py-2"><span className="font-medium text-gray-600">RFR Assigned</span><span className="font-semibold text-gray-900">Mordechai Stareshefsky</span></div>
          <div className="flex items-center justify-between py-2"><span className="font-medium text-gray-600">Inspection Date</span><span className="font-semibold text-gray-900">Apr 10, 2026</span></div>
        </div>
      </div>
      {scratchpad.eirReceived ? (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-8 w-8 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">PIINSPECTN_Initial_Inspection.pdf</p>
                <p className="mt-0.5 text-xs text-gray-500">Submitted via OU Direct</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => downloadTextFile('PIINSPECTN_Initial_Inspection.txt', 'Sample EIR document placeholder.', 'text/plain;charset=utf-8;')}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
          <div className="bg-gray-50 p-8 text-center text-sm text-gray-500">EIR PDF preview placeholder</div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          EIR document will appear here once the RFR submits via OU Direct.
        </div>
      )}
      <div className="mt-5 rounded-lg border border-purple-200 bg-purple-50 p-4">
        <p className="mb-1 text-sm font-semibold text-purple-900">R. Herbsman - EIR Review</p>
        <p className="mb-3 text-xs text-purple-800">R. Herbsman reads the EIR and directs the IAR to update Schedule A.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={scratchpadApi.markEirReceived} className="rounded border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50">Simulate EIR Received</button>
          <button type="button" onClick={scratchpadApi.requestEirIngredientEntry} disabled={!scratchpad.eirReceived} className="rounded border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:text-gray-300">Request IAR add ingredient</button>
          <button type="button" onClick={scratchpadApi.markEirReviewComplete} disabled={!scratchpad.eirReceived} className="rounded bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300">Mark EIR review complete</button>
        </div>
      </div>
    </div>
  )
}

function SignoffTab({
  rows,
  scratchpadApi,
  applicationId,
}: {
  rows: ScheduleAIngredientRow[]
  scratchpadApi: ReturnType<typeof useScheduleAIngredientsScratchpad>
  applicationId?: string
}) {
  const { scratchpad } = scratchpadApi
  const unresolvedFlags = rows.filter((row) => scratchpad.flags[row.id]?.flagged && !scratchpad.deleted[row.id]).length
  const openHalacha = Object.values(scratchpad.halacha).filter((item) => item.open).length
  const activeCount = activeRows(rows, scratchpad.deleted).length
  const communicationOk = unresolvedFlags === 0
  const halachaOk = openHalacha === 0
  const ready = scratchpad.scheduleAReady && scratchpad.eirReviewComplete && communicationOk && halachaOk

  const CheckRow = ({ ok, title, detail }: { ok: boolean; title: string; detail: string }) => (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${ok ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
          <Check className="h-3 w-3" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{detail}</p>
        </div>
      </div>
    </div>
  )

  const downloadSigned = () => {
    const lines = [
      `Schedule A signed for application ${applicationId ?? '-'}`,
      `Signed by R. Herbsman on ${scratchpad.signedOffDate ?? 'today'}`,
      `Ingredients: ${activeCount}`,
    ].join('\n')
    downloadTextFile(`ScheduleA_${applicationId ?? 'application'}_Signed.txt`, lines, 'text/plain;charset=utf-8;')
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-gray-50 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ingredients Sign-off</h2>
          <p className="mt-1 text-sm text-gray-600">Schedule A is the deliverable for the Contract stage. Once signed, it is frozen and a PDF is generated.</p>
        </div>
        <StatusPill tone={scratchpad.signedOff ? 'green' : ready ? 'blue' : 'amber'}>
          {scratchpad.signedOff ? 'Signed - frozen' : ready ? 'Awaiting Signoff' : 'Not ready'}
        </StatusPill>
      </div>
      <div className="space-y-5 p-5">
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Schedule A readiness</p>
              <p className="mt-1 text-xs text-gray-600">
                {scratchpad.scheduleAReady
                  ? `Marked ready ${scratchpad.scheduleAReadyDate ?? ''} by ${scratchpad.scheduleAReadyBy ?? 'IAR'}.`
                  : 'IAR decides when the ingredient list is clean enough to hand to R. Herbsman.'}
              </p>
            </div>
            <div className="flex gap-2">
              {!scratchpad.scheduleAReady ? (
                <button type="button" onClick={() => scratchpadApi.markScheduleAReady('IAR')} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Mark Schedule A Ready</button>
              ) : !scratchpad.signedOff ? (
                <button type="button" onClick={scratchpadApi.reopenScheduleA} className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Reopen</button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <CheckRow ok={scratchpad.scheduleAReady} title="Schedule A marked ready by IAR" detail={scratchpad.scheduleAReady ? `Marked ready ${scratchpad.scheduleAReadyDate ?? ''}` : 'Awaiting IAR readiness'} />
          <CheckRow ok={scratchpad.eirReviewComplete} title="EIR reviewed by R. Herbsman" detail={!scratchpad.eirReceived ? 'Awaiting EIR receipt from RFR' : scratchpad.eirReviewComplete ? 'EIR reviewed and reflected in Schedule A' : 'EIR received - awaiting review'} />
          <CheckRow ok={communicationOk} title="Open company requests resolved" detail={communicationOk ? 'All flagged items resolved' : `${unresolvedFlags} flagged ingredient${unresolvedFlags === 1 ? '' : 's'} still unresolved`} />
          <CheckRow ok={halachaOk} title="Halachic review resolved" detail={halachaOk ? 'No open halachic reviews' : `${openHalacha} halachic review${openHalacha === 1 ? '' : 's'} open`} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Schedule A</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{activeCount} <span className="text-xs font-normal text-gray-500">ingredients</span></p>
            <p className="mt-0.5 text-xs text-gray-500">{unresolvedFlags} flagged</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">EIR</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{!scratchpad.eirReceived ? 'Awaiting' : scratchpad.eirReviewComplete ? 'Reviewed' : 'In review'}</p>
            <p className="mt-0.5 text-xs text-gray-500">Mordechai Stareshefsky</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Communication</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{scratchpad.rounds.length} <span className="text-xs font-normal text-gray-500">rounds</span></p>
            <p className="mt-0.5 text-xs text-gray-500">{communicationOk ? 'All resolved' : 'Open items remain'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Final sign-off</p>
            <p className="mt-0.5 text-xs text-gray-600">
              {scratchpad.signedOff
                ? 'R. Herbsman signed off. Schedule A is frozen.'
                : ready
                  ? 'All pre-flight checks clear. Signing off will freeze Schedule A.'
                  : 'All checks must clear before R. Herbsman can sign off.'}
            </p>
          </div>
          <button
            type="button"
            onClick={scratchpadApi.performSignoff}
            disabled={!ready || scratchpad.signedOff}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Check className="h-4 w-4" />
            {scratchpad.signedOff ? 'Signed off' : 'R. Herbsman: Sign off'}
          </button>
        </div>

        {scratchpad.signedOff ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">Schedule A signed and frozen</p>
            <p className="mt-1 text-xs text-green-800">Signed by R. Herbsman on {scratchpad.signedOffDate ?? 'today'}. Legal queue received notification with PDF attached.</p>
            <button type="button" onClick={downloadSigned} className="mt-3 inline-flex items-center gap-1.5 rounded border border-green-300 bg-white px-2.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50">
              <Download className="h-3.5 w-3.5" />
              Download Schedule A.pdf
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ScheduleAIngredientsDrawer({
  open,
  applicationId,
  applicationName,
  taskInstanceId,
  taskName,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ScheduleATab>('application')
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | number | null>(null)
  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { data, isLoading, error } = useScheduleAIngredients(open ? resolvedApplicationId : undefined)
  const {
    data: applicationDetail,
    isLoading: isApplicationDetailLoading,
  } = useApplicationDetail(open ? resolvedApplicationId : undefined)
  const scratchpadApi = useScheduleAIngredientsScratchpad(resolvedApplicationId)

  const applicationRows = useMemo(
    () => [
      ...(data?.scheduleIngredients ?? []).map(mapApplicationIngredientRow),
      ...scratchpadApi.scratchpad.additions,
    ],
    [data?.scheduleIngredients, scratchpadApi.scratchpad.additions],
  )
  const kashRows = useMemo(() => (data?.kashIngredients ?? []).map(mapKashIngredientRow), [data?.kashIngredients])
  const allRows = useMemo(() => [...applicationRows, ...kashRows], [applicationRows, kashRows])
  const primaryContactEmail = useMemo(
    () => findPrimaryContactEmail(applicationDetail?.companyContacts as Array<Record<string, unknown>> | undefined),
    [applicationDetail?.companyContacts],
  )

  useEffect(() => {
    if (open) {
      setActiveTab('application')
      setSelectedApplicationId(null)
    }
  }, [open, resolvedApplicationId])

  if (!open) return null

  const body = (() => {
    if ((activeTab === 'application' || activeTab === 'kashrus') && isLoading) {
      return <div className="p-6 text-sm text-gray-600">Loading ingredients...</div>
    }

    if ((activeTab === 'application' || activeTab === 'kashrus') && error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load ingredients: {(error as Error).message}
        </div>
      )
    }

    if (activeTab === 'application') {
      return (
        <ScheduleATable
          applicationId={resolvedApplicationId}
          rows={applicationRows}
          allRows={allRows}
          variant="application"
          scratchpadApi={scratchpadApi}
          onViewApplication={(id) => setSelectedApplicationId(id ?? resolvedApplicationId ?? null)}
        />
      )
    }

    if (activeTab === 'kashrus') {
      return (
        <ScheduleATable
          applicationId={resolvedApplicationId}
          rows={kashRows}
          allRows={allRows}
          variant="kashrus"
          scratchpadApi={scratchpadApi}
          onViewApplication={(id) => setSelectedApplicationId(id ?? resolvedApplicationId ?? null)}
        />
      )
    }

    if (activeTab === 'communication') {
      return (
        <CommunicationTab
          rows={allRows}
          applicationName={applicationName}
          applicationId={resolvedApplicationId}
          taskInstanceId={taskInstanceId}
          primaryContactEmail={primaryContactEmail}
          isPrimaryContactLoading={isApplicationDetailLoading}
          scratchpadApi={scratchpadApi}
        />
      )
    }

    if (activeTab === 'eir') return <EirTab scratchpadApi={scratchpadApi} />

    return <SignoffTab rows={allRows} scratchpadApi={scratchpadApi} applicationId={resolvedApplicationId} />
  })()

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
        <div
          className="fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl lg:max-w-[72vw]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b bg-gray-900 px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-sky-300" />
                  <h3 className="text-lg font-semibold">Schedule A Ingredients</h3>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                  {taskName ? <span className="rounded-full bg-white/10 px-2.5 py-1">{taskName}</span> : null}
                  {applicationName ? (
                    <span className="rounded-full bg-white/10 px-2.5 py-1">{applicationName}</span>
                  ) : null}
                  {resolvedApplicationId ? (
                    <span className="rounded-full bg-white/10 px-2.5 py-1">AppId: {resolvedApplicationId}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
                aria-label="Close Schedule A drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-b bg-white px-5 py-3">
            <div className="flex gap-2 overflow-x-auto">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-5">{body}</div>
        </div>
      </div>
      <ApplicationDetailsDrawer
        open={selectedApplicationId !== null}
        applicationId={selectedApplicationId ?? undefined}
        onClose={() => setSelectedApplicationId(null)}
      />
    </>
  )
}
