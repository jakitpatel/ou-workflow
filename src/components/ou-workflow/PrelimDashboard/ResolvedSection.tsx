import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Building2, Factory } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { Applicant } from '@/types/application'
import { useTaskActions } from '@/components/ou-workflow/hooks/useTaskActions'
import { useUser } from '@/context/UserContext'
import { ResolutionDrawer } from '@/components/ou-workflow/PrelimDashboard/ResolutionDrawer'
import { Route as DashboardRoute } from '@/routes/ou-workflow/ncrc-dashboard'
import type {
  CompanyFromApplication,
  CompanyFromApplicationContact,
  PlantFromApplication,
  PlantFromApplicationContact,
} from '@/types/application'

type Props = {
  application?: Applicant
  loading?: boolean
  defaultVisible?: boolean
}

type DrawerState = {
  isOpen: boolean
  type: 'company' | 'plant'
  plantIndex?: number
}

const isResolvePlantTask = (taskName?: string) => /^ResolvePlant\d*$/.test(taskName ?? '')
const isTaskPending = (status?: string) => (status ?? '').trim().toLowerCase() === 'pending'

export function ResolvedSection({ application, loading, defaultVisible = true }: Props) {
  const [open, setOpen] = useState(true)
  const [isProgressVisible, setIsProgressVisible] = useState(defaultVisible)
  const navigate = useNavigate()
  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    type: 'company',
  })

  const { token, username } = useUser()
  const resolved = extractResolvedData(application)

  useEffect(() => {
    setIsProgressVisible(defaultVisible)
  }, [defaultVisible, application?.applicationId])

  if (!loading && !resolved) return null

  const companyTask = application?.stages?.Preliminary?.tasks?.find(
    (task) => task.name === 'ResolveCompany'
  )
  const plantTasks =
    application?.stages?.Preliminary?.tasks?.filter(
      (task) => isResolvePlantTask(task.name)
    ) || []

  const { executeAction } = useTaskActions({
    applications: application ? [application] : [],
    token: token ?? undefined,
    username: username ?? undefined,
    onError: (msg) => console.error(msg),
  })

  const handleAssignCompany = (match: any) => {
    if (!companyTask || !username) return

    const result = String(match.Id)
    executeAction(username, companyTask, result, null)
  }

  const handleAssignPlant = (match: any, plantTask: any) => {
    if (!plantTask || !username) return

    const result = String(match.Id)
    executeAction(username, plantTask, result, null)
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
  const activePlantIndex = drawerState.plantIndex
  const activePlantTask =
    activePlantIndex !== undefined ? plantTasks[activePlantIndex] : undefined
  const plantDrawerData = toPlantDrawerData(activePlantTask?.plantFromApplication)

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
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setIsProgressVisible((prev) => !prev)}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          {isProgressVisible ? 'Hide Progress' : 'Show Progress'}
        </button>
      </div>

      {!isProgressVisible ? null : (
        <>
      {/* Company Section */}
      {loading ? (
        <CompanySkeleton />
      ) : (
        resolved?.company && (
          <div className="mb-4">
            <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 transition-colors hover:bg-yellow-100 hover:border-yellow-300">
              {/* First Row */}
              <div className="flex items-center gap-3">
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

              {/* Second Row - Resolve Co. Button */}
              <div className="flex justify-end mt-2 ml-14">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    openCompanyDrawer()
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-yellow-300 bg-white px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50 transition-colors shadow-sm"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Resolve Co. ({companyTask?.companyMatchList?.length || 0})
                </button>
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
                            <div>
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
        <ResolutionDrawer
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
          type="company"
          data={companyDrawerData}
          matches={companyTask.companyMatchList || []}
          onAssign={handleAssignCompany}
          selectedId={resolved?.company?.Id}
          isActionable={isTaskPending(companyTask.status)}
        />
      )}

      {drawerState.isOpen &&
        drawerState.type === 'plant' &&
        activePlantTask && (
          <ResolutionDrawer
            isOpen={drawerState.isOpen}
            onClose={closeDrawer}
            type="plant"
            data={plantDrawerData}
            matches={activePlantTask.plantMatchList || []}
            onAssign={(match) =>
              handleAssignPlant(match, activePlantTask)
            }
            selectedId={
              activePlantIndex !== undefined
                ? resolved?.plants?.[activePlantIndex]?.plant?.plantID
                : undefined
            }
            isActionable={isTaskPending(activePlantTask.status)}
          />
        )}
        </>
      )}
    </div>
  )
}

