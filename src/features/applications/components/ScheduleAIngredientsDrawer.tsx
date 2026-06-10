import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import {
  mapApplicationIngredientRow,
  mapKashIngredientRow,
  type ScheduleAIngredientFilter,
  type ScheduleAIngredientRow,
  type ScheduleAIngredientSortKey,
  type ScheduleAIngredientView,
  useScheduleAIngredients,
  useScheduleAScratchpad,
} from '@/features/applications/hooks/useScheduleAIngredients'

type Props = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number | null
  taskName?: string
  onClose: () => void
}

type DrawerTab = 'ingredients' | 'comm' | 'eir' | 'signoff'

const textValue = (value: unknown) => String(value ?? '').trim()

const downloadTextFile = (filename: string, text: string, type = 'text/plain;charset=utf-8;') => {
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

const primaryContact = (contacts?: Array<Record<string, unknown>>) => {
  const contact =
    contacts?.find((item) => textValue(item.type ?? item.Type).toLowerCase() === 'primary contact') ??
    contacts?.find((item) => textValue(item.IsPrimaryContact ?? item.isPrimaryContact).toLowerCase() === 'true') ??
    contacts?.[0]

  const first = textValue(contact?.FirstName ?? contact?.firstName ?? contact?.contactFirst)
  const last = textValue(contact?.LastName ?? contact?.lastName ?? contact?.contactLast)
  const name = textValue(contact?.name ?? contact?.Name) || [first, last].filter(Boolean).join(' ')
  const email = textValue(contact?.email ?? contact?.Email ?? contact?.EMail ?? contact?.contactEmail)

  return { name: name || 'Company Contact', email }
}

const statusClass = (status: string) => {
  const value = status.toLowerCase()
  if (value.includes('active') || value.includes('approved') || value.includes('submitted')) {
    return 'bg-green-100 text-green-700'
  }
  if (value.includes('hold') || value.includes('pending')) return 'bg-amber-100 text-amber-800'
  if (value.includes('reject') || value.includes('inactive')) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

const groupClass = (group: string) => {
  if (group === '1') return 'bg-green-100 text-green-700'
  if (group === '2') return 'bg-amber-100 text-amber-800'
  if (group === '3') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function IconButton({
  title,
  children,
  onClick,
  disabled,
  className = '',
}: {
  title: string
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

function Pill({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' }) {
  const classes = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[tone]}`}>{children}</span>
}

function SaMonogram() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current/40 bg-white/20 font-serif text-[11px] font-semibold leading-none">
      A
    </span>
  )
}

function sortRows(rows: ScheduleAIngredientRow[], sortKey: ScheduleAIngredientSortKey, direction: 'asc' | 'desc') {
  const getter = (row: ScheduleAIngredientRow) => {
    if (sortKey === 'plantStatus') return row.status
    return row[sortKey] ?? ''
  }
  return [...rows].sort((a, b) => {
    const result = String(getter(a)).localeCompare(String(getter(b)), undefined, { numeric: true, sensitivity: 'base' })
    return direction === 'asc' ? result : -result
  })
}

function buildScheduleAHtml(rows: ScheduleAIngredientRow[], applicationName?: string, applicationId?: string | number) {
  const tableRows = rows
    .map(
      (row, index) =>
        `<tr><td>${index + 1}</td><td>${row.rmc}</td><td>${row.name}</td><td>${row.source}</td><td>${row.brand}</td><td>${row.group}</td><td>${row.certifier}</td><td>${row.status}</td></tr>`,
    )
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>Schedule A</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f4f6}.foot{margin-top:18px;color:#555}</style></head><body><h1>Schedule A Ingredients</h1><p>${applicationName ?? 'Application'} - App #${applicationId ?? ''}</p><table><thead><tr><th>#</th><th>RMC</th><th>Name</th><th>Source</th><th>Brand</th><th>Group</th><th>Certifier</th><th>Plant Status</th></tr></thead><tbody>${tableRows}</tbody></table><p class="foot">UKD IDs sourced from label data. Group 2 items require a certified source or LOC before Schedule A can be completed.</p></body></html>`
}

export function ScheduleAIngredientsDrawer({
  open,
  applicationId,
  applicationName,
  taskInstanceId,
  taskName,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('ingredients')
  const [ingView, setIngView] = useState<ScheduleAIngredientView>('application')
  const [filter, setFilter] = useState<ScheduleAIngredientFilter>('all')
  const [sortKey, setSortKey] = useState<ScheduleAIngredientSortKey>('rmc')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expanded, setExpanded] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | number | null>(null)
  const [copied, setCopied] = useState(false)

  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { data, isLoading, error } = useScheduleAIngredients(open ? resolvedApplicationId : undefined)
  const { data: applicationDetail } = useApplicationDetail(open ? resolvedApplicationId : undefined)
  const scratchpadApi = useScheduleAScratchpad(resolvedApplicationId)
  const { scratchpad } = scratchpadApi

  const contact = useMemo(
    () => primaryContact(applicationDetail?.companyContacts as Array<Record<string, unknown>> | undefined),
    [applicationDetail?.companyContacts],
  )

  const applicationRows = useMemo(
    () => (data?.scheduleIngredients ?? []).map(mapApplicationIngredientRow),
    [data?.scheduleIngredients],
  )
  const kashRows = useMemo(() => (data?.kashIngredients ?? []).map(mapKashIngredientRow), [data?.kashIngredients])
  const activeRows = ingView === 'application' ? applicationRows : kashRows
  const allRows = useMemo(() => [...applicationRows, ...kashRows], [applicationRows, kashRows])
  const latestRound = scratchpad.rounds.at(-1)

  const counts = useMemo(() => {
    const resolvedIds = new Set(Object.keys(scratchpad.resolved).filter((id) => scratchpad.resolved[id]))
    scratchpad.rounds.forEach((round) => {
      round.items.forEach((item) => {
        if (item.resolved) resolvedIds.add(item.ingId)
      })
    })

    return activeRows.reduce(
      (acc, row) => {
        if (!scratchpad.deleted[row.id]) acc.all += 1
        if (scratchpad.flags[row.id]?.flagged && !scratchpad.deleted[row.id]) acc.flagged += 1
        if (resolvedIds.has(row.id)) acc.resolved += 1
        if (scratchpad.halacha[row.id]?.open) acc.halacha += 1
        return acc
      },
      { all: 0, flagged: 0, resolved: 0, halacha: 0 },
    )
  }, [activeRows, scratchpad])

  const visibleRows = useMemo(() => {
    const resolvedIds = new Set(Object.keys(scratchpad.resolved).filter((id) => scratchpad.resolved[id]))
    scratchpad.rounds.forEach((round) => {
      round.items.forEach((item) => {
        if (item.resolved) resolvedIds.add(item.ingId)
      })
    })

    const filtered = activeRows.filter((row) => {
      if (scratchpad.deleted[row.id]) return false
      if (filter === 'flagged') return Boolean(scratchpad.flags[row.id]?.flagged)
      if (filter === 'resolved') return resolvedIds.has(row.id)
      if (filter === 'halacha') return Boolean(scratchpad.halacha[row.id]?.open)
      return true
    })

    return sortRows(filtered, sortKey, sortDirection)
  }, [activeRows, filter, scratchpad, sortDirection, sortKey])

  if (!open) return null

  const setSort = (key: ScheduleAIngredientSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const generateRound = () => {
    const round = scratchpadApi.generateRound({
      rows: allRows,
      applicationName,
      recipientEmail: contact.email,
      recipientName: contact.name,
      taskInstanceId,
    })
    if (round) setActiveTab('comm')
  }

  const copyRoundEmail = async () => {
    if (!latestRound) return
    const text = `To: ${latestRound.email.to}\nSubject: ${latestRound.email.subject}\n\n${latestRound.email.body}`
    await navigator.clipboard?.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const openRoundEmail = () => {
    if (!latestRound) return
    const href = `mailto:${encodeURIComponent(latestRound.email.to)}?subject=${encodeURIComponent(
      latestRound.email.subject,
    )}&body=${encodeURIComponent(latestRound.email.body)}`
    window.location.href = href
  }

  const downloadScheduleA = () => {
    const html = buildScheduleAHtml(kashRows, applicationName, resolvedApplicationId)
    const filename = `ScheduleA_${resolvedApplicationId ?? 'application'}.html`
    downloadTextFile(filename, html, 'text/html;charset=utf-8;')
  }

  const readyForSignoff = scratchpad.scheduleAReady && (scratchpad.eirReviewComplete || scratchpad.eirNotRequired)
  const panelWidth = expanded ? 'lg:max-w-[96vw]' : 'lg:max-w-[72vw]'

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
        <div
          className={`fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl ${panelWidth}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b bg-gray-800 px-4 py-3 text-white">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight">{applicationName || 'Schedule A Ingredients'}</h3>
              <p className="text-xs text-gray-300">
                App #{resolvedApplicationId ?? '-'} {taskName ? `- ${taskName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
                aria-label={expanded ? 'Collapse drawer' : 'Expand drawer'}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-200 hover:bg-gray-700 hover:text-white"
                aria-label="Close Schedule A drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-gray-50">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedApplicationId(resolvedApplicationId ?? null)}
                    disabled={!resolvedApplicationId}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Application
                  </button>
                </div>

                <nav className="mt-3 -mb-1 flex gap-1 overflow-x-auto text-sm" aria-label="Drawer sections">
                  <div className="inline-flex shrink-0 items-stretch divide-x divide-gray-300 overflow-hidden rounded-md border border-gray-300 bg-white text-sm">
                    {(['application', 'kashrus'] as ScheduleAIngredientView[]).map((view) => {
                      const active = activeTab === 'ingredients' && ingView === view
                      return (
                        <button
                          key={view}
                          type="button"
                          onClick={() => {
                            setActiveTab('ingredients')
                            setIngView(view)
                            setFilter('all')
                          }}
                          className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${
                            active ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <SaMonogram />
                          {view === 'application' ? 'Application' : 'Kashrus'}
                        </button>
                      )
                    })}
                  </div>
                  {[
                    { id: 'comm', label: 'Communication' },
                    { id: 'eir', label: 'EIR' },
                    { id: 'signoff', label: 'Sign-off' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as DrawerTab)}
                      className={`shrink-0 rounded-md px-3 py-1.5 font-medium ${
                        activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {activeTab === 'ingredients' ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-6 py-4">
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {ingView === 'application' ? 'Application Ingredients' : 'Kashrus Ingredients'}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {(['all', 'flagged', 'resolved', 'halacha'] as ScheduleAIngredientFilter[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setFilter(item)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              filter === item ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 ring-1 ring-gray-200'
                            }`}
                          >
                            {item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)} {counts[item]}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={downloadScheduleA}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      </div>
                    </div>

                    {isLoading ? <div className="p-6 text-sm text-gray-600">Loading ingredients...</div> : null}
                    {error ? (
                      <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Failed to load ingredients: {(error as Error).message}
                      </div>
                    ) : null}

                    <div className="overflow-x-auto">
                      <table className={`w-full min-w-[980px] text-left text-sm ${ingView === 'kashrus' ? 'view-kashrus' : 'view-application'}`}>
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="w-8 px-3 py-2.5 text-xs font-semibold text-gray-600">#</th>
                            {[
                              ['rmc', 'RMC'],
                              ['name', 'Ingredient Name'],
                              ['source', 'Source'],
                              ['brand', 'Brand Name'],
                              ['group', 'Group'],
                              ['certifier', 'Certifier'],
                              ['plantStatus', 'Plant-Status'],
                            ].map(([key, label]) => (
                              <th
                                key={key}
                                className={`px-3 py-2.5 text-xs font-semibold text-gray-600 ${
                                  key === 'plantStatus' && ingView === 'application' ? 'hidden' : ''
                                } ${['source', 'brand'].includes(key) && ingView === 'kashrus' ? 'hidden' : ''}`}
                              >
                                <button type="button" onClick={() => setSort(key as ScheduleAIngredientSortKey)} className="inline-flex items-center gap-1 hover:text-blue-700">
                                  {label}
                                  <span className="text-[10px] text-gray-400">{sortKey === key ? (sortDirection === 'asc' ? 'up' : 'down') : 'sort'}</span>
                                </button>
                              </th>
                            ))}
                            {ingView === 'application' ? <th className="w-28 px-3 py-2.5 text-xs font-semibold text-gray-600">Actions</th> : null}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {visibleRows.map((row, index) => {
                            const flagged = Boolean(scratchpad.flags[row.id]?.flagged)
                            const resolved = Boolean(scratchpad.resolved[row.id])
                            const halacha = scratchpad.halacha[row.id]
                            return (
                              <tr key={row.id} className={`${flagged ? 'bg-amber-50/60' : ''} ${resolved ? 'bg-green-50/50' : ''}`}>
                                <td className="px-3 py-3 text-xs text-gray-500">{index + 1}</td>
                                <td className="px-3 py-3 font-mono text-xs text-gray-700">{row.rmc || '-'}</td>
                                <td className="px-3 py-3">
                                  <div className="font-medium text-gray-900">{row.name || '-'}</div>
                                  {scratchpad.flags[row.id]?.note ? (
                                    <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                                      {scratchpad.flags[row.id]?.note}
                                    </div>
                                  ) : null}
                                  {halacha?.open ? (
                                    <div className="mt-1 rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-800">
                                      Halachic review open{halacha.note ? `: ${halacha.note}` : ''}
                                    </div>
                                  ) : null}
                                </td>
                                {ingView === 'application' ? (
                                  <>
                                    <td className="px-3 py-3 text-gray-700">{row.source || '-'}</td>
                                    <td className="px-3 py-3 text-gray-700">{row.brand || '-'}</td>
                                  </>
                                ) : null}
                                <td className="px-3 py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${groupClass(row.group)}`}>{row.group || '-'}</span>
                                </td>
                                <td className="px-3 py-3 text-gray-700">{row.certifier || row.ukd || '-'}</td>
                                {ingView === 'kashrus' ? (
                                  <td className="px-3 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}>{row.status || '-'}</span>
                                  </td>
                                ) : null}
                                {ingView === 'application' ? (
                                  <td className="px-3 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      <IconButton title={flagged ? 'Unflag' : 'Flag'} onClick={() => scratchpadApi.toggleFlag(row.id)} className={flagged ? 'text-amber-700' : ''}>
                                        <Flag className="h-4 w-4" />
                                      </IconButton>
                                      <IconButton title={resolved ? 'Mark unresolved' : 'Mark resolved'} onClick={() => scratchpadApi.toggleResolved(row.id)} className={resolved ? 'text-green-700' : ''}>
                                        <CheckCircle2 className="h-4 w-4" />
                                      </IconButton>
                                      <IconButton title={halacha?.open ? 'Resolve halacha' : 'Open halacha review'} onClick={() => scratchpadApi.toggleHalacha(row.id)} className={halacha?.open ? 'text-purple-700' : ''}>
                                        <ShieldCheck className="h-4 w-4" />
                                      </IconButton>
                                      <IconButton title="Delete row" onClick={() => scratchpadApi.toggleDeleted(row.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </IconButton>
                                    </div>
                                    {flagged ? (
                                      <textarea
                                        className="mt-2 min-h-16 w-full rounded border border-amber-200 bg-white px-2 py-1 text-xs text-gray-700"
                                        value={scratchpad.flags[row.id]?.note ?? ''}
                                        placeholder="Follow-up note"
                                        onChange={(event) => scratchpadApi.updateFlagNote(row.id, event.target.value)}
                                      />
                                    ) : null}
                                    {halacha?.open ? (
                                      <input
                                        className="mt-2 h-8 w-full rounded border border-purple-200 bg-white px-2 text-xs text-gray-700"
                                        value={halacha.note ?? ''}
                                        placeholder="Halachic review note"
                                        onChange={(event) => scratchpadApi.updateHalachaNote(row.id, event.target.value)}
                                      />
                                    ) : null}
                                  </td>
                                ) : null}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t bg-gray-50 px-6 py-2 text-xs text-gray-400">
                      UKD IDs sourced from label data. Group 2 items require a certified source or LOC before Schedule A can be completed.
                    </div>
                  </div>
                ) : null}

                {activeTab === 'comm' ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b bg-gray-50 px-6 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-semibold text-gray-900">Company Communication</h2>
                          <p className="mt-0.5 text-sm text-gray-600">Resolve ingredient info by requesting clarification, LOCs, or source details from the company.</p>
                        </div>
                        <button type="button" onClick={() => setActiveTab('ingredients')} className="text-xs text-blue-600 hover:underline">
                          Back to Schedule A
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 border-b border-indigo-100 bg-indigo-50 px-6 py-2.5">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                      <p className="text-xs text-indigo-700">
                        <span className="font-semibold">Flag ingredients first.</span> Mark items that need follow-up in Schedule A. They will be bundled into the next round email.
                      </p>
                    </div>
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Company Communication</h3>
                        <Pill tone={scratchpad.rounds.length ? 'blue' : 'gray'}>
                          {scratchpad.rounds.length ? `${scratchpad.rounds.length} round${scratchpad.rounds.length === 1 ? '' : 's'}` : 'No rounds yet'}
                        </Pill>
                      </div>
                      <button
                        type="button"
                        onClick={generateRound}
                        disabled={!counts.flagged}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Generate Round {scratchpad.rounds.length + 1} Email
                      </button>
                    </div>

                    {latestRound ? (
                      <div className="px-6 pb-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-blue-800">Round {latestRound.roundNumber} email drafted</p>
                            <span className="text-xs text-blue-600">{latestRound.items.length} item{latestRound.items.length === 1 ? '' : 's'}</span>
                          </div>
                          <div className="mb-2 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-12 shrink-0 font-medium text-blue-500">To</span>
                              <span className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 font-mono text-blue-900">{latestRound.email.to || 'No contact email found'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="w-12 shrink-0 font-medium text-blue-500">Subject</span>
                              <span className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-blue-900">{latestRound.email.subject}</span>
                            </div>
                          </div>
                          <textarea readOnly rows={8} className="w-full resize-y rounded border border-blue-200 bg-white px-2 py-1.5 font-mono text-xs text-blue-900 focus:outline-none" value={latestRound.email.body} />
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button type="button" onClick={openRoundEmail} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                              <Mail className="h-3.5 w-3.5" />
                              Open Email
                            </button>
                            <button type="button" onClick={copyRoundEmail} className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">
                              <Copy className="h-3.5 w-3.5" />
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                            <button type="button" onClick={() => scratchpadApi.updateRoundStatus(latestRound.id, 'awaiting')} className="inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">
                              <Send className="h-3.5 w-3.5" />
                              Mark Sent
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="border-t px-6 py-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Round History</h3>
                      {!scratchpad.rounds.length ? (
                        <p className="py-2 text-xs text-gray-400">No rounds generated yet. Flag ingredients with follow-up notes, then generate an email to the company.</p>
                      ) : (
                        <div className="space-y-3">
                          {[...scratchpad.rounds].reverse().map((round) => (
                            <div key={round.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">Round {round.roundNumber}</p>
                                  <p className="text-xs text-gray-500">{round.generatedDate}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Pill tone={round.status === 'reviewed' ? 'green' : round.status === 'responded' ? 'blue' : round.status === 'awaiting' ? 'amber' : 'gray'}>{round.status}</Pill>
                                  <button type="button" onClick={() => scratchpadApi.simulateRoundResponse(round.id)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                                    Simulate Response
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {round.items.map((item) => (
                                  <div key={item.ingId} className="rounded border border-gray-100 bg-gray-50 p-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-600">{item.question}</p>
                                        {item.response ? <p className="mt-1 text-xs text-green-700">{item.response}</p> : null}
                                      </div>
                                      <div className="flex gap-1">
                                        <button type="button" onClick={() => scratchpadApi.resolveRoundItem(round.id, item.ingId)} className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700">
                                          Resolve
                                        </button>
                                        <button type="button" onClick={() => scratchpadApi.requestRoundFollowup(round.id, item.ingId)} className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50">
                                          Another Round
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'eir' ? (
                  <div className="space-y-4">
                    {!scratchpad.eirReceived && !scratchpad.eirNotRequired ? (
                      <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                        <p className="text-sm font-semibold text-red-800">Awaiting EIR Submission. NCRC will review and forward to IAR once received.</p>
                      </div>
                    ) : null}
                    {scratchpad.eirNotRequired ? (
                      <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
                        <FileText className="h-5 w-5 shrink-0 text-gray-500" />
                        <p className="text-sm font-semibold text-gray-800">EIR marked not required for this application.</p>
                      </div>
                    ) : null}
                    {scratchpad.eirReceived ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-8 w-8 shrink-0 text-red-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">PIINSPECTN_Initial_Inspection.pdf</p>
                              <p className="mt-0.5 text-xs text-gray-500">Submitted via OU Direct</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => downloadTextFile('PIINSPECTN_Initial_Inspection.txt', 'Sample EIR document placeholder.')} className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                        </div>
                        <div className="bg-gray-50 p-8 text-center text-sm text-gray-500">EIR PDF preview placeholder</div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">EIR document will appear here once the RFR submits via OU Direct.</div>
                    )}

                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-purple-900">IA Manager EIR Review</p>
                          <p className="mt-1 text-xs text-purple-800">Read the EIR, request missing ingredient entry, or mark the review complete.</p>
                        </div>
                        <Pill tone={scratchpad.eirReviewComplete ? 'green' : scratchpad.eirNotRequired ? 'gray' : scratchpad.eirReceived ? 'blue' : 'amber'}>
                          {scratchpad.eirReviewComplete ? 'Review complete' : scratchpad.eirNotRequired ? 'Not required' : scratchpad.eirReceived ? 'Ready for review' : 'Awaiting report'}
                        </Pill>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={scratchpadApi.markEirReceived} className="rounded border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50">
                          Simulate EIR Received
                        </button>
                        <button type="button" onClick={scratchpadApi.requestEirIngredientEntry} disabled={!scratchpad.eirReceived} className="rounded border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:text-gray-300">
                          Request IAR add ingredient
                        </button>
                        <button type="button" onClick={scratchpadApi.markEirReviewComplete} disabled={!scratchpad.eirReceived} className="rounded bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                          Mark EIR review complete
                        </button>
                        <button type="button" onClick={scratchpadApi.markEirNotRequired} className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Mark EIR not required
                        </button>
                        {scratchpad.eirNotRequired ? (
                          <button type="button" onClick={scratchpadApi.clearEirNotRequired} className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            Clear not required
                          </button>
                        ) : null}
                      </div>
                    </div>

                  </div>
                ) : null}

                {activeTab === 'signoff' ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-gray-50 px-5 py-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Ingredients Sign-off</h2>
                        <p className="mt-1 text-sm text-gray-600">Schedule A is the deliverable for the Contract stage. Track readiness before it moves forward.</p>
                      </div>
                      <Pill tone={readyForSignoff ? 'blue' : 'amber'}>
                        {readyForSignoff ? 'Ready' : 'Not ready'}
                      </Pill>
                    </div>
                    <div className="space-y-5 p-5">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Schedule A readiness</p>
                            <p className="mt-1 text-xs text-gray-600">
                              {scratchpad.scheduleAReady
                                ? `Schedule A marked ready ${scratchpad.scheduleAReadyDate ?? ''} by ${scratchpad.scheduleAReadyBy ?? 'IAR'}.`
                                : 'IAR decides when the ingredient list is clean enough to hand to the IA Manager.'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!scratchpad.scheduleAReady ? (
                              <button type="button" onClick={() => scratchpadApi.markScheduleAReady('IAR')} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                                Mark Schedule A Ready
                              </button>
                            ) : (
                              <button type="button" onClick={scratchpadApi.reopenScheduleA} className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                Unmark
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {[
                          {
                            ok: scratchpad.scheduleAReady,
                            title: 'Schedule A marked ready by IAR',
                            detail: scratchpad.scheduleAReady ? `Marked ready ${scratchpad.scheduleAReadyDate ?? ''}` : 'Awaiting IAR readiness',
                          },
                          {
                            ok: scratchpad.eirReviewComplete || scratchpad.eirNotRequired,
                            title: 'EIR reviewed or marked not required',
                            detail: scratchpad.eirNotRequired
                              ? 'No EIR required'
                              : scratchpad.eirReviewComplete
                                ? 'EIR reviewed and reflected in Schedule A'
                                : 'Awaiting EIR review',
                          },
                        ].map((row) => (
                          <div key={row.title} className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 last:border-b-0">
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${row.ok ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Check className="h-3 w-3" />
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{row.title}</p>
                                <p className="text-xs text-gray-500">{row.detail}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Schedule A</p>
                          <p className="mt-1 text-xl font-semibold text-gray-900">{counts.all} <span className="text-xs font-normal text-gray-500">ingredients</span></p>
                          <p className="mt-0.5 text-xs text-gray-500">{counts.flagged} flagged</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">EIR</p>
                          <p className="mt-1 text-xl font-semibold text-gray-900">{scratchpad.eirNotRequired ? 'Not required' : scratchpad.eirReviewComplete ? 'Reviewed' : scratchpad.eirReceived ? 'In review' : 'Awaiting'}</p>
                          <p className="mt-0.5 text-xs text-gray-500">IA Manager review</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Communication</p>
                          <p className="mt-1 text-xl font-semibold text-gray-900">{scratchpad.rounds.length} <span className="text-xs font-normal text-gray-500">rounds</span></p>
                          <p className="mt-0.5 text-xs text-gray-500">{counts.flagged ? 'Open items remain' : 'All resolved'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
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
