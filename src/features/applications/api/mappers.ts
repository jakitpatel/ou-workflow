import type {
  Applicant,
  ApplicantsResponse,
  ApplicationDetail,
  ApplicationDetailResponse,
  Stage,
} from '@/types/application'

export type BackendApplicant = Omit<Applicant, 'stages'> & {
  stages?: Record<string, Stage>
  companyName?: string
  plantName?: string
} & Partial<Applicant>

export type BackendApplicantsResponse = {
  data?: BackendApplicant[]
  meta?: Partial<ApplicantsResponse['meta']>
  status?: ApplicantsResponse['status']
}

export function mapApplicantsResponse(
  response: BackendApplicantsResponse,
): ApplicantsResponse {
  const normalizedData: Applicant[] = (response.data ?? []).map((applicant) => {
    const normalizedStages = Object.fromEntries(
      Object.entries(applicant.stages ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
    ) as Record<string, Stage>

    return {
      ...(applicant as Partial<Applicant>),
      id: applicant.id ?? applicant.applicationId ?? 0,
      applicationId: applicant.applicationId ?? applicant.id ?? 0,
      company: applicant.company ?? applicant.companyName ?? '',
      plant: applicant.plant ?? applicant.plantName ?? '',
      region: applicant.region ?? '',
      priority: applicant.priority ?? 'NORMAL',
      status: applicant.status ?? '',
      assignedRC: applicant.assignedRC ?? '',
      daysInProcess: applicant.daysInProcess ?? 0,
      overdue: applicant.overdue ?? false,
      daysOverdue: applicant.daysOverdue ?? 0,
      lastUpdate: applicant.lastUpdate ?? '',
      nextAction: applicant.nextAction ?? '',
      documents: applicant.documents ?? 0,
      notes: applicant.notes ?? 0,
      stages: normalizedStages,
    }
  })

  return {
    data: normalizedData,
    meta: {
      async_enabled: response.meta?.async_enabled ?? false,
      count: response.meta?.count ?? normalizedData.length,
      limit: response.meta?.limit ?? normalizedData.length,
      offset: response.meta?.offset ?? 0,
      processing_time: response.meta?.processing_time ?? 0,
      total_count: response.meta?.total_count ?? normalizedData.length,
    },
    status: response.status ?? 'ok',
  }
}

export type BackendApplicationDetailResponse = Partial<ApplicationDetailResponse> & {
  applicationInfo?: ApplicationDetail
  appplicationinfo?: ApplicationDetail
}

export function mapApplicationDetailResponse(
  response: BackendApplicationDetailResponse,
): ApplicationDetail {
  return response.appplicationinfo ?? response.applicationInfo ?? ({} as ApplicationDetail)
}
