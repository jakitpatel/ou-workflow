import { useState } from 'react'
import { ChevronDown, ChevronRight, Building2, Factory } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { Applicant } from '@/types/application'
import { useUser } from '@/context/UserContext'
import { refreshApplicationInListCaches } from '@/features/applications/cache/applicationListCache'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { PrelimResolutionDrawer } from '@/features/prelim/components/PrelimResolutionDrawer'
import { confirmTask } from '@/features/tasks/api'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { Route as DashboardRoute } from '@/routes/_authed/ou-workflow/ncrc-dashboard'
import type {
  CompanyFromApplication,
  PlantFromApplication,
  SubmittedApplicationContact,
} from '@/types/application'

type Props = {
  application?: Applicant
  loading?: boolean
  defaultVisible?: boolean
  isProgressVisible?: boolean
}

type DrawerState = {
  isOpen: boolean
  type: 'company' | 'plant'
  plantIndex?: number
}

const isResolvePlantTask = (taskName?: string) => /^ResolvePlant\d*$/.test(taskName ?? '')
const isTaskPending = (status?: string) => (status ?? '').trim().toLowerCase() === 'pending'
const isTaskCompleted = (status?: string) => (status ?? '').trim().toLowerCase() === 'completed'
const isApplicationWithdrawn = (status?: string) => {
  const normalized = (status ?? '').trim().toLowerCase()
  return normalized === 'withdrawn' || normalized === 'wth'
}

type ResolveSavedState = {
  resolveId?: {
    companyId?: string | number
    plantId?: string | number
  }
  resolveMethod?: 'Created' | 'Selected'
}

function parseJsonLike(value: string): unknown | null {
  const text = value.trim()
  if (!text) return null

  const candidates = [
    text,
    text
      .replace(/\bNone\b/g, 'null')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/'/g, '"'),
  ]

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // Try the next tolerated backend serialization format.
    }
  }

  return null
}

function getResolveSavedState(value: unknown): ResolveSavedState | null {
  if (!value) return null

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('resolveId' in record || 'resolveMethod' in record) {
      return {
        resolveId:
          record.resolveId && typeof record.resolveId === 'object'
            ? (record.resolveId as ResolveSavedState['resolveId'])
            : undefined,
        resolveMethod:
          record.resolveMethod === 'Created' || record.resolveMethod === 'Selected'
            ? record.resolveMethod
            : undefined,
      }
    }

    const savedState = record.savedState ?? record.SavedState
    if (typeof savedState === 'string') return getResolveSavedState(savedState)
    if (savedState && typeof savedState === 'object') return savedState as ResolveSavedState

    const statusDetails = record.StatusDetails ?? record.statusDetails
    if (statusDetails) return getResolveSavedState(statusDetails)

    return null
  }

  const parsed = parseJsonLike(String(value))
  return parsed ? getResolveSavedState(parsed) : null
}

function getResolveMethodMarker(task: unknown): 'C' | 'M' | null {
  const record = task as Record<string, unknown> | undefined
  if (!record || !isTaskCompleted(String(record.status ?? ''))) return null

  const savedState = getResolveSavedState(record.StatusDetails ?? record.statusDetails)
  if (savedState?.resolveMethod === 'Created') return 'C'
  if (savedState?.resolveMethod === 'Selected') return 'M'

  return null
}

function ResolveMethodMarker({ marker }: { marker: 'C' | 'M' | null }) {
  if (!marker) return null

  return (
    <span
      className="mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded bg-amber-300 px-1.5 text-[11px] font-extrabold leading-none text-amber-950 ring-1 ring-inset ring-amber-500"
      title={marker === 'C' ? 'Created during resolution' : 'Matched/selected during resolution'}
      aria-label={marker === 'C' ? 'Created during resolution' : 'Matched during resolution'}
    >
      {marker}
    </span>
  )
}