/* ---------------- Helper Function ---------------- */
function extractResolvedData(application?: Applicant) {
  if (!application?.stages?.Preliminary?.tasks) return null

  const tasks = application.stages.Preliminary.tasks

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
        plantID: task.plantSelected?.PlantID || task.plantFromApplication?.plantID || '',
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
  const contacts = (data?.companyContacts ?? []) as CompanyFromApplicationContact[]
  const primaryRaw =
    contacts.find((c) => c.IsPrimaryContact === true) ??
    contacts.find((c) => c.PrimaryCT === 'Y') ??
    contacts[0]
  const billingRaw =
    contacts.find((c) => (c.billingContact ?? '').trim() !== '') ??
    contacts.find((c) => (c.billingContactEmail ?? '').trim() !== '') ??
    contacts.find((c) => (c.billingContactPhone ?? '').trim() !== '')

  const pickFirstNonEmpty = (...values: Array<string | undefined>) =>
    values.find((value) => (value ?? '').trim() !== '') ?? ''

  const toPrimaryContact = (contact?: CompanyFromApplicationContact) => {
    if (!contact) return undefined
    const name = `${pickFirstNonEmpty(contact.contactFirst, contact.contactFirst1, contact.FirstName)} ${pickFirstNonEmpty(contact.contactLast, contact.contactLast1, contact.LastName)}`.trim()
    return {
      name,
      title: pickFirstNonEmpty(contact.jobTitle1, contact.companytitle, contact.Title),
      phone: pickFirstNonEmpty(
        contact.contactPhone,
        contact.contactPhone1,
        contact.Cell,
        contact.Voice
      ),
      email: pickFirstNonEmpty(contact.contactEmail, contact.contactEmail1, contact.EMail),
    }
  }

  const toBillingContact = (contact?: CompanyFromApplicationContact) => {
    if (!contact) return undefined
    const name = `${pickFirstNonEmpty(contact.billingContactFirst)} ${pickFirstNonEmpty(contact.billingContactLast)}`.trim()
    return {
      name,
      title: pickFirstNonEmpty(contact.billingContact),
      phone: pickFirstNonEmpty(contact.billingContactPhone),
      email: pickFirstNonEmpty(contact.billingContactEmail),
    }
  }

  return {
    companyName: data?.companyName ?? '',
    companyAddress: data?.companyAddress ?? '',
    companyAddress2: data?.companyAddress2 ?? '',
    companyCity: data?.companyCity ?? '',
    companyState: data?.companyState ?? '',
    ZipPostalCode: data?.ZipPostalCode ?? '',
    companyCountry: data?.companyCountry ?? '',
    companyPhone: data?.companyPhone ?? '',
    companyWebsite: data?.companyWebsite ?? '',
    numberOfPlants: data?.numberOfPlants,
    whichCategory: data?.whichCategory,
    primaryContact: toPrimaryContact(primaryRaw),
    billingContact: toBillingContact(billingRaw),
  }
}

function toPlantDrawerData(data?: PlantFromApplication) {
  type NewPlantContact = {
    IsPrimaryContact?: boolean
    contactFirst?: string
    contactLast?: string
    contactPhone?: string
    contactEmail?: string
    jobTitle?: string
  }

  const contacts = (data?.plantContacts ?? []) as Array<
    PlantFromApplicationContact & NewPlantContact
  >
  const primaryRaw =
    contacts.find((c) => c.IsPrimaryContact === true) ??
    contacts.find((c) => c.PrimaryCT === 'Y') ??
    contacts[0]
  const secondaryRaw =
    contacts.find((c) => c !== primaryRaw && c.IsPrimaryContact === false) ??
    contacts.find((c) => c !== primaryRaw && c.PrimaryCT === 'N') ??
    contacts.find((c) => c !== primaryRaw)

  const pickFirstNonEmpty = (...values: Array<string | undefined>) =>
    values.find((value) => (value ?? '').trim() !== '') ?? ''

  const toContact = (contact?: PlantFromApplicationContact & NewPlantContact) => {
    if (!contact) return undefined
    const name = `${pickFirstNonEmpty(contact.contactFirst, contact.FirstName)} ${pickFirstNonEmpty(contact.contactLast, contact.LastName)}`.trim()
    return {
      name,
      title: pickFirstNonEmpty(contact.jobTitle, contact.companytitle, contact.Title),
      phone: pickFirstNonEmpty(contact.contactPhone, contact.Cell, contact.Voice),
      email: pickFirstNonEmpty(contact.contactEmail, contact.EMail),
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

  return {
    plantName: data?.plantName ?? '',
    plantAddress: data?.plantAddress ?? parsedAddress.street,
    plantCity: data?.plantCity ?? parsedAddress.city,
    plantState: data?.plantState ?? parsedAddress.state,
    plantZip: data?.plantZip ?? parsedAddress.zip,
    plantCountry: data?.plantCountry ?? parsedAddress.country,
    plantNumber: data?.plantNumber,
    processDescription: data?.brieflySummarize ?? '',
    primaryContact: toContact(primaryRaw),
    marketingContact: toContact(secondaryRaw),
  }
}