export function PrelimResolvedSection({
  application,
  loading,
  defaultVisible = true,
  isProgressVisible,
}: Props) {
  const [open, setOpen] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    type: 'company',
  })

  const { token, username } = useUser()
  const resolved = extractResolvedData(application)
  const isWithdrawn = isApplicationWithdrawn(application?.status)

  if (!loading && !resolved) return null

  const progressVisible = isProgressVisible ?? defaultVisible

  const stageTasks = getStageTasks(application)

  const companyTask = stageTasks?.find(
    (task) => task.name === 'ResolveCompany'
  )
  const plantTasks =
    stageTasks?.filter(
      (task) => isResolvePlantTask(task.name)
    ) || []

  const refreshApplication = async () => {
    try {
      const refreshed = await refreshApplicationInListCaches({
        applicationId: application?.applicationId,
        queryClient,
        token: token ?? undefined,
      })

      if (!refreshed) {
        await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })
      }
    } catch {
      await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.details() }),
      queryClient.invalidateQueries({ queryKey: prelimQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
    ])
  }

  const handleAssignCompany = async (match: any) => {
    if (!companyTask || !username) return

    const result = String(match.Id)
    await confirmTask({
      taskId: String(companyTask.TaskInstanceId ?? (companyTask as any).taskInstanceId ?? ''),
      applicationId: application?.applicationId,
      result,
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: companyTask.capacity ?? undefined,
    })
    await refreshApplication()
  }

  const handleAssignPlant = async (match: any, plantTask: any) => {
    if (!plantTask || !username) return

    const result = String(match.Id)
    await confirmTask({
      taskId: String(plantTask.TaskInstanceId ?? (plantTask as any).taskInstanceId ?? ''),
      applicationId: application?.applicationId,
      result,
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: plantTask.capacity ?? undefined,
    })
    await refreshApplication()
  }

  const openCompanyDrawer = () => {
    setDrawerState({
      isOpen: true,
      type: 'company',
    })
  }

  const openPlantDrawer = (index: number) => {
    setDrawerState({
      isOpen: true,
      type: 'plant',
      plantIndex: index,
    })
  }

  const closeDrawer = () => {
    setDrawerState({
      isOpen: false,
      type: 'company',
    })
  }

  const companyDrawerData = toCompanyDrawerData(companyTask?.companyFromApplication)
  const companyResolveSavedState = getResolveSavedState(
    companyTask?.StatusDetails ?? (companyTask as any)?.statusDetails
  )
  const activePlantIndex = drawerState.plantIndex
  const activePlantTask =
    activePlantIndex !== undefined ? plantTasks[activePlantIndex] : undefined
  const plantDrawerData = toPlantDrawerData(
    activePlantTask?.plantFromApplication,
    companyTask?.companyFromApplication?.companyWebsite
  )
  const plantResolveSavedState = getResolveSavedState(
    activePlantTask?.StatusDetails ?? (activePlantTask as any)?.statusDetails
  )
  const companyTaskInstanceId = companyTask?.TaskInstanceId ?? (companyTask as any)?.taskInstanceId
  const activePlantTaskInstanceId =
    activePlantTask?.TaskInstanceId ?? (activePlantTask as any)?.taskInstanceId
  const completedCompanyId =
    companyResolveSavedState?.resolveId?.companyId ?? resolved?.company?.Id
  const completedPlantId =
    plantResolveSavedState?.resolveId?.plantId ??
    (activePlantIndex !== undefined
      ? resolved?.plants?.[activePlantIndex]?.plant?.plantID
      : undefined)
  const companyResolveMethodMarker = getResolveMethodMarker(companyTask)

  const handleWfidClick = (wfid: string | number) => {
    const applicationId = Number(wfid)
    if (!Number.isFinite(applicationId)) return

    navigate({
      to: DashboardRoute.to,
      search: (prev) => ({
        q: prev.q ?? '',
        status: prev.status ?? 'all',
        priority: prev.priority ?? 'all',
        applicationId,
        page: 0,
        myOnly: prev.myOnly ?? true,
      }),
    })
  }

  return (
    <div className="mt-6">
      {!progressVisible ? null : (
        <>
      {/* Company Section */}
      {loading ? (
        <CompanySkeleton />
      ) : (
        resolved?.company && (
          <div className="mb-4">
            <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 transition-colors hover:bg-yellow-100 hover:border-yellow-300">
              {/* First Row */}
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="flex-shrink-0 hover:bg-yellow-200 rounded p-1 transition-colors"
                >
                  {open ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-yellow-700" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">
                        {resolved.company.companyName}
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
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${
                          resolved.company.Id
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                      >
                        {resolved.company.Id ? 'ASSIGNED' : 'TO BE ASSIGNED'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        {loading ? '...' : resolved?.plants?.length || 0} plants
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 flex items-start justify-between gap-3">
                    <div className="text-xs text-gray-500 space-y-0.5 min-w-0">
                      <div>
                        <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs text-gray-600 border border-gray-200 whitespace-nowrap">
                          <ResolveMethodMarker marker={companyResolveMethodMarker} />
                          CompanyID: {resolved.company.Id}
                        </span>
                      </div>
                      <div className="text-gray-500 truncate">{resolved.company.Address}</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openCompanyDrawer()
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-yellow-300 bg-white px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50 transition-colors shadow-sm flex-shrink-0"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Resolve Co. ({companyTask?.companyMatchList?.length || 0})
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
              <div key={idx} className="ml-6 relative">
                {/* Connection Line */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-gray-300 to-transparent"
                  style={{
                    height:
                      idx === (resolved.plants?.length ?? 0) - 1 ? '50%' : '100%',
                  }}
                />
                <div className="absolute left-0 top-6 w-4 h-px bg-gray-300" />

                {/* Plant Card */}
                <div className="ml-6">
                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                    {/* First Row */}
                    <div className="flex items-start gap-3">
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
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${
                                p.ownsID
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}
                            >
                              {p.ownsID ? 'ASSIGNED' : 'TO BE ASSIGNED'}
                            </span>
                            {p.ownsID && (
                              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-600 border border-gray-200 whitespace-nowrap">
                                OWNSID: {p.ownsID}
                              </span>
                            )}
                            {p.WFID && (
                              <button
                                type="button"
                                onClick={() => handleWfidClick(p.WFID)}
                                title={`Open workflow details for WFID ${p.WFID}`}
                                className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-600 border border-gray-200 whitespace-nowrap hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                              >
                                WFID: {p.WFID}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 flex items-start justify-between gap-3">
                          <div className="text-xs text-gray-500 space-y-0.5 min-w-0">
                            <div className="inline-flex items-center">
                              <ResolveMethodMarker marker={getResolveMethodMarker(plantTasks[idx])} />
                              Plant ID: <span className="font-mono">{p.plant?.plantID}</span>
                            </div>
                            {p.plant?.plantAddress && (
                              <div className="text-gray-400 truncate">
                                {p.plant.plantAddress}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openPlantDrawer(idx)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex-shrink-0"
                          >
                            <Factory className="w-3.5 h-3.5" />
                            Resolve ({plantTasks[idx]?.plantMatchList?.length || 0})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Resolution Drawer */}
      {drawerState.isOpen && drawerState.type === 'company' && companyTask && (
        <PrelimResolutionDrawer
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
          type="company"
          data={companyDrawerData}
          matches={companyTask.companyMatchList || []}
          onAssign={handleAssignCompany}
          onRefresh={refreshApplication}
          selectedId={completedCompanyId}
          applicationId={application?.applicationId}
          taskInstanceId={companyTaskInstanceId}
          savedResolveMethod={companyResolveSavedState?.resolveMethod}
          isActionable={isTaskPending(companyTask.status)}
          taskStatus={companyTask.status}
          readOnly={isWithdrawn}
        />
      )}

      {drawerState.isOpen &&
        drawerState.type === 'plant' &&
        activePlantTask && (
          <PrelimResolutionDrawer
            isOpen={drawerState.isOpen}
            onClose={closeDrawer}
            type="plant"
            data={plantDrawerData}
            matches={activePlantTask.plantMatchList || []}
            onAssign={(match) =>
              handleAssignPlant(match, activePlantTask)
            }
            onRefresh={refreshApplication}
            selectedId={completedPlantId}
            applicationId={application?.applicationId}
            taskInstanceId={activePlantTaskInstanceId}
            companyId={resolved?.company?.Id}
            savedResolveMethod={plantResolveSavedState?.resolveMethod}
            isActionable={isTaskPending(activePlantTask.status)}
            taskStatus={activePlantTask.status}
            readOnly={isWithdrawn}
          />
        )}
        </>
      )}
    </div>
  )
}

/* ---------------- Helper Function ---------------- */
function extractResolvedData(application?: Applicant) {
  const tasks = getStageTasks(application)
  if (!tasks) return null

  // Find ResolveCompany task
  const companyTask = tasks.find((task) => task.name === 'ResolveCompany')

  // Find all ResolvePlant tasks
  const plantTasks = tasks.filter((task) => isResolvePlantTask(task.name))

  if (!companyTask && plantTasks.length === 0) return null

  return {
    company: companyTask
      ? {
          companyName:
            companyTask.companySelected?.companyName ||
            companyTask.companyFromApplication?.companyName ||
            '',
          Id: companyTask.companySelected?.ID || companyTask.Result || '',
          Address:
            companyTask.companySelected?.Address ||
            companyTask.companyFromApplication?.companyAddress ||
            '',
          executedBy: companyTask.executedBy || '',
          CompletedDate: companyTask.CompletedDate || '',
        }
      : undefined,
    plants: plantTasks.map((task) => ({
      ownsID: task.plantSelected?.OWNSID || '',
      WFID: task.plantSelected?.WFID || '',
      plant: {
        plantName:
          task.plantSelected?.plantName ||
          task.plantFromApplication?.plantName ||
          '',
        plantID: task.plantSelected?.PlantID || task.Result || task.plantFromApplication?.plantID || '',
        plantAddress:
          task.plantSelected?.Address ||
          task.plantFromApplication?.Address ||
          '',
        executedBy: task.executedBy || '',
        CompletedDate: task.CompletedDate || '',
      },
    })),
  }
}

function getStageTasks(application?: Applicant) {
  return application?.stages?.Intake?.tasks
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

function toCompanyDrawerData(data?: CompanyFromApplication) {
  const pickFirstNonEmpty = (...values: Array<string | undefined>) =>
    values.find((value) => (value ?? '').trim() !== '') ?? ''

  const firstContact = (
    ...groups: Array<SubmittedApplicationContact[] | undefined>
  ) => groups.flatMap((group) => group ?? []).find(hasSubmittedContactValue)

  const toContact = (contact?: SubmittedApplicationContact) => {
    if (!contact) return undefined
    const name = `${pickFirstNonEmpty(contact.contactFirst)} ${pickFirstNonEmpty(contact.contactLast)}`.trim()
    return {
      name,
      title: pickFirstNonEmpty(contact.jobTitle, contact.jobTitle1, contact.note),
      phone: pickFirstNonEmpty(contact.contactPhone),
      email: pickFirstNonEmpty(contact.contactEmail),
    }
  }

  const contactGroups = data?.companyContacts
  const primaryRaw = firstContact(contactGroups?.primaryContact, contactGroups?.PrimaryContact)
  const billingRaw = firstContact(contactGroups?.billingContact, contactGroups?.BillingContact)

  return {
    companyName: data?.companyName ?? '',
    companyAddress: pickFirstNonEmpty(data?.companyAddress, data?.Street1),
    companyAddress2: pickFirstNonEmpty(data?.companyAddress2, data?.Street2),
    companyCity: pickFirstNonEmpty(data?.companyCity, data?.City),
    companyState: pickFirstNonEmpty(data?.companyState, data?.State),
    ZipPostalCode: pickFirstNonEmpty(data?.ZipPostalCode, data?.Zip),
    companyCountry: pickFirstNonEmpty(data?.companyCountry, data?.Country),
    companyPhone: data?.companyPhone ?? '',
    companyWebsite: data?.companyWebsite ?? '',
    numberOfPlants: data?.numberOfPlants,
    whichCategory: data?.whichCategory,
    primaryContact: toContact(primaryRaw),
    billingContact: toContact(billingRaw),
  }
}

function toPlantDrawerData(data?: PlantFromApplication, companyWebsite?: string) {
  const pickFirstNonEmpty = (...values: Array<string | undefined>) =>
    values.find((value) => (value ?? '').trim() !== '') ?? ''

  const firstContact = (
    ...groups: Array<SubmittedApplicationContact[] | undefined>
  ) => groups.flatMap((group) => group ?? []).find(hasSubmittedContactValue)

  const toContact = (contact?: SubmittedApplicationContact) => {
    if (!contact) return undefined
    const name = `${pickFirstNonEmpty(contact.contactFirst)} ${pickFirstNonEmpty(contact.contactLast)}`.trim()
    return {
      name,
      title: pickFirstNonEmpty(contact.jobTitle, contact.jobTitle1, contact.note),
      phone: pickFirstNonEmpty(contact.contactPhone),
      email: pickFirstNonEmpty(contact.contactEmail),
    }
  }

  const parseAddressFromSingleLine = (address?: string) => {
    const value = (address ?? '').trim()
    if (!value) {
      return {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      }
    }

    const normalized = value.replace(/\s+/g, ' ')
    const withCityMatch = normalized.match(
      /^(.*?),\s*([^,]+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:\s+([A-Za-z]{2,}))?$/
    )

    if (withCityMatch) {
      return {
        street: withCityMatch[1] ?? '',
        city: withCityMatch[2] ?? '',
        state: withCityMatch[3] ?? '',
        zip: withCityMatch[4] ?? '',
        country: withCityMatch[5] ?? '',
      }
    }

    return {
      street: normalized,
      city: '',
      state: '',
      zip: '',
      country: '',
    }
  }

  const parsedAddress = parseAddressFromSingleLine(data?.Address)
  const contactGroups = data?.plantContacts
  const primaryRaw = firstContact(contactGroups?.PrimaryContact, contactGroups?.primaryContact)
  const secondaryRaw = firstContact(contactGroups?.OtherContact, contactGroups?.otherContact)

  return {
    plantName: data?.plantName ?? '',
    plantAddress: pickFirstNonEmpty(data?.plantAddress, data?.Street1, parsedAddress.street),
    plantCity: pickFirstNonEmpty(data?.plantCity, data?.City, parsedAddress.city),
    plantState: pickFirstNonEmpty(data?.plantState, data?.State, parsedAddress.state),
    plantZip: pickFirstNonEmpty(data?.plantZip, data?.Zip, parsedAddress.zip),
    plantCountry: pickFirstNonEmpty(data?.plantCountry, data?.Country, parsedAddress.country),
    companyWebsite: companyWebsite ?? '',
    plantNumber: data?.plantNumber,
    processDescription: data?.brieflySummarize ?? '',
    primaryContact: toContact(primaryRaw),
    marketingContact: toContact(secondaryRaw),
  }
}

function hasSubmittedContactValue(contact: SubmittedApplicationContact) {
  return [
    contact.contactFirst,
    contact.contactLast,
    contact.contactPhone,
    contact.contactEmail,
    contact.jobTitle,
    contact.jobTitle1,
    contact.note,
  ].some((value) => (value ?? '').trim() !== '')
}
